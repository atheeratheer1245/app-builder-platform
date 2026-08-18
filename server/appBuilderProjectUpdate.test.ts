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
});
