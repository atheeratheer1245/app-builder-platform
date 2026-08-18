import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Moyasar export payment surface", () => {
  it("exposes hosted checkout and removes the direct no-payment export procedure", () => {
    const appBuilderRouter = readFileSync(new URL("./routers/appBuilder.ts", import.meta.url), "utf8");
    const trpcRouter = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const serverEntry = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
    const exportPage = readFileSync(new URL("../client/src/pages/WorkspacePages.tsx", import.meta.url), "utf8");
    const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

    expect(appBuilderRouter).not.toMatch(/exports:\s*router\([\s\S]*?create:/);
    expect(trpcRouter).toContain("payments: paymentsRouter");
    expect(serverEntry).toContain('registerMoyasarCallback(app)');
    expect(exportPage).toContain("trpc.payments.createCheckout.useMutation");
    expect(exportPage).toContain("Moyasar");
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
