import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const activitySource = readFileSync(resolve(process.cwd(), "android-companion/app/src/main/java/sa/appbuilder/companion/MainActivity.kt"), "utf8");

describe("Android native Google interception", () => {
  it("intercepts Google navigation before embedded OAuth can render", () => {
    expect(activitySource).toContain("override fun shouldOverrideUrlLoading");
    expect(activitySource).toContain("override fun onPageStarted");
    expect(activitySource).toContain("view.stopLoading()");
    expect(activitySource).toContain("beginNativeGoogleSignIn(view)");
  });

  it("installs a page-level click bridge and exchanges the native ID token with the server", () => {
    expect(activitySource).toContain("installGoogleClickBridge");
    expect(activitySource).toContain("addJavascriptInterface");
    expect(activitySource).toContain("window.AppBuilderNativeGoogle?.start()");
    expect(activitySource).toContain("/api/auth/google/native");
  });
});
