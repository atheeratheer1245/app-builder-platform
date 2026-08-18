import type { Express, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { exportJobs, moyasarWebhookEvents, payments } from "../drizzle/schema";
import { getRequiredDb } from "./appBuilderDb";
import { getMoyasarInvoice, mapMoyasarInvoiceStatus } from "./moyasar";

function invoiceIdFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.id === "string") return record.id;
  const data = record.data;
  return data && typeof data === "object" && typeof (data as Record<string, unknown>).invoice_id === "string" ? (data as Record<string, unknown>).invoice_id as string : null;
}

async function updateFromVerifiedInvoice(invoiceId: string, payload: Record<string, unknown>) {
  const db = await getRequiredDb();
  const payment = (await db.select().from(payments).where(and(eq(payments.provider, "moyasar"), eq(payments.providerChargeId, invoiceId))).limit(1))[0];
  if (!payment?.exportJobId) return { found: false as const };

  const invoice = await getMoyasarInvoice(invoiceId);
  const status = invoice.amount === payment.amountHalalas && invoice.currency === payment.currency ? mapMoyasarInvoiceStatus(invoice.status) : "failed" as const;
  await db.insert(moyasarWebhookEvents).values({
    providerEventId: `invoice:${invoice.id}:${invoice.status}`,
    paymentId: payment.id,
    payload,
    processingStatus: "received",
  }).onDuplicateKeyUpdate({ set: { receivedAt: new Date() } });
  await db.update(payments).set({ status, ...(status === "paid" ? { paidAt: new Date() } : {}), updatedAt: new Date() }).where(eq(payments.id, payment.id));
  if (status === "paid") await db.update(exportJobs).set({ status: "queued", failureReason: null, updatedAt: new Date() }).where(eq(exportJobs.id, payment.exportJobId));
  await db.update(moyasarWebhookEvents).set({ processingStatus: "processed", processedAt: new Date() }).where(eq(moyasarWebhookEvents.providerEventId, `invoice:${invoice.id}:${invoice.status}`));
  return { found: true as const, status };
}

export function registerMoyasarCallback(app: Express) {
  app.post("/api/payments/moyasar/callback", async (req: Request, res: Response) => {
    const payload = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    const invoiceId = invoiceIdFromPayload(payload);
    if (!invoiceId) return res.status(400).json({ received: false });
    try {
      const result = await updateFromVerifiedInvoice(invoiceId, payload);
      return res.status(200).json({ received: true, ...result });
    } catch (error) {
      console.error("[Moyasar] callback verification failed", error instanceof Error ? error.message : error);
      return res.status(500).json({ received: false });
    }
  });
}
