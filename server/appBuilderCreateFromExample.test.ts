import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => {
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));
  return { getRequiredDb: vi.fn(async () => ({ insert })), ensureTemplateCatalog: vi.fn(), getOwnedProject: vi.fn(), getProjectWorkspace: vi.fn(), insert, values };
});

vi.mock("./appBuilderDb", () => ({
  getRequiredDb: mocks.getRequiredDb,
  ensureTemplateCatalog: mocks.ensureTemplateCatalog,
  getOwnedProject: mocks.getOwnedProject,
  getProjectWorkspace: mocks.getProjectWorkspace,
}));

import { appBuilderRouter } from "./routers/appBuilder";

function ownerContext(): TrpcContext {
  return { req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"], user: { id: 23, openId: "local_example_owner", name: "Owner", email: "owner@example.com", mobile: null, loginMethod: "email", passwordHash: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } };
}

describe("create project from premium example", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.values
      .mockResolvedValueOnce([{ insertId: 501 }])
      .mockResolvedValueOnce([{ insertId: 601 }])
      .mockResolvedValueOnce([{ insertId: 602 }])
      .mockResolvedValueOnce([{ insertId: 603 }])
      .mockResolvedValueOnce([{ insertId: 604 }])
      .mockResolvedValueOnce([{ insertId: 605 }])
      .mockResolvedValue([{ insertId: 701 }]);
  });

  it("creates an owned editable project with the example screens and components", async () => {
    const result = await appBuilderRouter.createCaller(ownerContext()).projects.createFromExample({ slug: "nova-market" });
    expect(result).toEqual({ id: 501, nameAr: "متجر نوفا", nameEn: "Nova Market" });
    expect(mocks.values).toHaveBeenCalledTimes(14);
    expect(mocks.values).toHaveBeenNthCalledWith(1, expect.objectContaining({ ownerId: 23, category: "ecommerce", name: "متجر نوفا" }));
    expect(mocks.values).toHaveBeenNthCalledWith(2, expect.objectContaining({ projectId: 501, route: "/home", titleAr: "الرئيسية" }));
    expect(mocks.values).toHaveBeenNthCalledWith(7, expect.objectContaining({ projectId: 501, pageId: 601, componentType: "SearchBar" }));
    expect(mocks.values).toHaveBeenNthCalledWith(10, expect.objectContaining({ projectId: 501, pageId: 601, componentType: "Product", properties: expect.objectContaining({ salePrice: 149, stock: 12, currency: "SAR" }) }));
    expect(mocks.values).toHaveBeenNthCalledWith(9, expect.objectContaining({ projectId: 501, componentType: "List", properties: expect.objectContaining({ items: expect.arrayContaining([expect.objectContaining({ targetPageId: 602 })]) }) }));
  });

  it("rejects an unknown example without creating a project", async () => {
    await expect(appBuilderRouter.createCaller(ownerContext()).projects.createFromExample({ slug: "unknown-example" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
