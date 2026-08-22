import { describe, expect, it } from "vitest";
import { TEN_MB_BYTES, getPaidExportPrice, paidExportPricePerTenMbSar } from "../shared/exportPricing";

describe("paid per-export price catalog", () => {
  it("keeps the approved SAR prices for each 10-MB unit", () => {
    expect(paidExportPricePerTenMbSar).toEqual({ ecommerce: 50, education: 70, games: 120, music: 100, podcasts: 100, movies: 150, services: 40, books: 50 });
  });

  it("rounds each paid export up to a whole 10-MB unit", () => {
    expect(getPaidExportPrice("services", 0)).toMatchObject({ sizeUnits: 1, unitPriceSar: 40, totalPriceSar: 40, totalPriceHalalas: 4000 });
    expect(getPaidExportPrice("ecommerce", TEN_MB_BYTES + 1)).toMatchObject({ sizeUnits: 2, unitPriceSar: 50, totalPriceSar: 100, totalPriceHalalas: 10000 });
    expect(getPaidExportPrice("movies", 30 * 1024 * 1024)).toMatchObject({ sizeUnits: 3, unitPriceSar: 150, totalPriceSar: 450, totalPriceHalalas: 45000 });
  });

  it("uses the owner-approved Books price for every 10-MB unit", () => {
    expect(getPaidExportPrice("books", TEN_MB_BYTES + 1)).toMatchObject({ sizeUnits: 2, unitPriceSar: 50, totalPriceSar: 100, totalPriceHalalas: 10000 });
  });
});
