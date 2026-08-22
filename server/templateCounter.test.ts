import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePages.tsx", import.meta.url), "utf8");

describe("dashboard template counter", () => {
  it("uses the live template count with an eight-template fallback", () => {
    expect(workspaceSource).toContain("{templatesQuery.data?.length ?? 8}");
    expect(workspaceSource).not.toContain("<strong>7</strong><p>{copy(\"قوالب جاهزة\"");
  });
});
