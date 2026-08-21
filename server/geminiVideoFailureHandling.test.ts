import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { VideoGenerationError } from "./geminiVideo";

describe("Veo image-to-video failure handling", () => {
  it("uses stable, non-sensitive reason codes for generator failures", () => {
    expect(new VideoGenerationError("quota").message).toBe("VIDEO_GENERATION_QUOTA");
    expect(new VideoGenerationError("safety").message).toBe("VIDEO_GENERATION_SAFETY");
    expect(new VideoGenerationError("input").message).toBe("VIDEO_GENERATION_INPUT");
  });

  it("keeps the application router free of external image-to-video generation after the local studio is enabled", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers/appBuilder.ts"), "utf8");
    const editorSource = readFileSync(resolve(process.cwd(), "client/src/pages/BuilderPages.tsx"), "utf8");
    expect(source).not.toContain("generatePhotoGptVideoFromImage");
    expect(source).not.toContain("generateVideoFromImage:");
    expect(editorSource).toContain("<LocalMotionStudio");
    expect(editorSource).not.toContain("generateVideoFromImage.useMutation");
  });

  it("downloads the generated Veo file through the Gemini SDK and removes temporary storage", () => {
    const source = readFileSync(resolve(process.cwd(), "server/geminiVideo.ts"), "utf8");
    expect(source).toContain("source: {");
    expect(source).toContain("prompt: input.prompt");
    expect(source).toContain("await ai.files.download({ file: generatedVideo, downloadPath })");
    expect(source).toContain("await rm(downloadDirectory, { recursive: true, force: true })");
    expect(source).not.toContain('fetch(videoUri');
    expect(source).not.toContain("generateAudio:");
  });
});
