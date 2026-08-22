import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const mobileRoutes = readFileSync(new URL("./mobilePaidExports.ts", import.meta.url), "utf8");

describe("native paid-only exports", () => {
  it("keeps quote and paid-invoice routes while removing the direct free-export route", () => {
    expect(mobileRoutes).toContain('app.post("/api/mobile/exports/quote"');
    expect(mobileRoutes).toContain('app.post("/api/mobile/exports/paid-invoice"');
    expect(mobileRoutes).not.toContain('app.post("/api/mobile/exports/free"');
    expect(mobileRoutes).not.toContain("createFreeExport");
  });
});
