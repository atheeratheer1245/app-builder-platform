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
});
