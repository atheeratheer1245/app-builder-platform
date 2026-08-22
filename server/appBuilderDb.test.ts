import { readFileSync } from "node:fs";
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

  it("synchronizes newly introduced catalog templates instead of stopping when legacy templates exist", () => {
    const source = readFileSync(new URL("./appBuilderDb.ts", import.meta.url), "utf8");

    expect(source).toContain("const currentSlugs = new Set(current.map(template => template.slug))");
    expect(source).toContain("const missingTemplates = templateCatalog.filter(template => !currentSlugs.has(template.slug))");
    expect(source).toContain("if (missingTemplates.length)");
  });
});
