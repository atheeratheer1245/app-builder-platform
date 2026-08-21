import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("OpenAI Sora video generation adapter", () => {
  const source = readFileSync(resolve(process.cwd(), "server/openaiSoraVideo.ts"), "utf8");

  it("uses a server-only OpenAI key and the official Videos API", () => {
    expect(source).toContain("process.env.OPENAI_API_KEY");
    expect(source).toContain("https://api.openai.com/v1/videos");
    expect(source).toContain("Authorization: `Bearer ${token}`");
  });

  it("submits an image reference, polls the video job, and stores the MP4 bytes", () => {
    expect(source).toContain('input_reference: { image_url: imageUrl }');
    expect(source).toContain('model: "sora-2"');
    expect(source).toContain('seconds: "4"');
    expect(source).toContain("/v1/videos/${video.id}");
    expect(source).toContain("/v1/videos/${video.id}/content");
    expect(source).toContain('video.status !== "completed"');
  });

  it("classifies quota, access, safety, and invalid-input failures without leaking the API key", () => {
    expect(source).toContain('return "quota"');
    expect(source).toContain('return "access"');
    expect(source).toContain('return "safety"');
    expect(source).toContain('return "input"');
    expect(source).not.toContain("console.log(token");
  });
});
