import type { TemplateCategory } from "./appBuilderCatalog";

export const TEN_MB_BYTES = 10 * 1024 * 1024;
export const ONE_MB_BYTES = 1024 * 1024;
export type PaidExportCategory = TemplateCategory;

export const paidExportPricePerTenMbSar: Record<PaidExportCategory, number> = {
  ecommerce: 50,
  education: 70,
  games: 120,
  music: 100,
  podcasts: 100,
  movies: 150,
  services: 40,
  books: 50,
};

export function hasPaidExportPrice(category: TemplateCategory): category is PaidExportCategory {
  return category in paidExportPricePerTenMbSar;
}

export function getPaidExportPrice(category: TemplateCategory, estimatedSizeBytes: number) {
  if (!hasPaidExportPrice(category)) throw new Error("Paid export price has not been configured for this template category");
  const billableMegabytes = Math.max(1, Math.ceil(Math.max(0, estimatedSizeBytes) / ONE_MB_BYTES));
  const unitPriceSar = paidExportPricePerTenMbSar[category];
  const pricePerMegabyteSar = unitPriceSar / 10;
  const pricePerMegabyteHalalas = unitPriceSar * 10;
  const totalPriceHalalas = billableMegabytes * pricePerMegabyteHalalas;
  return {
    // Keep this persisted integer field for existing export-job records; it now stores billed 1-MB units.
    sizeUnits: billableMegabytes,
    billableMegabytes,
    unitPriceSar,
    unitPriceHalalas: unitPriceSar * 100,
    pricePerMegabyteSar,
    pricePerMegabyteHalalas,
    totalPriceSar: totalPriceHalalas / 100,
    totalPriceHalalas,
  };
}
