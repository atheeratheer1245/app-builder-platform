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
    insertValues,
    invokeLLM: vi.fn(),
  };
});

vi.mock("./appBuilderDb", () => ({
  getOwnedProject: mocks.getOwnedProject,
  getRequiredDb: mocks.getRequiredDb,
  ensureTemplateCatalog: mocks.ensureTemplateCatalog,
  getProjectWorkspace: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

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

  it("creates a project with the selected export target while deriving its technical package identifier from the visible name", async () => {
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.projects.create({ name: "Sky Runner", category: "games", language: "both", exportFormat: "aab" })).resolves.toEqual({ id: 18 });

    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      name: "Sky Runner",
      packageName: "com.appbuilder.sky.runner",
      settings: expect.objectContaining({ exportFormat: "aab" }),
    }));
  });

  it("does not expose an update path when the project is not owned", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce(undefined);
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.projects.update({ projectId: 99, data: { name: "Blocked update" } })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("stores a cleared app-icon setting only for the matching project owner", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, settings: { exportFormat: "apk" } });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.updateAppIcon({ projectId: 42, assetId: null })).resolves.toEqual({ success: true, appIconAssetId: null, appIconUrl: "" });
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ settings: expect.objectContaining({ exportFormat: "apk", appIconAssetId: null, appIconUrl: "" }) }));
  });

  it("stores a validated solid page background for the matching project owner", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "books" });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.updatePage({ projectId: 42, pageId: 6, titleAr: "المكتبة", titleEn: "Library", route: "/library", configuration: { background: { type: "color", color: "#1e293b", assetId: null } } })).resolves.toEqual({ success: true });
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ configuration: { background: { type: "color", color: "#1e293b", assetId: null, assetUrl: "" } } }));
  });

  it("creates a bounded bilingual Gemini Flash suggestion only for the matching project owner", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "books" });
    mocks.invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ titleAr: "اختيارات نهاية الأسبوع", titleEn: "Weekend Picks", descriptionAr: "كتب مختارة لقراءتك الهادئة.", descriptionEn: "Curated books for relaxed reading.", route: "Weekend Picks" }) } }] });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.ai.suggest({ projectId: 42, kind: "card", brief: "كتب خفيفة لعطلة نهاية الأسبوع", language: "both" })).resolves.toEqual(expect.objectContaining({ titleAr: "اختيارات نهاية الأسبوع", titleEn: "Weekend Picks", route: "/weekend-picks" }));
    expect(mocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-3-flash-preview", maxTokens: 900 }));
  });

  it("does not call Gemini Flash for a project outside the signed-in owner scope", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce(undefined);
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.ai.suggest({ projectId: 99, kind: "page", brief: "صفحة جديدة للتطبيق", language: "ar" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("refines an owned animation prompt through Gemini Flash before Veo generation", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "games" });
    mocks.invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ motionPrompt: "تتحرك المركبة للأمام بثبات مع اهتزاز كاميرا خفيف." }) } }] });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.ai.improveMotionPrompt({ projectId: 42, assetId: 9, prompt: "تتحرك المركبة", language: "ar" })).resolves.toEqual({ motionPrompt: "تتحرك المركبة للأمام بثبات مع اهتزاز كاميرا خفيف." });
    expect(mocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-3-flash-preview", maxTokens: 400 }));
  });

  it("keeps the user's motion prompt when Gemini Flash returns incomplete structured content", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "games" });
    mocks.invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: '{"motionPrompt":"partial' } }] });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.ai.improveMotionPrompt({ projectId: 42, assetId: 9, prompt: "تحرك المركبة", language: "ar" })).resolves.toEqual({ motionPrompt: "تحرك المركبة" });
  });

  it("rejects game-only blocks when a non-game project calls the editor API directly", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "ecommerce" });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.addComponent({ projectId: 42, pageId: 6, componentType: "GameScene", labelAr: "مشهد", labelEn: "Scene" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.getRequiredDb).not.toHaveBeenCalled();
  });

  it("rejects an unsupported game mode even when the component belongs to a game project", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "games" });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.addComponent({ projectId: 42, pageId: 6, componentType: "GameScene", labelAr: "", labelEn: "", properties: { gameMode: "unsupported_mode" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects unsupported game-scene blueprint settings", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "games" }).mockResolvedValueOnce({ id: 42, ownerId: 7, category: "games" });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.addComponent({ projectId: 42, pageId: 6, componentType: "GameScene", labelAr: "", labelEn: "", properties: { progressionMode: "random" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.editor.addComponent({ projectId: 42, pageId: 6, componentType: "GameScene", labelAr: "", labelEn: "", properties: { showHud: "yes" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a background component with an unsupported media type", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "books" });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.addComponent({ projectId: 42, pageId: 6, componentType: "Background", labelAr: "", labelEn: "", properties: { mediaType: "document" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
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
