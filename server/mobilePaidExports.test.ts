import { describe, expect, it } from "vitest";
import { buildMobileExportProjectAppId, mobileExportRequestSchema } from "./mobilePaidExports";

describe("native Android paid exports", () => {
  const baseRequest = {
    localProjectId: "a0f61f58-8ec4-4a71-b2ab-4f2d3fe1e22a",
    name: "متجر الهاتف",
    category: "ecommerce",
    format: "apk",
    estimatedSizeBytes: 11 * 1024 * 1024,
  };

  it("accepts only a supported category, file format, and bounded size", () => {
    expect(mobileExportRequestSchema.parse(baseRequest)).toMatchObject(baseRequest);
    expect(() => mobileExportRequestSchema.parse({ ...baseRequest, category: "custom" })).toThrow();
    expect(() => mobileExportRequestSchema.parse({ ...baseRequest, format: "zip" })).toThrow();
    expect(() => mobileExportRequestSchema.parse({ ...baseRequest, estimatedSizeBytes: -1 })).toThrow();
  });

  it("maps an Android-local project ID into a stable server-owned project reference", () => {
    expect(buildMobileExportProjectAppId(baseRequest.localProjectId)).toBe("native-android:a0f61f58-8ec4-4a71-b2ab-4f2d3fe1e22a");
  });
});
