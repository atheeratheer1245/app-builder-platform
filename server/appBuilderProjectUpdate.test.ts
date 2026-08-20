import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => {
  const where = vi.fn(async () => undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const select = vi.fn((fields: Record<string, unknown>) => {
    const hasOnlyPageId = Object.keys(fields).length === 1 && "id" in fields;
    const rows = hasOnlyPageId ? [{ id: 9 }] : [];
    return { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => rows) })) })) };
  });
  const insertValues = vi.fn(async () => [{ insertId: 18 }]);
  const insert = vi.fn(() => ({ values: insertValues }));
  return {
    getOwnedProject: vi.fn(),
    getRequiredDb: vi.fn(async () => ({ update, select, insert })),
    ensureTemplateCatalog: vi.fn(async () => []),
    update,
    set,
    where,
    select,
    insert,
  };
});

vi.mock("./appBuilderDb", () => ({
  getOwnedProject: mocks.getOwnedProject,
  getRequiredDb: mocks.getRequiredDb,
  ensureTemplateCatalog: mocks.ensureTemplateCatalog,
  getProjectWorkspace: vi.fn(),
}));

import { appBuilderRouter } from "./routers/appBuilder";

function createOwnerContext(): TrpcContext {
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

describe("protected project update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows the matching owner to update a project", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7 });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.projects.update({ projectId: 42, data: { name: "Updated project" } })).resolves.toEqual({ success: true });
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ name: "Updated project" }));
    expect(mocks.where).toHaveBeenCalledOnce();
  });

  it("does not expose an update path when the project is not owned", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce(undefined);
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.projects.update({ projectId: 99, data: { name: "Blocked update" } })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects game-only blocks when a non-game project calls the editor API directly", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "ecommerce" });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.addComponent({ projectId: 42, pageId: 6, componentType: "GameScene", labelAr: "مشهد", labelEn: "Scene" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.getRequiredDb).not.toHaveBeenCalled();
  });

  it("allows optional component labels but rejects incomplete navigation items", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "ecommerce" });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.addComponent({ projectId: 42, pageId: 6, componentType: "List", labelAr: "", labelEn: "", properties: { items: [{ labelAr: "", labelEn: "", targetPageId: null }] } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.getRequiredDb).not.toHaveBeenCalled();
  });

  it("accepts an optional list title while retaining a required text and page for every nested button", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "ecommerce" });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.addComponent({ projectId: 42, pageId: 6, componentType: "List", labelAr: "", labelEn: "", properties: { titleAr: "الأقسام", titleEn: "Sections", items: [{ labelAr: "المنتجات", labelEn: "Products", targetPageId: 9 }] } })).resolves.toEqual(expect.objectContaining({ id: expect.any(Number) }));
  });

  it("rejects an audio attachment when it is not a matching asset owned by the project", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "podcasts" });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.addComponent({ projectId: 42, pageId: 6, componentType: "Audio", labelAr: "", labelEn: "", properties: { assetId: 99 } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a list destination page that does not belong to the current project", async () => {
    mocks.select.mockImplementationOnce(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => []) })) })) }));
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "ecommerce" });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.addComponent({ projectId: 42, pageId: 6, componentType: "List", labelAr: "", labelEn: "", properties: { items: [{ labelAr: "خارج المشروع", labelEn: "Outside project", targetPageId: 77 }] } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
