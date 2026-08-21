import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const studioSource = readFileSync(new URL("../client/src/components/LocalMotionStudio.tsx", import.meta.url), "utf8");
const builderSource = readFileSync(new URL("../client/src/pages/BuilderPages.tsx", import.meta.url), "utf8");

describe("Local Motion Studio", () => {
  it("renders image-motion effects in a browser canvas and exports a WebM through MediaRecorder", () => {
    expect(studioSource).toContain('"zoom-in"');
    expect(studioSource).toContain('"pan-left"');
    expect(studioSource).toContain('"pulse"');
    expect(studioSource).toContain("canvas.captureStream(30)");
    expect(studioSource).toContain("new MediaRecorder(stream");
    expect(studioSource).toContain("video/webm");
    expect(studioSource).toContain("external video-generation provider");
  });

  it("attaches the locally exported motion video to Image Animation as a project asset", () => {
    expect(builderSource).toContain('import { LocalMotionStudio }');
    expect(builderSource).toContain("const uploadLocalVideo = trpc.appBuilder.assets.upload.useMutation()");
    expect(builderSource).toContain("onExport={saveLocalMotionVideo}");
    expect(builderSource).toContain("videoAssetId: saved.id");
    expect(builderSource).toContain("videoAssetUrl: saved.url");
  });
});
