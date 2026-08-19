import { describe, expect, it } from "vitest";

describe("Google OAuth client credentials", () => {
  it("accepts the configured client authentication before any real authorization code is used", async () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    expect(clientId).toBe("271495009963-n86689drhqhmkqgkoc221ifs3e335a39.apps.googleusercontent.com");
    expect(clientSecret).toBeTruthy();

    const body = new URLSearchParams({
      code: "credential-validation-placeholder",
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: "https://appbuilder-ewgsiuw6.manus.space/api/auth/google/callback",
      grant_type: "authorization_code",
    });
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = await response.json() as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
  }, 20_000);
});
