import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { exportJobs, payments } from "../../drizzle/schema";
import { getExportPrice, type TemplateCategory } from "../../shared/appBuilderCatalog";
import { protectedProcedure, router } from "../_core/trpc";
import { getOwnedProject, getRequiredDb } from "../appBuilderDb";
import { createMoyasarInvoice, getMoyasarInvoice, mapMoyasarInvoiceStatus } from "../moyasar";
import { getPublicBaseUrl } from "../publicUrl";

const exportInput = z.object({ projectId: z.number().int().positive(), format: z.enum(["apk", "aab", "ipa"]) });

function missingProject(): never {
  throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
}

function unsupportedProject(): never {
  throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a supported template category before export" });
}

export const paymentsRouter = router({
  createCheckout: protectedProcedure.input(exportInput).mutation(async ({ ctx, input }) => {
    const project = await getOwnedProject(ctx.user.id, input.projectId);
    if (!project) missingProject();
    if (project.category === "custom") unsupportedProject();

    const price = getExportPrice(project.category as TemplateCategory, project.estimatedSizeBytes);
    const db = await getRequiredDb();
    const exportResult = await db.insert(exportJobs).values({
      projectId: project.id,
      ownerId: ctx.user.id,
      format: input.format,
      status: "pending_payment",
      estimatedSizeBytes: project.estimatedSizeBytes,
      sizeUnits: price.sizeUnits,
      unitPriceHalalas: price.unitPriceHalalas,
      totalPriceHalalas: price.totalPriceHalalas,
    });
    const exportJobId = Number(exportResult[0]?.insertId ?? 0);
    if (!exportJobId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create export request" });

    const paymentResult = await db.insert(payments).values({
      ownerId: ctx.user.id,
      exportJobId,
      provider: "moyasar",
      status: "created",
      amountHalalas: price.totalPriceHalalas,
      currency: "SAR",
      metadata: { projectId: project.id, format: input.format, source: "app-builder-export" },
    });
    const paymentId = Number(paymentResult[0]?.insertId ?? 0);
    if (!paymentId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create payment request" });

    try {
      const baseUrl = getPublicBaseUrl(ctx.req);
      const invoice = await createMoyasarInvoice({
        amountHalalas: price.totalPriceHalalas,
        description: `App Builder ${input.format.toUpperCase()} export — ${project.name}`.slice(0, 255),
        callbackUrl: `${baseUrl}/api/payments/moyasar/callback`,
        successUrl: `${baseUrl}/exports?payment=${paymentId}`,
        backUrl: `${baseUrl}/exports?payment=${paymentId}`,
      });
      await db.update(payments).set({ status: "pending", providerChargeId: invoice.id, checkoutUrl: invoice.url!, updatedAt: new Date() }).where(eq(payments.id, paymentId));
      return { paymentId, checkoutUrl: invoice.url!, amountHalalas: price.totalPriceHalalas, status: "pending" as const };
    } catch (error) {
      await db.update(payments).set({ status: "failed", metadata: { projectId: project.id, format: input.format, error: "invoice_creation_failed" }, updatedAt: new Date() }).where(eq(payments.id, paymentId));
      await db.update(exportJobs).set({ status: "failed", failureReason: "Unable to start secure payment", updatedAt: new Date() }).where(eq(exportJobs.id, exportJobId));
      throw new TRPCError({ code: "BAD_GATEWAY", message: error instanceof Error ? error.message : "Unable to create Moyasar invoice" });
    }
  }),
  refresh: protectedProcedure.input(z.object({ paymentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getRequiredDb();
    const rows = await db.select().from(payments).where(and(eq(payments.id, input.paymentId), eq(payments.ownerId, ctx.user.id), eq(payments.provider, "moyasar"))).limit(1);
    const payment = rows[0];
    if (!payment?.providerChargeId || !payment.exportJobId) throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });

    const invoice = await getMoyasarInvoice(payment.providerChargeId);
    if (invoice.amount !== payment.amountHalalas || invoice.currency !== payment.currency) {
      await db.update(payments).set({ status: "failed", metadata: { ...payment.metadata, error: "invoice_amount_or_currency_mismatch" }, updatedAt: new Date() }).where(eq(payments.id, payment.id));
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invoice verification failed" });
    }

    const status = mapMoyasarInvoiceStatus(invoice.status);
    await db.update(payments).set({ status, ...(status === "paid" ? { paidAt: new Date() } : {}), updatedAt: new Date() }).where(eq(payments.id, payment.id));
    if (status === "paid") await db.update(exportJobs).set({ status: "queued", failureReason: null, updatedAt: new Date() }).where(eq(exportJobs.id, payment.exportJobId));
    if (status === "failed" || status === "cancelled") await db.update(exportJobs).set({ status: "pending_payment", updatedAt: new Date() }).where(eq(exportJobs.id, payment.exportJobId));
    return { paymentId: payment.id, exportJobId: payment.exportJobId, status, invoiceStatus: invoice.status };
  }),
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getRequiredDb();
    return db.select().from(payments).where(and(eq(payments.ownerId, ctx.user.id), eq(payments.provider, "moyasar"))).orderBy(desc(payments.createdAt));
  }),
});
