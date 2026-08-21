import { describe, expect, it } from "vitest";
import { gameModes, getAllowedComponentTypes, getDefaultComponentProperties } from "../shared/componentCatalog";

describe("builder component catalog", () => {
  it("provides functional defaults for every standard component in each template family", () => {
    for (const category of ["ecommerce", "education", "games", "music", "podcasts", "movies", "services", "books"] as const) {
      for (const type of getAllowedComponentTypes(category)) {
        expect(getDefaultComponentProperties(type, category)).toEqual(expect.any(Object));
      }
    }
  });

  it("exposes programmable game blocks only to game projects", () => {
    expect(getAllowedComponentTypes("games")).toEqual(expect.arrayContaining(["GameScene", "Player", "ImageAnimation", "Platform", "Collectible", "Hazard", "FinishGate", "TouchControls", "Physics", "Score", "Level", "Condition"]));
    expect(getAllowedComponentTypes("ecommerce")).not.toContain("GameScene");
    expect(getAllowedComponentTypes("ecommerce")).not.toContain("Platform");
  });

  it("makes Image Animation available in every template category with a safe motion-video default", () => {
    for (const category of ["ecommerce", "education", "games", "music", "podcasts", "movies", "services", "books"] as const) {
      expect(getAllowedComponentTypes(category)).toContain("ImageAnimation");
      expect(getDefaultComponentProperties("ImageAnimation", category)).toMatchObject({ assetId: null, assetUrl: "", frameCount: 1, fps: 8 });
    }
  });

  it("supplies usable platformer defaults for the core scene objects and touch controls", () => {
    expect(gameModes).toEqual(["platformer", "endless_runner", "puzzle", "quiz", "memory_cards", "tower_defense", "simple_shooter", "racing", "light_simulation"]);
    expect(getDefaultComponentProperties("GameScene", "games")).toMatchObject({ preset: "platformer", gameMode: "platformer", durationSeconds: 90, progressionMode: "linear", showHud: true, musicEnabled: true, soundEffectsEnabled: true, checkpointEnabled: true, persistenceEnabled: false, layer: 1 });
    expect(getDefaultComponentProperties("Platform", "games")).toMatchObject({ x: 8, y: 78, width: 84, height: 10, layer: 10 });
    expect(getDefaultComponentProperties("Collectible", "games")).toMatchObject({ amount: 3, value: 10, layer: 20 });
    expect(getDefaultComponentProperties("FinishGate", "games")).toMatchObject({ requiredScore: 30, layer: 25 });
    expect(getDefaultComponentProperties("Player", "games")).toMatchObject({ layer: 30 });
    expect(getDefaultComponentProperties("ImageAnimation", "games")).toMatchObject({ layer: 40 });
    expect(getDefaultComponentProperties("TouchControls", "games")).toMatchObject({ showDirections: true, showJump: true });
    expect(getDefaultComponentProperties("ImageAnimation", "games")).toMatchObject({ target: "player", frameCount: 1, fps: 8 });
  });

  it("exposes the editable search bar to storefront and media discovery projects", () => {
    expect(getAllowedComponentTypes("ecommerce")).toContain("SearchBar");
    expect(getAllowedComponentTypes("music")).toContain("SearchBar");
    expect(getAllowedComponentTypes("podcasts")).toContain("SearchBar");
    expect(getAllowedComponentTypes("movies")).toContain("SearchBar");
    expect(getAllowedComponentTypes("books")).toEqual(expect.arrayContaining(["SearchBar", "PDFDocument", "PaymentPlatform"]));
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
    expect(getDefaultComponentProperties("PDFDocument", "books")).toMatchObject({ assetId: null, assetUrl: "", startPage: 1 });
    expect(getDefaultComponentProperties("PaymentPlatform", "books")).toMatchObject({ provider: "moyasar", mode: "product", currency: "SAR" });
  });

  it("removes the ready-made form from new template pickers while retaining clean editable defaults", () => {
    for (const category of ["ecommerce", "education", "games", "music", "podcasts", "movies", "services", "books"] as const) expect(getAllowedComponentTypes(category)).not.toContain("Form");
    for (const category of ["ecommerce", "education", "games", "music", "podcasts", "movies", "services", "books"] as const) expect(getAllowedComponentTypes(category)).toContain("Background");
    expect(getDefaultComponentProperties("Button", "ecommerce")).toMatchObject({ targetPageId: null, textAr: "", textEn: "" });
    expect(getDefaultComponentProperties("Background", "books")).toMatchObject({ mediaType: "image", assetId: null, assetUrl: "" });
    expect(getDefaultComponentProperties("Player", "games")).toMatchObject({ imageAssetId: null, imageAssetUrl: "", videoAssetId: null, videoAssetUrl: "", audioAssetId: null, audioAssetUrl: "" });
    expect(getDefaultComponentProperties("List", "education")).toMatchObject({ titleAr: "", titleEn: "", items: [] });
    expect(getAllowedComponentTypes("podcasts")).toContain("Audio");
    expect(getDefaultComponentProperties("Video", "movies")).toMatchObject({ assetId: null, assetUrl: "", captionAr: "", autoplay: true });
    expect(getDefaultComponentProperties("Audio", "podcasts")).toMatchObject({ assetId: null, assetUrl: "", captionAr: "" });
  });
});
