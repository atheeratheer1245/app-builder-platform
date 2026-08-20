import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("safe bilingual error boundary", () => {
  it("keeps technical stack traces out of the user-facing recovery screen", () => {
    const boundary = readFileSync(new URL("../client/src/components/ErrorBoundary.tsx", import.meta.url), "utf8");
    expect(boundary).toContain("حدث خطأ غير متوقع");
    expect(boundary).toContain("An unexpected error occurred");
    expect(boundary).not.toContain("this.state.error?.stack");
    expect(boundary).toContain("إعادة تحميل الصفحة");
    expect(boundary).toContain("Reload page");
  });
});
