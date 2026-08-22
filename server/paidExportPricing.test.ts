import { describe, expect, it } from "vitest";
import { ONE_MB_BYTES, TEN_MB_BYTES, getPaidExportPrice, paidExportPricePerTenMbSar } from "../shared/exportPricing";

describe("paid per-export price catalog", () => {
  it("keeps the approved SAR prices for each 10-MB unit", () => {
    expect(paidExportPricePerTenMbSar).toEqual({ ecommerce: 50, education: 70, games: 120, music: 100, podcasts: 100, movies: 150, services: 40, books: 50 });
  });

  it("calculates proportionally in billed 1-MB increments from the approved 10-MB price", () => {
    expect(getPaidExportPrice("services", 0)).toMatchObject({ billableMegabytes: 1, sizeUnits: 1, unitPriceSar: 40, pricePerMegabyteSar: 4, totalPriceSar: 4, totalPriceHalalas: 400 });
    expect(getPaidExportPrice("ecommerce", ONE_MB_BYTES)).toMatchObject({ billableMegabytes: 1, pricePerMegabyteSar: 5, totalPriceSar: 5, totalPriceHalalas: 500 });
    expect(getPaidExportPrice("ecommerce", TEN_MB_BYTES + 1)).toMatchObject({ billableMegabytes: 11, sizeUnits: 11, unitPriceSar: 50, pricePerMegabyteSar: 5, totalPriceSar: 55, totalPriceHalalas: 5500 });
    expect(getPaidExportPrice("movies", 30 * ONE_MB_BYTES)).toMatchObject({ billableMegabytes: 30, unitPriceSar: 150, pricePerMegabyteSar: 15, totalPriceSar: 450, totalPriceHalalas: 45000 });
  });

  it("uses the owner-approved Books price proportionally for every billed megabyte", () => {
    expect(getPaidExportPrice("books", TEN_MB_BYTES + 1)).toMatchObject({ billableMegabytes: 11, unitPriceSar: 50, pricePerMegabyteSar: 5, totalPriceSar: 55, totalPriceHalalas: 5500 });
  });
});
