import { describe, expect, it } from "vitest";
import { buildApplicationLabelXml, buildNativeExportConfiguration, exportArtifactStorageKey, exportConfigurationStorageKey, resolveClientApplicationId } from "./exportBuildPipeline";

describe("client export configuration", () => {
  it("creates a unique Android application id for each owner project pair", () => {
    expect(resolveClientApplicationId(7, 13)).toBe("sa.appbuilder.client.u7.p13");
    expect(resolveClientApplicationId(8, 13)).not.toBe(resolveClientApplicationId(7, 13));
    expect(exportConfigurationStorageKey(7, 13, 91)).toBe("exports/config/7/13/91.json");
    expect(exportArtifactStorageKey(7, 13, 91, "client.apk")).toBe("exports/artifacts/7/13/91/client.apk");
    expect(exportArtifactStorageKey(8, 13, 91, "client.apk")).not.toBe(exportArtifactStorageKey(7, 13, 91, "client.apk"));
  });

  it("keeps the generated app label XML escaped and project configuration scoped to the project pages", () => {
    expect(buildApplicationLabelXml("Alpha & <Beta>")).toContain("Alpha &amp; &lt;Beta&gt;");
    const config = buildNativeExportConfiguration({
      exportJobId: 9,
      project: { id: 3, ownerId: 7, templateId: null, name: "متجري", description: null, category: "ecommerce", language: "both", status: "draft", appId: null, versionName: "1.0.0", packageName: null, estimatedSizeBytes: 0, settings: { primaryColor: "#2563EB" }, createdAt: new Date(), updatedAt: new Date() },
      pages: [{ id: 11, titleAr: "الرئيسية", titleEn: "Home", route: "/" }],
      components: [{ pageId: 11, componentType: "card", labelAr: "عرض اليوم", labelEn: "Today offer", sortOrder: 1 }],
    });
    expect(config.pages).toHaveLength(1);
    expect(config.pages[0]?.components[0]).toMatchObject({ type: "card", labelAr: "عرض اليوم" });
    expect(config).not.toHaveProperty("ownerId");
  });
});
