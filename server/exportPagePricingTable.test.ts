import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const exportPage = readFileSync(new URL("../client/src/pages/WorkspacePages.tsx", import.meta.url), "utf8");

describe("paid export page pricing table", () => {
  it("lists every template price per 10 MB and keeps the invoice-only export action", () => {
    expect(exportPage).toContain('paidExportPricePerTenMbSar');
    expect(exportPage).toContain('أسعار القوالب لكل 10 ميغابايت');
    expect(exportPage).toContain('templateCategories.map(category =>');
    expect(exportPage).toContain('trpc.appBuilder.exports.createPaidInvoice.useMutation');
    expect(exportPage).not.toContain('trpc.appBuilder.exports.create.useMutation');
  });
});
