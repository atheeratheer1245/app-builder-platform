import { describe, expect, it } from "vitest";
import { templateCatalog } from "../shared/appBuilderCatalog";

describe("app builder template catalog", () => {
  it("contains the eight configured template categories", () => {
    expect(templateCatalog).toHaveLength(8);
    expect(templateCatalog.map(template => template.category)).toEqual([
      "ecommerce",
      "education",
      "games",
      "music",
      "podcasts",
      "movies",
      "services",
      "books",
    ]);
  });
});
