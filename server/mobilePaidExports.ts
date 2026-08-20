import { and, eq } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { exportJobs, payments, projects } from "../drizzle/schema";
import { templateCategories } from "../shared/appBuilderCatalog";
import { getPaidExportPrice } from "../shared/exportPricing";
import { getRequiredDb } from "./appBuilderDb";
import { getLocalAuthenticatedUser } from "./localAuth";
import { createMoyasarInvoice, requestOrigin, verifyPaidExportInvoice } from "./moyasarPaid";

const exportFormatSchema = z.enum(["apk", "aab", "ipa"]);

/** The native app sends an opaque local project ID; the server owns the export record. */
export const mobileExportRequestSchema = z.object({
  localProjectId: z.string().trim().min(8).max(128),
  name: z.string().trim().min(2).max(160),
  category: z.enum(templateCategories),
  format: exportFormatSchema,
  estimatedSizeBytes: z.number().int().min(0).max(2 * 1024 * 1024 * 1024).default(0),
});

type MobileExportRequest = z.infer<typeof mobileExportRequestSchema>;

export function buildMobileExportProjectAppId(localProjectId: string) {
  return `native-android:${localProjectId}`;
}

async function requireNativeUser(req: Request, res: Response) {
  const user = await getLocalAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "authentication_required" });
    return null;
  }
  return user;
}

async function getOrCreateNativeProject(userId: number, input: MobileExportRequest) {
  const db = await getRequiredDb();
  const appId = buildMobileExportProjectAppId(input.localProjectId);
  const existing = await db.select().from(projects).where(and(eq(projects.ownerId, userId), eq(projects.appId, appId))).limit(1);
  if (existing[0]) {
    await db.update(projects).set({
      name: input.name,
      category: input.category,
      estimatedSizeBytes: input.estimatedSizeBytes,
      updatedAt: new Date(),
    }).where(eq(projects.id, existing[0].id));
    return { id: existing[0].id, name: input.name, category: input.category };
  }

  const inserted = await db.insert(projects).values({
    ownerId: userId,
    appId,
    name: input.name,
    category: input.category,
    language: "both",
    estimatedSizeBytes: input.estimatedSizeBytes,
    settings: { source: "native-android", localProjectId: input.localProjectId },
  });
  const projectId = Number(inserted[0]?.insertId ?? 0);
  if (!projectId) throw new Error("Unable to prepare the native project for export");
  return { id: projectId, name: input.name, category: input.category };
}

function parseMobileExport(body: unknown, res: Response) {
  const parsed = mobileExportRequestSchema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_export_request" });
    return null;
  }
  return parsed.data;
}

async function createFreeExport(userId: number, input: MobileExportRequest) {
  const db = await getRequiredDb();
  const project = await getOrCreateNativeProject(userId, input);
  const created = await db.insert(exportJobs).values({
    projectId: project.id,
    ownerId: userId,
    format: input.format,
    status: "queued",
    estimatedSizeBytes: input.estimatedSizeBytes,
    sizeUnits: 1,
    unitPriceHalalas: 0,
    totalPriceHalalas: 0,
  });
  const exportJobId = Number(created[0]?.insertId ?? 0);
  if (!exportJobId) throw new Error("Unable to create free export request");
  return { exportJobId, status: "queued" as const };
}

async function createPaidExportInvoice(userId: number, input: MobileExportRequest, origin: string) {
  const db = await getRequiredDb();
  const project = await getOrCreateNativeProject(userId, input);
  const quote = getPaidExportPrice(input.category, input.estimatedSizeBytes);
  const created = await db.insert(exportJobs).values({
    projectId: project.id,
    ownerId: userId,
    format: input.format,
    status: "pending_payment",
    estimatedSizeBytes: input.estimatedSizeBytes,
    sizeUnits: quote.sizeUnits,
    unitPriceHalalas: quote.unitPriceHalalas,
    totalPriceHalalas: quote.totalPriceHalalas,
  });
  const exportJobId = Number(created[0]?.insertId ?? 0);
  if (!exportJobId) throw new Error("Unable to prepare paid export");

  try {
    const invoice = await createMoyasarInvoice({
      amountHalalas: quote.totalPriceHalalas,
      description: `App Builder ${input.format.toUpperCase()} export · ${project.name}`,
      origin,
      exportJobId,
      projectId: project.id,
    });
    const paymentResult = await db.insert(payments).values({
      ownerId: userId,
      exportJobId,
      provider: "moyasar",
      status: invoice.status === "paid" ? "paid" : "pending",
      amountHalalas: quote.totalPriceHalalas,
      currency: "SAR",
      providerChargeId: invoice.id,
      checkoutUrl: invoice.url,
      metadata: { kind: "paid_export", source: "native-android", invoiceStatus: invoice.status, format: input.format, category: input.category },
      ...(invoice.status === "paid" ? { paidAt: new Date() } : {}),
    });
    const paymentId = Number(paymentResult[0]?.insertId ?? 0);
    if (!paymentId) throw new Error("Unable to record paid export invoice");
    if (invoice.status === "paid") await verifyPaidExportInvoice({ paymentId, ownerId: userId });
    return { exportJobId, paymentId, checkoutUrl: invoice.url, quote };
  } catch (error) {
    await db.update(exportJobs).set({ status: "cancelled", failureReason: "Unable to create Moyasar invoice", updatedAt: new Date() }).where(eq(exportJobs.id, exportJobId));
    throw error;
  }
}

