import { describe, expect, it } from "vitest";

describe("Gemini Video credentials", () => {
  it("authenticates against the Gemini models endpoint", async () => {
    const key = process.env.GEMINI_API_KEY;
    expect(key, "GEMINI_API_KEY must be configured for image-to-video generation").toBeTruthy();

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": key! },
    });

    expect(response.ok, `Gemini API credential check failed with ${response.status}`).toBe(true);
    const payload = await response.json() as { models?: unknown[] };
    expect(Array.isArray(payload.models)).toBe(true);
  }, 15_000);
});
