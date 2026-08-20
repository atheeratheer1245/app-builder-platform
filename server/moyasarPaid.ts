import type { Express, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { exportJobs, payments } from "../drizzle/schema";
import { getRequiredDb } from "./appBuilderDb";
import { getPublicBaseUrl } from "./publicUrl";

const MOYASAR_API = "https://api.moyasar.com/v1";

export type MoyasarInvoice = {
  id: string;
  status: "initiated" | "paid" | "failed" | "refunded" | "canceled" | "on_hold" | "expired" | "voided";
  amount: number;
  currency: string;
  url: string;
};

function getSecret() {
  const secret = process.env.MOYASAR_SECRET_KEY;
  if (!secret?.startsWith("sk_")) throw new Error("Moyasar server key is unavailable");
  return secret;
}

function authorizationHeader() {
  return `Basic ${Buffer.from(`${getSecret()}:`).toString("base64")}`;
}

async function moyasarFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${MOYASAR_API}${path}`, {
    ...init,
    headers: { Authorization: authorizationHeader(), Accept: "application/json", ...(init.headers ?? {}) },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Moyasar request failed (${response.status})`);
  return JSON.parse(body) as MoyasarInvoice;
}

export function buildInvoicePayload(input: {
  amountHalalas: number;
  description: string;
  origin: string;
  exportJobId: number;
  projectId: number;
}) {
  return {
    amount: input.amountHalalas,
    currency: "SAR",
    description: input.description,
    callback_url: `${input.origin}/api/payments/moyasar/invoice-callback`,
    success_url: `${input.origin}/payment-result?export=${input.exportJobId}`,
    back_url: `${input.origin}/workspace`,
    metadata: {
      export_job_id: String(input.exportJobId),
      project_id: String(input.projectId),
      kind: "paid_export",
    },
  };
}

export async function createMoyasarInvoice(input: {
  amountHalalas: number;
  description: string;
  origin: string;
  exportJobId: number;
  projectId: number;
}) {
  return moyasarFetch("/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildInvoicePayload(input)),
  });
}

export async function fetchMoyasarInvoice(invoiceId: string) {
  return moyasarFetch(`/invoices/${encodeURIComponent(invoiceId)}`);
}

export async function verifyPaidExportInvoice(input: { paymentId: number; ownerId?: number }) {
  const db = await getRequiredDb();
  const rows = await db.select().from(payments).where(
    input.ownerId === undefined
      ? and(eq(payments.id, input.paymentId), eq(payments.provider, "moyasar"))
      : and(eq(payments.id, input.paymentId), eq(payments.ownerId, input.ownerId), eq(payments.provider, "moyasar")),
  ).limit(1);
  const payment = rows[0];
  if (!payment?.providerChargeId) return { paid: false as const, reason: "payment_not_found" as const };
  const invoice = await fetchMoyasarInvoice(payment.providerChargeId);
  const amountMatches = invoice.amount === payment.amountHalalas;
  const currencyMatches = invoice.currency === payment.currency;
  const paid = invoice.status === "paid" && amountMatches && currencyMatches;
  if (!paid) return { paid: false as const, reason: "invoice_not_paid" as const, invoiceStatus: invoice.status };

  await db.update(payments).set({ status: "paid", paidAt: new Date(), updatedAt: new Date() }).where(eq(payments.id, payment.id));
  if (payment.exportJobId) {
    await db.update(exportJobs).set({ status: "queued", updatedAt: new Date() }).where(and(eq(exportJobs.id, payment.exportJobId), eq(exportJobs.ownerId, payment.ownerId)));
  }
  return { paid: true as const, exportJobId: payment.exportJobId, invoiceId: invoice.id };
}

export function registerMoyasarPaidRoutes(app: Express) {
  app.post("/api/payments/moyasar/invoice-callback", async (req: Request, res: Response) => {
    try {
      const invoiceId = typeof req.body?.id === "string" ? req.body.id : "";
      if (!invoiceId) return res.status(400).json({ error: "Missing invoice id" });
      const db = await getRequiredDb();
      const rows = await db.select().from(payments).where(and(eq(payments.provider, "moyasar"), eq(payments.providerChargeId, invoiceId))).limit(1);
      if (rows[0]) await verifyPaidExportInvoice({ paymentId: rows[0].id });
      return res.status(204).end();
    } catch {
      return res.status(204).end();
    }
  });
}

export function requestOrigin(req: Request) {
  return getPublicBaseUrl(req);
}
