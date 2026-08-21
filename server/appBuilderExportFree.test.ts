import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => {
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));
  return {
    ensureTemplateCatalog: vi.fn(async () => []),
    getOwnedProject: vi.fn(),
    getProjectWorkspace: vi.fn(),
    getRequiredDb: vi.fn(async () => ({ insert })),
    queueCloudBuildForExportJob: vi.fn(async () => ({ status: "queued" })),
    refreshCloudExportsForOwner: vi.fn(async () => []),
    insert,
    values,
  };
});

vi.mock("./appBuilderDb", () => ({
  ensureTemplateCatalog: mocks.ensureTemplateCatalog,
  getOwnedProject: mocks.getOwnedProject,
  getProjectWorkspace: mocks.getProjectWorkspace,
  getRequiredDb: mocks.getRequiredDb,
}));

vi.mock("./exportBuildPipeline", () => ({
  queueCloudBuildForExportJob: mocks.queueCloudBuildForExportJob,
  refreshCloudExportsForOwner: mocks.refreshCloudExportsForOwner,
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

describe("free protected export queue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queues an owned project directly with zero price fields and no payment prerequisite", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "services", estimatedSizeBytes: 2_400_000 });
    mocks.values.mockResolvedValueOnce([{ insertId: 55 }]);
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.exports.create({ projectId: 42, format: "apk" })).resolves.toEqual({ exportJobId: 55, status: "queued" });

    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.queueCloudBuildForExportJob).toHaveBeenCalledWith(7, 55);
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 42,
      ownerId: 7,
      format: "apk",
      status: "queued",
      estimatedSizeBytes: 2_400_000,
      unitPriceHalalas: 0,
      totalPriceHalalas: 0,
    }));
  });

  it("rejects an export when the selected project is not owned by the caller", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce(undefined);
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.exports.create({ projectId: 99, format: "aab" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects a custom project category that has no supported export contract", async () => {
    mocks.getOwnedProject.mockResolvedValueOnce({ id: 42, ownerId: 7, category: "custom", estimatedSizeBytes: 0 });
    const caller = appBuilderRouter.createCaller(createOwnerContext());

    await expect(caller.exports.create({ projectId: 42, format: "ipa" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
