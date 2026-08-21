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
    expect(page).not.toContain("?? project.category");
  });

  it("does not render a raw project status if an unexpected value reaches the workspace", () => {
    const page = readFileSync(new URL("../client/src/pages/WorkspacePages.tsx", import.meta.url), "utf8");
    expect(page).toContain('project.status === "draft" ? copy("مسودة", "Draft") : copy("قيد التحديث", "Updating")');
    expect(page).not.toContain(': project.status}</span>');
  });

  it("localizes component tags in the template library with a safe fallback", () => {
    const page = readFileSync(new URL("../client/src/pages/WorkspacePages.tsx", import.meta.url), "utf8");
    expect(page).toContain('unknownComponentLabel = { ar: "مكوّن", en: "Component" }');
    expect(page).toContain("localizedComponentLabel(component, isArabic)");
    expect(page).not.toContain("map(component => <span key={component}>{component}</span>)");
  });
});
