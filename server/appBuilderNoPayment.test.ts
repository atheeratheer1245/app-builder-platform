import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => {
  const values = vi.fn(async () => [{ insertId: 88 }]);
  const insert = vi.fn(() => ({ values }));
  return {
    getOwnedProject: vi.fn(),
    getRequiredDb: vi.fn(async () => ({ insert })),
    ensureTemplateCatalog: vi.fn(async () => []),
    insert,
    values,
  };
});

vi.mock("./appBuilderDb", () => ({
  getOwnedProject: mocks.getOwnedProject,
  getRequiredDb: mocks.getRequiredDb,
  ensureTemplateCatalog: mocks.ensureTemplateCatalog,
  getProjectWorkspace: vi.fn(),
}));

import { appBuilderRouter } from "./routers/appBuilder";

function createAuthenticatedContext(): TrpcContext {
  return {
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: {
      id: 7,
      openId: "local_owner",
      name: "Project Owner",
      email: "owner@example.com",
      mobile: null,
      loginMethod: "email",
      passwordHash: null,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
  };
}

describe("no-payment export flow", () => {
  it("queues an export directly for its authenticated owner without a payment record", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 21, ownerId: 7, category: "services" });
    const caller = appBuilderRouter.createCaller(createAuthenticatedContext());

    await expect(caller.exports.create({ projectId: 21, format: "apk" })).resolves.toEqual({ id: 88, status: "queued" });
    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 21,
      ownerId: 7,
      format: "apk",
      status: "queued",
      estimatedSizeBytes: 0,
      unitPriceHalalas: 0,
      totalPriceHalalas: 0,
    }));
  });
});

describe("no public payment surface", () => {
  it("does not register payment routes or a billing route, while retaining the legacy tables", () => {
    const trpcRouter = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const serverEntry = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
    const clientRoutes = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

    expect(trpcRouter).not.toMatch(/\bpayments\s*:/);
    expect(serverEntry).not.toContain("/api/payments");
    expect(clientRoutes).not.toContain('path="/billing"');
    expect(schema).toContain('mysqlTable(\n  "payments"');
    expect(schema).toContain('mysqlTable(\n  "tapWebhookEvents"');
    expect(schema).toContain("read-only in this edition");
  });
});

describe("editor accessibility regression", () => {
  it("uses labeled in-app dialogs for page and component editing rather than browser prompts", () => {
    const editor = readFileSync(new URL("../client/src/pages/BuilderPages.tsx", import.meta.url), "utf8");

    expect(editor).not.toMatch(/window\.prompt|\bprompt\s*\(/);
    expect(editor).toContain('DialogTitle>{copy("تعديل الصفحة", "Edit page")}');
    expect(editor).toContain('DialogTitle>{copy("تعديل المكون", "Edit component")}');
    expect(editor).toContain('Label>{copy("العنوان بالعربية", "Arabic title")}');
    expect(editor).toContain('Label>{copy("الاسم بالعربية", "Arabic label")}');
    expect(editor).toContain('copy("إلغاء", "Cancel")');
    expect(editor).toContain('copy("حفظ التغييرات", "Save changes")');
  });
});
