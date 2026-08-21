import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public brand surface", () => {
  it("keeps the public document headed by App Builder without hosted analytics injection", () => {
    const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");

    expect(html).toContain("App Builder | BUILD • DESIGN • DEPLOY");
    expect(html).not.toContain("VITE_ANALYTICS_ENDPOINT");
    expect(html).not.toContain("data-website-id");
    expect(html).not.toContain("Manus");
  });

  it("keeps public landing and example views free of hosted-platform names and domains", () => {
    const publicSources = [
      "../client/src/pages/Home.tsx",
      "../client/src/pages/PublicPages.tsx",
    ].map(path => readFileSync(new URL(path, import.meta.url), "utf8"));

    for (const source of publicSources) {
      const visibleSurface = source.replaceAll("/manus-storage/", "/asset-storage/");
      expect(visibleSurface).not.toMatch(/Manus|manus\.space|manus\.computer/i);
    }
  });
});