async function paymentStatus(userId: number, paymentId: number) {
  const db = await getRequiredDb();
  const payment = (await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.ownerId, userId), eq(payments.provider, "moyasar"))).limit(1))[0];
  if (!payment) return null;
  const verification = await verifyPaidExportInvoice({ paymentId, ownerId: userId });
  const job = payment.exportJobId
    ? (await db.select().from(exportJobs).where(and(eq(exportJobs.id, payment.exportJobId), eq(exportJobs.ownerId, userId))).limit(1))[0]
    : null;
  return {
    paymentId,
    exportJobId: payment.exportJobId,
    paid: verification.paid,
    reason: verification.paid ? null : verification.reason,
    invoiceStatus: verification.paid ? "paid" : verification.invoiceStatus ?? null,
    status: job?.status ?? "pending_payment",
    artifactUrl: job?.status === "ready" && job.artifactUrl ? job.artifactUrl : null,
  };
}

export function registerMobilePaidExportRoutes(app: Express) {
  app.post("/api/mobile/exports/quote", async (req, res) => {
    const user = await requireNativeUser(req, res);
    const input = parseMobileExport(req.body, res);
    if (!user || !input) return;
    const quote = getPaidExportPrice(input.category, input.estimatedSizeBytes);
    res.set("Cache-Control", "no-store");
    res.status(200).json({ ...quote, category: input.category, format: input.format, estimatedSizeBytes: input.estimatedSizeBytes });
  });

  app.post("/api/mobile/exports/free", async (req, res) => {
    const user = await requireNativeUser(req, res);
    const input = parseMobileExport(req.body, res);
    if (!user || !input) return;
    try {
      res.set("Cache-Control", "no-store");
      res.status(201).json(await createFreeExport(user.id, input));
    } catch {
      res.status(502).json({ error: "free_export_unavailable" });
    }
  });

  app.post("/api/mobile/exports/paid-invoice", async (req, res) => {
    const user = await requireNativeUser(req, res);
    const input = parseMobileExport(req.body, res);
    if (!user || !input) return;
    try {
      res.set("Cache-Control", "no-store");
      res.status(201).json(await createPaidExportInvoice(user.id, input, requestOrigin(req)));
    } catch {
      res.status(502).json({ error: "invoice_unavailable" });
    }
  });

  app.post("/api/mobile/exports/verify", async (req, res) => {
    const user = await requireNativeUser(req, res);
    const paymentId = typeof req.body?.paymentId === "number" && Number.isInteger(req.body.paymentId) && req.body.paymentId > 0 ? req.body.paymentId : 0;
    if (!user) return;
    if (!paymentId) return res.status(400).json({ error: "invalid_payment_id" });
    try {
      const status = await paymentStatus(user.id, paymentId);
      if (!status) return res.status(404).json({ error: "payment_not_found" });
      res.set("Cache-Control", "no-store");
      return res.status(200).json(status);
    } catch {
      return res.status(502).json({ error: "payment_verification_unavailable" });
    }
  });

  app.get("/api/mobile/exports/:exportJobId/download", async (req, res) => {
    const user = await requireNativeUser(req, res);
    const exportJobId = Number(req.params.exportJobId);
    if (!user) return;
    if (!Number.isInteger(exportJobId) || exportJobId < 1) return res.status(400).json({ error: "invalid_export_job_id" });
    const db = await getRequiredDb();
    const job = (await db.select().from(exportJobs).where(and(eq(exportJobs.id, exportJobId), eq(exportJobs.ownerId, user.id))).limit(1))[0];
    if (!job) return res.status(404).json({ error: "export_not_found" });
    res.set("Cache-Control", "no-store");
    return res.status(200).json({ available: job.status === "ready" && Boolean(job.artifactUrl), status: job.status, artifactUrl: job.status === "ready" ? job.artifactUrl : null });
  });
}
