import { describe, expect, it } from "vitest";
import { buildInvoicePayload } from "./moyasarPaid";

describe("Moyasar paid export invoice payload", () => {
  it("uses halalas, Saudi riyal, server callback, and export metadata", () => {
    const payload = buildInvoicePayload({
      amountHalalas: 14_000,
      description: "App Builder AAB export · Academy",
      origin: "https://appbuilder-ewgsiuw6.manus.space",
      exportJobId: 42,
      projectId: 9,
    });
    expect(payload.amount).toBe(14_000);
    expect(payload.currency).toBe("SAR");
    expect(payload.callback_url).toBe("https://appbuilder-ewgsiuw6.manus.space/api/payments/moyasar/invoice-callback");
    expect(payload.success_url).toContain("export=42");
    expect(payload.metadata).toMatchObject({ export_job_id: "42", project_id: "9", kind: "paid_export" });
  });
});
