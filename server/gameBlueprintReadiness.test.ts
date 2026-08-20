import { describe, expect, it } from "vitest";
import { builderComponentTypes, gameComponentTypes, gameModes, getDefaultComponentProperties } from "../shared/componentCatalog";
import { readFileSync } from "node:fs";

describe("game blueprint readiness", () => {
  it("keeps every supported game mode assignable across each game block", () => {
    expect(gameModes).toHaveLength(9);
    expect(gameComponentTypes).toEqual(expect.arrayContaining(["GameScene", "Player", "ImageAnimation", "Platform", "Collectible", "Hazard", "FinishGate", "TouchControls", "Physics", "Score", "Level", "Condition"]));
    for (const mode of gameModes) {
      for (const componentType of gameComponentTypes) {
        const defaults = getDefaultComponentProperties(componentType, "games");
        expect({ ...defaults, gameMode: mode }).toMatchObject({ gameMode: mode });
      }
    }
  });

  it("keeps APK, AAB, and IPA as declared export targets for game projects", () => {
    const router = readFileSync(new URL("./routers/appBuilder.ts", import.meta.url), "utf8");
    const catalog = readFileSync(new URL("../shared/componentCatalog.ts", import.meta.url), "utf8");
    expect(builderComponentTypes).toContain("GameScene");
    expect(router).toContain('z.enum(["apk", "aab", "ipa"])');
    expect(catalog).toContain('if (category === "games") return [...baseComponentTypes, ...gameComponentTypes]');
  });
});
