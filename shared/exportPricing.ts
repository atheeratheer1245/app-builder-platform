import type { TemplateCategory } from "./appBuilderCatalog";

export const TEN_MB_BYTES = 10 * 1024 * 1024;

export const paidExportPricePerTenMbSar: Record<TemplateCategory, number> = {
  ecommerce: 50,
  education: 70,
  games: 120,
  music: 100,
  podcasts: 100,
  movies: 150,
  services: 40,
};

export function getPaidExportPrice(category: TemplateCategory, estimatedSizeBytes: number) {
  const sizeUnits = Math.max(1, Math.ceil(Math.max(0, estimatedSizeBytes) / TEN_MB_BYTES));
  const unitPriceSar = paidExportPricePerTenMbSar[category];
  return {
    sizeUnits,
    unitPriceSar,
    unitPriceHalalas: unitPriceSar * 100,
    totalPriceSar: unitPriceSar * sizeUnits,
    totalPriceHalalas: unitPriceSar * sizeUnits * 100,
  };
}
