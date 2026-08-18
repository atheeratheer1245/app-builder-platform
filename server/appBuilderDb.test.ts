import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const limit = vi.fn();
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { limit, where, from, select };
});

vi.mock("./db", () => ({ getDb: vi.fn(async () => ({ select: mocks.select })) }));

import { getOwnedProject } from "./appBuilderDb";

describe("project ownership lookup", () => {
  it("queries a project through an ownership-restricted lookup", async () => {
    mocks.limit.mockResolvedValueOnce([{ id: 42, ownerId: 7, name: "Owned project" }]);

    const project = await getOwnedProject(7, 42);

    expect(project).toMatchObject({ id: 42, ownerId: 7 });
    expect(mocks.select).toHaveBeenCalledOnce();
    expect(mocks.where).toHaveBeenCalledOnce();
    expect(mocks.limit).toHaveBeenCalledWith(1);
  });
});
