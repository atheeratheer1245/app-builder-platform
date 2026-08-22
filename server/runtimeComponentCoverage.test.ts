import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const runtimeSource = readFileSync(resolve(projectRoot, "client/src/pages/ProjectRuntimePage.tsx"), "utf8");
const editorSource = readFileSync(resolve(projectRoot, "client/src/pages/BuilderPages.tsx"), "utf8");

describe("configured component runtime coverage", () => {
  it("keeps editor configuration and runtime rendering paths for interactive standard components", () => {
    for (const componentType of ["Image", "Video", "Audio", "PDFDocument", "Button", "List", "Product", "Card", "Background", "SearchBar", "PaymentPlatform"] as const) {
      expect(editorSource).toContain(`type === "${componentType}"`);
      expect(runtimeSource).toContain(`component.componentType === "${componentType}"`);
    }
    expect(editorSource).toContain('String(type) === "ImageAnimation"');
    expect(runtimeSource).toContain('component.componentType === "ImageAnimation"');
  });

  it("keeps saved navigation and media selection connected to the runnable screen", () => {
    expect(editorSource).toContain("targetPageId");
    expect(editorSource).toContain("assetId");
    expect(runtimeSource).toContain("onNavigate(target)");
    expect(runtimeSource).toContain('text(props, "assetUrl")');
    expect(runtimeSource).toContain("hasComponentBackground");
  });

  it("keeps the generated local-motion video path connected from Image Animation to the runtime", () => {
    expect(editorSource).toContain("LocalMotionStudio");
    expect(editorSource).toContain("generatedVideoAssetId");
    expect(runtimeSource).toContain('text(props, "videoAssetUrl", text(props, "generatedVideoUrl"))');
    expect(runtimeSource).toContain('isArabic ? "فيديو حركة مولّد" : "Generated motion video"');
  });

  it("keeps generated game audio connected to both dedicated game runtimes through the player media path", () => {
    expect(runtimeSource).toContain('const playerAudioUrl = text(playerSettings, "audioAssetUrl")');
    expect(runtimeSource).toContain('if (playerVideoUrl || playerImageUrl || playerAudioUrl) board.appendChild(playerLayer)');
    expect(runtimeSource).toContain('playerAudioUrl ? <audio className="mb-3 w-full" controls preload="metadata" src={playerAudioUrl} /> : null');
  });
});
