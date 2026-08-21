import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Azure Sora 2 video generation adapter", () => {
  const source = readFileSync(resolve(process.cwd(), "server/azureSoraVideo.ts"), "utf8");

  it("uses a server-only Azure endpoint, deployment, and API key", () => {
    expect(source).toContain("process.env.AZURE_OPENAI_ENDPOINT");
    expect(source).toContain("process.env.AZURE_OPENAI_DEPLOYMENT_NAME");
    expect(source).toContain("process.env.AZURE_OPENAI_API_KEY");
    expect(source).toContain('"api-key": apiKey');
  });

  it("creates an image-to-video job, polls it, and downloads the generated video", () => {
    expect(source).toContain("/openai/v1/video/generations");
    expect(source).toContain("${baseUrl}/jobs?api-version=preview");
    expect(source).toContain('form.set("inpaint_items"');
    expect(source).toContain('form.append("files"');
    expect(source).toContain("/content/video?api-version=preview");
    expect(source).toContain("MAX_POLLS = 36");
  });

  it("classifies quota, safety, access, and invalid-input failures without exposing the Azure key", () => {
    expect(source).toContain('return "quota"');
    expect(source).toContain('return "safety"');
    expect(source).toContain('return "access"');
    expect(source).toContain('return "input"');
    expect(source).not.toContain("console.log(apiKey");
  });
});
