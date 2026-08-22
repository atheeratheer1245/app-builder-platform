import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isSupportedProjectAssetMimeType, normalizeProjectAssetMimeType, projectAssetKindForMimeType } from "../shared/projectAssetMime";

const editorSource = readFileSync(resolve(process.cwd(), "client/src/pages/BuilderPages.tsx"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers/appBuilder.ts"), "utf8");

describe("project audio asset MIME policy", () => {
  it("normalizes common audio files when a browser reports no MIME type or octet-stream", () => {
    expect(normalizeProjectAssetMimeType("episode.m4a", "")).toBe("audio/mp4");
    expect(normalizeProjectAssetMimeType("theme.mp3", "application/octet-stream")).toBe("audio/mpeg");
    expect(normalizeProjectAssetMimeType("voice.ogg", "binary/octet-stream")).toBe("audio/ogg");
    expect(normalizeProjectAssetMimeType("recording.wav", "audio/wav")).toBe("audio/wav");
    expect(isSupportedProjectAssetMimeType("audio/mp4")).toBe(true);
    expect(projectAssetKindForMimeType("audio/mpeg")).toBe("other");
  });

  it("rejects unknown binary files and preserves media selection support for every template editor", () => {
    expect(isSupportedProjectAssetMimeType(normalizeProjectAssetMimeType("archive.bin", "application/octet-stream"))).toBe(false);
    expect(editorSource).toContain("normalizeProjectAssetMimeType(file.name, file.type)");
    expect(editorSource).toContain("accept={projectAssetAccept}");
    expect(routerSource).toContain("const mimeType = normalizeProjectAssetMimeType(input.filename, input.mimeType)");
    expect(routerSource).toContain("mimeType.startsWith(\"audio/\")");
  });
});
