import { describe, expect, it } from "vitest";

const secret = process.env.MOYASAR_SECRET_KEY;
const publishable = process.env.MOYASAR_PUBLISHABLE_KEY;

describe.skipIf(!secret)("Moyasar server credentials", () => {
  it("has a publishable key suitable for the native Android SDK", () => {
    expect(publishable).toMatch(/^pk_(test|live)_[A-Za-z0-9_-]+$/);
  });

  it("uses a live publishable key before enabling production checkout", () => {
    expect(publishable).toMatch(/^pk_live_[A-Za-z0-9_-]+$/);
  });

  it("uses a live server key before creating production invoices", () => {
    expect(secret).toMatch(/^sk_live_[A-Za-z0-9_-]+$/);
  });

  it("authenticates to a read-only invoice lookup without creating a charge", async () => {
    const authorization = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
    const response = await fetch("https://api.moyasar.com/v1/invoices/00000000-0000-4000-8000-000000000000", {
      headers: { Authorization: authorization },
    });
    expect(response.status).toBe(404);
  }, 20_000);
});
