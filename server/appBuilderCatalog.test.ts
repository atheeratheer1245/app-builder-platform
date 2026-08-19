import { describe, expect, it } from "vitest";
import { templateCatalog } from "../shared/appBuilderCatalog";

describe("app builder template catalog", () => {
  it("contains exactly the seven configured template categories", () => {
    expect(templateCatalog).toHaveLength(7);
    expect(templateCatalog.map(template => template.category)).toEqual([
      "ecommerce",
      "education",
      "games",
      "music",
      "podcasts",
      "movies",
      "services",
    ]);
  });
});
