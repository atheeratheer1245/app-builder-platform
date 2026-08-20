import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const runtimeSource = readFileSync(resolve(projectRoot, "client/src/pages/ProjectRuntimePage.tsx"), "utf8");
const editorSource = readFileSync(resolve(projectRoot, "client/src/pages/BuilderPages.tsx"), "utf8");

describe("configured component runtime coverage", () => {
  it("keeps editor configuration and runtime rendering paths for interactive standard components", () => {
    for (const componentType of ["Image", "Video", "Audio", "PDFDocument", "Button", "List", "Product", "Card", "Background", "SearchBar"] as const) {
      expect(editorSource).toContain(`type === "${componentType}"`);
      expect(runtimeSource).toContain(`component.componentType === "${componentType}"`);
    }
  });

  it("keeps saved navigation and media selection connected to the runnable screen", () => {
    expect(editorSource).toContain("targetPageId");
    expect(editorSource).toContain("assetId");
    expect(runtimeSource).toContain("onNavigate(target)");
    expect(runtimeSource).toContain('text(props, "assetUrl")');
    expect(runtimeSource).toContain("hasComponentBackground");
  });
});
