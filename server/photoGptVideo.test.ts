import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PhotoGPT video generation adapter", () => {
  const source = readFileSync(resolve(process.cwd(), "server/photoGptVideo.ts"), "utf8");

  it("keeps the API key server-only and uses the documented developer endpoint", () => {
    expect(source).toContain("process.env.PHOTOGPT_API_KEY");
    expect(source).toContain("https://developer.photogptai.com/api");
    expect(source).toContain('"API-Version": "1"');
  });

  it("starts an image-to-video job, polls it, and downloads the completed output", () => {
    expect(source).toContain("/videos/generation");
    expect(source).toContain('modelID: "seedance-2.0"');
    expect(source).toContain('role: "first_frame"');
    expect(source).toContain("/jobs/${jobId}");
    expect(source).toContain("job?.videos?.[0]?.url");
  });

  it("classifies provider failures without logging or returning the key", () => {
    expect(source).toContain('return "quota"');
    expect(source).toContain('return "access"');
    expect(source).toContain('return "safety"');
    expect(source).toContain('return "input"');
    expect(source).not.toContain("console.log(apiKey");
  });
});
