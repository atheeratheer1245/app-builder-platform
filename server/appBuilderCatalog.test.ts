import { describe, expect, it } from "vitest";
import { TEN_MB_BYTES, getExportPrice, pricePerTenMbSar, templateCatalog } from "../shared/appBuilderCatalog";

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

  it("preserves the approved SAR price for every 10 MB category", () => {
    expect(pricePerTenMbSar).toEqual({
      ecommerce: 50,
      education: 70,
      games: 120,
      music: 100,
      podcasts: 100,
      movies: 150,
      services: 40,
    });
  });
});

describe("export price calculation", () => {
  it("charges a minimum single 10 MB increment", () => {
    expect(getExportPrice("services", 0)).toMatchObject({
      sizeUnits: 1,
      unitPriceSar: 40,
      totalPriceSar: 40,
      totalPriceHalalas: 4000,
    });
  });

  it("rounds the expected size up to the next 10 MB increment", () => {
    expect(getExportPrice("ecommerce", TEN_MB_BYTES + 1)).toMatchObject({
      sizeUnits: 2,
      unitPriceSar: 50,
      totalPriceSar: 100,
      totalPriceHalalas: 10000,
    });
  });

  it("applies the movies and shows price correctly", () => {
    expect(getExportPrice("movies", 30 * 1024 * 1024)).toMatchObject({
      sizeUnits: 3,
      unitPriceSar: 150,
      totalPriceSar: 450,
      totalPriceHalalas: 45000,
    });
  });
});
