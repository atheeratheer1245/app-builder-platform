import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const activity = readFileSync(resolve(process.cwd(), "android-companion/app/src/main/java/sa/appbuilder/companion/MainActivity.kt"), "utf8");
const nativeAuth = readFileSync(resolve(process.cwd(), "server/mobileNativeAuth.ts"), "utf8");

describe("standalone Android App Builder", () => {
  it("uses native Android screens rather than a WebView and reserves an external intent for hosted payment only", () => {
    expect(activity).not.toContain("WebView");
    expect(activity).not.toContain("loadUrl(");
    expect(activity).toContain("ScrollView");
    expect(activity).toContain("CredentialManager");
    expect(activity).toContain("openMoyasarInvoice");
    expect(activity).toContain("Intent(Intent.ACTION_VIEW, Uri.parse(checkoutUrl))");
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

  it("provides a professional dashboard, native editor, export center, and bilingual direction switching", () => {
    expect(activity).toContain("showDashboard");
    expect(activity).toContain("showExports");
    expect(activity).toContain("محرر المشروع");
    expect(activity).toContain("toggleLanguage");
    expect(activity).toContain("View.LAYOUT_DIRECTION_LTR");
    expect(activity).toContain("View.LAYOUT_DIRECTION_RTL");
  });

  it("shows a server quote, refreshes each owned export status, and downloads only a ready artifact", () => {
    expect(activity).toContain("/api/mobile/exports/quote");
    expect(activity).toContain("/api/mobile/exports/paid-invoice");
    expect(activity).toContain("/api/mobile/exports/verify");
    expect(activity).toContain("/api/mobile/exports/$exportJobId/download");
    expect(activity).toContain("refreshExportStatus");
    expect(activity).toContain("getJson");
    expect(activity).toContain("DownloadManager");
    expect(activity).toContain("artifactUrl.isNotBlank()");
  });
});
