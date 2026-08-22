import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspacePages = readFileSync(new URL("../client/src/pages/WorkspacePages.tsx", import.meta.url), "utf8");

describe("template library pricing table", () => {
  it("shows all template-category prices per 10 MB using the shared approved pricing catalog", () => {
    expect(workspacePages).toContain('template-price-panel');
    expect(workspacePages).toContain('أسعار القوالب لكل 10 ميغابايت');
    expect(workspacePages).toContain('Template prices per 10 MB');
    expect(workspacePages).toContain('templateCategories.map(category =>');
    expect(workspacePages).toContain('paidExportPricePerTenMbSar[category]');
    expect(workspacePages).toContain('file size rounds up to the next 10 MB unit');
  });
});
