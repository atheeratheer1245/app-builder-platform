import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("paid-only export surface", () => {
  it("requires an invoice-backed export path and removes the free export surface", () => {
    const appBuilderRouter = readFileSync(new URL("./routers/appBuilder.ts", import.meta.url), "utf8");
    const trpcRouter = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const serverEntry = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
    const exportPage = readFileSync(new URL("../client/src/pages/WorkspacePages.tsx", import.meta.url), "utf8");
    const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

    expect(appBuilderRouter).toContain("createPaidInvoice: protectedProcedure");
    expect(appBuilderRouter).not.toMatch(/exports:\s*router\([\s\S]*?create:\s*protectedProcedure/);
    expect(exportPage).toContain("trpc.appBuilder.exports.createPaidInvoice.useMutation");
    expect(exportPage).toContain("كل القوالب تتطلب فاتورة مدفوعة");
    expect(exportPage).not.toContain("مجاني بالكامل");
    expect(exportPage).not.toContain("التصدير المجاني");
    expect(trpcRouter).not.toContain("payments: paymentsRouter");
    expect(serverEntry).not.toContain("registerMoyasarCallback(app)");
    expect(schema).toContain('"moyasar"');
    expect(schema).toContain('mysqlTable(\n  "moyasarWebhookEvents"');
  });
});

describe("editor accessibility regression", () => {
  it("uses labeled in-app dialogs for page and component editing rather than browser prompts", () => {
    const editor = readFileSync(new URL("../client/src/pages/BuilderPages.tsx", import.meta.url), "utf8");

    expect(editor).not.toMatch(/window\.prompt|\bprompt\s*\(/);
    expect(editor).toContain('DialogTitle>{copy("تعديل الصفحة", "Edit page")}');
    expect(editor).toContain('DialogTitle>{copy("إعداد المكون", "Configure component")}');
    expect(editor).toContain('Label>{copy("العنوان بالعربية", "Arabic title")}');
    expect(editor).toContain('Label>{copy("الاسم بالعربية (اختياري)", "Arabic label (optional)")}');
    expect(editor).toContain('ComponentPropertiesFields');
    expect(editor).toContain('copy("إلغاء", "Cancel")');
    expect(editor).toContain('copy("حفظ التغييرات", "Save changes")');
  });
});
