import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const editorSource = readFileSync(new URL("../client/src/pages/BuilderPages.tsx", import.meta.url), "utf8");

describe("editor project deletion", () => {
  it("uses a confirmed destructive action and returns the owner to the projects list", () => {
    expect(editorSource).toContain("trpc.appBuilder.projects.remove.useMutation");
    expect(editorSource).toContain("<AlertDialog open={deleteProjectOpen}");
    expect(editorSource).toContain("حذف المشروع نهائيًا؟");
    expect(editorSource).toContain('setLocation("/projects")');
    expect(editorSource).toContain("removeProject.mutate(projectId)");
  });
});
