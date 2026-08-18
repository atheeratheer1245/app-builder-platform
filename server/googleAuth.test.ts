import { describe, expect, it } from "vitest";
import { buildGoogleAuthorizationUrl } from "./googleAuth";

describe("Google OAuth authorization URL", () => {
  it("builds an OpenID authorization request with state and a matching callback URI", () => {
    const url = new URL(buildGoogleAuthorizationUrl({ clientId: "test-client-id", redirectUri: "https://app.example.com/api/auth/google/callback", state: "csrf-state" }));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example.com/api/auth/google/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toContain("openid");
    expect(url.searchParams.get("state")).toBe("csrf-state");
  });
});
