import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("fully free export surface", () => {
  it("queues exports directly and exposes no active checkout, billing, or provider callback surface", () => {
    const appBuilderRouter = readFileSync(new URL("./routers/appBuilder.ts", import.meta.url), "utf8");
    const trpcRouter = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const serverEntry = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
    const exportPage = readFileSync(new URL("../client/src/pages/WorkspacePages.tsx", import.meta.url), "utf8");
    const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

    expect(appBuilderRouter).toMatch(/exports:\s*router\([\s\S]*?create:\s*protectedProcedure/);
    expect(trpcRouter).not.toContain("payments: paymentsRouter");
    expect(serverEntry).not.toContain("registerMoyasarCallback(app)");
    expect(exportPage).toContain("trpc.appBuilder.exports.create.useMutation");
    expect(exportPage).toContain("مجاني بالكامل");
    expect(exportPage).not.toContain("trpc.payments.createCheckout.useMutation");
    expect(exportPage).not.toContain("Moyasar");
    expect(exportPage).not.toContain("getExportPrice");
    expect(schema).toContain('"moyasar"');
    expect(schema).toContain('mysqlTable(\n  "moyasarWebhookEvents"');
  });
});

describe("editor accessibility regression", () => {
  it("uses labeled in-app dialogs for page and component editing rather than browser prompts", () => {
    const editor = readFileSync(new URL("../client/src/pages/BuilderPages.tsx", import.meta.url), "utf8");

    expect(editor).not.toMatch(/window\.prompt|\bprompt\s*\(/);
    expect(editor).toContain('DialogTitle>{copy("تعديل الصفحة", "Edit page")}');
    expect(editor).toContain('DialogTitle>{copy("تعديل المكون", "Edit component")}');
    expect(editor).toContain('Label>{copy("العنوان بالعربية", "Arabic title")}');
    expect(editor).toContain('Label>{copy("الاسم بالعربية", "Arabic label")}');
    expect(editor).toContain('copy("إلغاء", "Cancel")');
    expect(editor).toContain('copy("حفظ التغييرات", "Save changes")');
  });
});
