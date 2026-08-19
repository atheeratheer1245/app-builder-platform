import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const activity = readFileSync(resolve(process.cwd(), "android-companion/app/src/main/java/sa/appbuilder/companion/MainActivity.kt"), "utf8");
const nativeAuth = readFileSync(resolve(process.cwd(), "server/mobileNativeAuth.ts"), "utf8");

describe("standalone Android App Builder", () => {
  it("uses native Android screens rather than a WebView or browser intent", () => {
    expect(activity).not.toContain("WebView");
    expect(activity).not.toContain("ACTION_VIEW");
    expect(activity).not.toContain("loadUrl(");
    expect(activity).toContain("ScrollView");
    expect(activity).toContain("CredentialManager");
  });

  it("includes templates, local projects, examples, email auth, and native Google sign-in", () => {
    expect(activity).toContain("private val templates");
    expect(activity).toContain("showProjects");
    expect(activity).toContain("showExamples");
    expect(activity).toContain("nativeEmailAuth");
    expect(activity).toContain("nativeGoogleSignIn");
    expect(nativeAuth).toContain("/api/mobile/auth/sign-in");
    expect(nativeAuth).toContain("/api/mobile/auth/sign-up");
  });
});
