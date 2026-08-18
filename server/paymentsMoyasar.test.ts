import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => {
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));
  const where = vi.fn(async () => undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const limit = vi.fn();
  const selectWhere = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from }));
  return {
    getOwnedProject: vi.fn(),
    getRequiredDb: vi.fn(async () => ({ insert, update, select })),
    createMoyasarInvoice: vi.fn(),
    getMoyasarInvoice: vi.fn(),
    mapMoyasarInvoiceStatus: vi.fn(),
    getPublicBaseUrl: vi.fn(() => "https://appbuilder.example"),
    insert,
    values,
    set,
    where,
    limit,
  };
});

vi.mock("./appBuilderDb", () => ({ getOwnedProject: mocks.getOwnedProject, getRequiredDb: mocks.getRequiredDb }));
vi.mock("./moyasar", () => ({ createMoyasarInvoice: mocks.createMoyasarInvoice, getMoyasarInvoice: mocks.getMoyasarInvoice, mapMoyasarInvoiceStatus: mocks.mapMoyasarInvoiceStatus }));
vi.mock("./publicUrl", () => ({ getPublicBaseUrl: mocks.getPublicBaseUrl }));

import { paymentsRouter } from "./routers/payments";

function createOwnerContext(): TrpcContext {
  return {
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: { id: 7, openId: "local_owner", name: "Project Owner", email: "owner@example.com", mobile: null, loginMethod: "email", passwordHash: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  };
}

describe("Moyasar hosted export checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.values.mockResolvedValueOnce([{ insertId: 81 }]).mockResolvedValueOnce([{ insertId: 82 }]);
  });

  it("creates a pending export and returns only Moyasar's hosted checkout URL", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 21, ownerId: 7, name: "Store", category: "ecommerce", estimatedSizeBytes: 0 });
    mocks.createMoyasarInvoice.mockResolvedValueOnce({ id: "5b8d6752-4a47-4c9a-ae93-19c06b3af821", status: "initiated", amount: 5000, currency: "SAR", url: "https://pay.moyasar.com/invoices/secure-token" });
    const caller = paymentsRouter.createCaller(createOwnerContext());

    await expect(caller.createCheckout({ projectId: 21, format: "apk" })).resolves.toEqual({ paymentId: 82, checkoutUrl: "https://pay.moyasar.com/invoices/secure-token", amountHalalas: 5000, status: "pending" });
    expect(mocks.values).toHaveBeenNthCalledWith(1, expect.objectContaining({ projectId: 21, ownerId: 7, status: "pending_payment", totalPriceHalalas: 5000 }));
    expect(mocks.values).toHaveBeenNthCalledWith(2, expect.objectContaining({ exportJobId: 81, provider: "moyasar", amountHalalas: 5000, status: "created" }));
    expect(mocks.createMoyasarInvoice).toHaveBeenCalledWith(expect.objectContaining({ amountHalalas: 5000, callbackUrl: "https://appbuilder.example/api/payments/moyasar/callback", successUrl: "https://appbuilder.example/exports?payment=82" }));
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ status: "pending", providerChargeId: "5b8d6752-4a47-4c9a-ae93-19c06b3af821" }));
  });

  it("queues the export only after a matching paid invoice is verified server-side", async () => {
    mocks.limit.mockResolvedValueOnce([{ id: 82, ownerId: 7, exportJobId: 81, provider: "moyasar", providerChargeId: "5b8d6752-4a47-4c9a-ae93-19c06b3af821", amountHalalas: 5000, currency: "SAR", metadata: {} }]);
    mocks.getMoyasarInvoice.mockResolvedValueOnce({ id: "5b8d6752-4a47-4c9a-ae93-19c06b3af821", status: "paid", amount: 5000, currency: "SAR" });
    mocks.mapMoyasarInvoiceStatus.mockReturnValueOnce("paid");
    const caller = paymentsRouter.createCaller(createOwnerContext());

    await expect(caller.refresh({ paymentId: 82 })).resolves.toEqual({ paymentId: 82, exportJobId: 81, status: "paid", invoiceStatus: "paid" });
    expect(mocks.getMoyasarInvoice).toHaveBeenCalledWith("5b8d6752-4a47-4c9a-ae93-19c06b3af821");
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ status: "paid", paidAt: expect.any(Date) }));
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ status: "queued" }));
  });
});
