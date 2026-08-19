import { describe, expect, it } from "vitest";
import { templateCategories } from "../shared/appBuilderCatalog";
import { premiumExampleCatalog } from "../shared/premiumExamples";

describe("premium app examples", () => {
  it("provides one unique editable application example for every template category", () => {
    expect(premiumExampleCatalog).toHaveLength(7);
    expect(premiumExampleCatalog.map(example => example.category).sort()).toEqual([...templateCategories].sort());
    expect(new Set(premiumExampleCatalog.map(example => example.slug)).size).toBe(7);
  });

  it("gives each paid example a considered multi-screen structure and core components", () => {
    for (const example of premiumExampleCatalog) {
      expect(example.pages.length).toBeGreaterThanOrEqual(5);
      expect(example.components.length).toBeGreaterThanOrEqual(6);
      expect(example.nameAr).not.toHaveLength(0);
      expect(example.nameEn).not.toHaveLength(0);
      expect(example.components.every(component => example.pages.some(page => page.key === component.pageKey))).toBe(true);
      expect(example.components.every(component => component.componentType.length > 0)).toBe(true);
    }
  });

  it("includes search in each searchable media or storefront example and products in the store", () => {
    for (const category of ["ecommerce", "music", "podcasts", "movies"] as const) {
      const example = premiumExampleCatalog.find(item => item.category === category);
      expect(example?.components.some(component => component.componentType === "SearchBar")).toBe(true);
    }
    const store = premiumExampleCatalog.find(item => item.category === "ecommerce");
    expect(store?.components.some(component => component.componentType === "Product")).toBe(true);
  });
});
