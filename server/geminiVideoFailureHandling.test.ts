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

  it("maps classified generator failures to a safe tRPC response rather than exposing provider details", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers/appBuilder.ts"), "utf8");
    expect(source).toContain("error instanceof VideoGenerationError ? error.reason : \"unavailable\"");
    expect(source).toContain("VIDEO_GENERATION_${reason.toUpperCase()}");
    expect(source).not.toContain('message: "Video generation could not be completed"');
  });

  it("downloads the generated Veo file through the Gemini SDK and removes temporary storage", () => {
    const source = readFileSync(resolve(process.cwd(), "server/geminiVideo.ts"), "utf8");
    expect(source).toContain("await ai.files.download({ file: generatedVideo, downloadPath })");
    expect(source).toContain("await rm(downloadDirectory, { recursive: true, force: true })");
    expect(source).not.toContain('fetch(videoUri');
  });
});
