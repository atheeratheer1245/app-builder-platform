import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const showcase = readFileSync(resolve(process.cwd(), "client/src/pages/ReefPerfumesShowcasePage.tsx"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers/appBuilder.ts"), "utf8");
const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("Reef Perfumes ecommerce showcase", () => {
  it("exposes a dedicated showcase route without restoring the legacy examples route", () => {
    expect(app).toContain('/showcase/reef-perfumes');
    expect(app).not.toContain('/examples/:slug');
  });

  it("shows the ecommerce template capabilities and avoids fabricated customer proof", () => {
    ["Search", "ShoppingBag", "CreditCard", "PaymentPlatform", "Product", "SearchBar", "Order confirmed", "AI SCENT FINDER"].forEach(token => expect(showcase).toContain(token));
    expect(showcase).not.toMatch(/customer (?:rating|review)|testimonial/iu);
  });

  it("keeps the AI fragrance adviser server-side, authenticated, structured, and constrained to the showcase catalog", () => {
    expect(router).toContain("perfumeAdvisor: protectedProcedure");
    expect(router).toContain('model: "gpt-5-mini"');
    expect(router).toContain("Dujā Oud");
    expect(router).toContain("response_format");
    expect(router).toContain("Do not claim customer reviews");
  });
});
