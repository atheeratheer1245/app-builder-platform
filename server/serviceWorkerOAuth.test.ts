import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("service worker OAuth safety", () => {
  it("does not intercept Google OAuth or other API navigations", async () => {
    const source = await readFile(new URL("../client/public/sw.js", import.meta.url), "utf8");

    expect(source).toContain('requestUrl.pathname.startsWith("/api/")');
    expect(source).toContain("if (requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith(\"/api/\")) return;");
  });
});
