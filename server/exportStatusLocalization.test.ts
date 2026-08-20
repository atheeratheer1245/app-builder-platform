import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("localized export status labels", () => {
  it("uses a safe bilingual fallback instead of exposing unknown status values", () => {
    const page = readFileSync(new URL("../client/src/pages/WorkspacePages.tsx", import.meta.url), "utf8");
    expect(page).toContain('unknownExportStatusLabel = { ar: "قيد المعالجة", en: "Processing" }');
    expect(page).toContain("new Proxy");
    expect(page).not.toContain("?? job.status");
  });

  it("declares a bilingual fallback for any unexpected project category", () => {
    const page = readFileSync(new URL("../client/src/pages/WorkspacePages.tsx", import.meta.url), "utf8");
    expect(page).toContain('unknownCategoryLabel = { ar: "تطبيق مخصص", en: "Custom app" }');
    expect(page).toContain("labels[category as keyof typeof labels] ?? unknownCategoryLabel");
  });
});
