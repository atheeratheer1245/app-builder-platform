import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => {
  const where = vi.fn(async () => undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return {
    getOwnedProject: vi.fn(),
    getRequiredDb: vi.fn(async () => ({ update })),
    ensureTemplateCatalog: vi.fn(async () => []),
    update,
    set,
    where,
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

describe("protected component reordering", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates every component sort order for its project page", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 21, ownerId: 7 });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.reorderComponents({ projectId: 21, pageId: 5, componentIds: [11, 12] })).resolves.toEqual({ success: true });
    expect(mocks.update).toHaveBeenCalledTimes(2);
    expect(mocks.set).toHaveBeenNthCalledWith(1, expect.objectContaining({ sortOrder: 0 }));
    expect(mocks.set).toHaveBeenNthCalledWith(2, expect.objectContaining({ sortOrder: 1 }));
    expect(mocks.where).toHaveBeenCalledTimes(2);
  });

  it("blocks reordering when the project is not owned", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce(undefined);
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.editor.reorderComponents({ projectId: 90, pageId: 5, componentIds: [11] })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
