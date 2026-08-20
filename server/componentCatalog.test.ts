import { describe, expect, it } from "vitest";
import { getAllowedComponentTypes, getDefaultComponentProperties } from "../shared/componentCatalog";

describe("builder component catalog", () => {
  it("provides functional defaults for every standard component in each template family", () => {
    for (const category of ["ecommerce", "education", "games", "music", "podcasts", "movies", "services"] as const) {
      for (const type of getAllowedComponentTypes(category)) {
        expect(getDefaultComponentProperties(type, category)).toEqual(expect.any(Object));
      }
    }
  });

  it("exposes programmable game blocks only to game projects", () => {
    expect(getAllowedComponentTypes("games")).toEqual(expect.arrayContaining(["GameScene", "Player", "Platform", "Collectible", "Hazard", "FinishGate", "TouchControls", "Physics", "Score", "Level", "Condition"]));
    expect(getAllowedComponentTypes("ecommerce")).not.toContain("GameScene");
    expect(getAllowedComponentTypes("ecommerce")).not.toContain("Platform");
  });

  it("supplies usable platformer defaults for the core scene objects and touch controls", () => {
    expect(getDefaultComponentProperties("GameScene", "games")).toMatchObject({ preset: "platformer", durationSeconds: 90 });
    expect(getDefaultComponentProperties("Platform", "games")).toMatchObject({ x: 8, y: 78, width: 84, height: 10 });
    expect(getDefaultComponentProperties("Collectible", "games")).toMatchObject({ amount: 3, value: 10 });
    expect(getDefaultComponentProperties("FinishGate", "games")).toMatchObject({ requiredScore: 30 });
    expect(getDefaultComponentProperties("TouchControls", "games")).toMatchObject({ showDirections: true, showJump: true });
  });

  it("exposes the editable search bar to storefront and media discovery projects", () => {
    expect(getAllowedComponentTypes("ecommerce")).toContain("SearchBar");
    expect(getAllowedComponentTypes("music")).toContain("SearchBar");
    expect(getAllowedComponentTypes("podcasts")).toContain("SearchBar");
    expect(getAllowedComponentTypes("movies")).toContain("SearchBar");
    expect(getAllowedComponentTypes("education")).not.toContain("SearchBar");
    expect(getAllowedComponentTypes("games")).not.toContain("SearchBar");
    expect(getAllowedComponentTypes("ecommerce")).toContain("Product");
    expect(getAllowedComponentTypes("music")).not.toContain("Product");
    expect(getDefaultComponentProperties("SearchBar", "ecommerce")).toMatchObject({
      placeholderAr: "ابحث في المنتجات",
      placeholderEn: "Search products",
      emptyAr: "لا توجد نتائج مطابقة للبحث",
    });
    expect(getDefaultComponentProperties("Product", "ecommerce")).toMatchObject({ currency: "SAR", price: 0, stock: 0 });
  });

  it("builds a template-aware booking form plus editable button, titled list, and audio defaults", () => {
    expect(getDefaultComponentProperties("Form", "services")).toMatchObject({ submitLabelAr: "إرسال", fields: expect.arrayContaining([expect.objectContaining({ key: "appointment" })]) });
    expect(getDefaultComponentProperties("Button", "ecommerce")).toMatchObject({ targetPageId: null, textAr: "متابعة" });
    expect(getDefaultComponentProperties("List", "education")).toMatchObject({ titleAr: "", titleEn: "", items: [] });
    expect(getAllowedComponentTypes("podcasts")).toContain("Audio");
    expect(getDefaultComponentProperties("Audio", "podcasts")).toMatchObject({ assetId: null, assetUrl: "", captionAr: "عنوان المقطع الصوتي" });
  });
});
