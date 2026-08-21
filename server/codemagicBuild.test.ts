import { describe, expect, it } from "vitest";
import { codemagicExportLabel, createCodemagicBuildRequest, getCodemagicBuildConfig, isCodemagicBuildInProgress, normalizeCodemagicBuild, selectArtifactForFormat } from "./codemagicBuild";

describe("Codemagic build contract", () => {
  it("labels every build with its own export job and only sends server-side build variables", () => {
    const request = createCodemagicBuildRequest({ appId: "app-1", workflowId: "android_release_artifacts", branch: "main", token: "secret" }, { exportJobId: 42, environment: { APP_BUILDER_APPLICATION_ID: "sa.appbuilder.client.u2.p9" } });
    expect(codemagicExportLabel(42)).toBe("app-builder-export-42");
    expect(request).toMatchObject({ appId: "app-1", workflowId: "android_release_artifacts", branch: "main", labels: ["app-builder-export-42"] });
    expect(request.environment.variables).toEqual({ APP_BUILDER_APPLICATION_ID: "sa.appbuilder.client.u2.p9" });
  });

  it("normalizes the official webhook URL form into the API application identifier", () => {
    const config = getCodemagicBuildConfig({ CODEMAGIC_API_TOKEN: "secret", CODEMAGIC_APP_ID: "https://api.codemagic.io/hooks/build-app-123456", CODEMAGIC_ANDROID_WORKFLOW_ID: "android_release_artifacts" });
    expect(config.appId).toBe("build-app-123456");
  });

  it("reads successful Codemagic artifacts and selects only the requested format", () => {
    const build = normalizeCodemagicBuild({ data: { _id: "build-1", status: "finished", artefacts: [
      { name: "client.apk", type: "apk", size_in_bytes: 12, short_lived_download_url: "https://example.test/client.apk" },
      { name: "client.aab", type: "aab", size_in_bytes: 10, short_lived_download_url: "https://example.test/client.aab" },
    ] } });
    expect(selectArtifactForFormat(build.artifacts, "apk")?.name).toBe("client.apk");
    expect(selectArtifactForFormat(build.artifacts, "aab")?.name).toBe("client.aab");
    expect(isCodemagicBuildInProgress("building")).toBe(true);
    expect(isCodemagicBuildInProgress("finished")).toBe(false);
  });
});
