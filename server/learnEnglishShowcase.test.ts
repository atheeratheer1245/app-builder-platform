import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const showcase = readFileSync(resolve(process.cwd(), "client/src/pages/LearnEnglishShowcasePage.tsx"), "utf8");
const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const templatesPage = readFileSync(resolve(process.cwd(), "client/src/pages/WorkspacePages.tsx"), "utf8");

describe("Learn English education showcase", () => {
  it("exposes a dedicated education showcase route without restoring legacy examples", () => {
    expect(app).toContain('/showcase/learn-english');
    expect(app).not.toContain('/examples/:slug');
  });

  it("demonstrates education-template components and interactive language skills", () => {
    ["BookOpenCheck", "Mic2", "SpellCheck2", "Volume2", "SpeechSynthesisUtterance", "PaymentPlatform", "A1", "C2", "Background", "ImageAnimation"].forEach(token => expect(showcase).toContain(token));
    expect(showcase).toContain("dictationAnswer");
    expect(showcase).not.toMatch(/guaranteed (?:result|fluency)|testimonial|customer review/iu);
  });

  it("links to the example from the template library", () => {
    expect(templatesPage).toContain('/showcase/learn-english');
    expect(templatesPage).toContain("تعلّم الإنجليزية: تطبيق تعليمي متكامل");
  });
});
