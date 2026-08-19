import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const activitySource = readFileSync(resolve(process.cwd(), "android-companion/app/src/main/java/sa/appbuilder/companion/MainActivity.kt"), "utf8");

describe("Android native Google sign-in", () => {
  it("uses Credential Manager without a WebView or browser redirect", () => {
    expect(activitySource).toContain("CredentialManager");
    expect(activitySource).toContain("GetSignInWithGoogleOption");
    expect(activitySource).not.toContain("WebView");
    expect(activitySource).not.toContain("ACTION_VIEW");
    expect(activitySource).not.toContain("loadUrl(");
  });

  it("exchanges the native Google ID token with the server and stores its local session", () => {
    expect(activitySource).toContain("/api/auth/google/native");
    expect(activitySource).toContain("putString(\"session\"");
    expect(activitySource).toContain("showDashboard()");
  });
});
