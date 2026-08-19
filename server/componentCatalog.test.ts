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
    expect(getAllowedComponentTypes("games")).toEqual(expect.arrayContaining(["GameScene", "Player", "Physics", "Score", "Level", "Condition"]));
    expect(getAllowedComponentTypes("ecommerce")).not.toContain("GameScene");
  });

  it("builds a template-aware booking form and editable navigation defaults", () => {
    expect(getDefaultComponentProperties("Form", "services")).toMatchObject({ submitLabelAr: "إرسال", fields: expect.arrayContaining([expect.objectContaining({ key: "appointment" })]) });
    expect(getDefaultComponentProperties("Button", "ecommerce")).toMatchObject({ targetPageId: null, textAr: "متابعة" });
    expect(getDefaultComponentProperties("List", "education")).toMatchObject({ items: [] });
  });
});
