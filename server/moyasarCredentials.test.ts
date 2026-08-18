import { describe, expect, it } from "vitest";

describe("Moyasar test credentials", () => {
  it("authenticates against the read-only payments list without creating a transaction", async () => {
    const secretKey = process.env.MOYASAR_SECRET_KEY;
    expect(secretKey).toMatch(/^sk_test_/);

    const response = await fetch("https://api.moyasar.com/v1/payments?limit=1", {
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      },
    });

    expect(response.status).toBe(200);
  }, 20_000);
});
