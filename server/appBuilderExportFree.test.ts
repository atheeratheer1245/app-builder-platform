import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./routers/appBuilder.ts", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePages.tsx", import.meta.url), "utf8");

describe("paid-only protected export flow", () => {
  it("removes direct free queueing and creates a payment invoice before an export build", () => {
    expect(routerSource).toContain("createPaidInvoice: protectedProcedure");
    expect(routerSource).toContain("status: \"pending_payment\"");
    expect(routerSource).not.toMatch(/exports:\s*router\([\s\S]*?create:\s*protectedProcedure/);
    expect(workspaceSource).toContain("trpc.appBuilder.exports.createPaidInvoice.useMutation");
    expect(workspaceSource).not.toContain("trpc.appBuilder.exports.create.useMutation");
    expect(workspaceSource).not.toContain("تمت إضافة طلب التصدير المجاني");
  });
});
