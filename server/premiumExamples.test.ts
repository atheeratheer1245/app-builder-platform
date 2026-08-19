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
      expect(example.components.length).toBeGreaterThanOrEqual(3);
      expect(example.nameAr).not.toHaveLength(0);
      expect(example.nameEn).not.toHaveLength(0);
    }
  });
});
