import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generatedGameModes, getGameGeneratorPreset } from "../shared/gameGenerator";

const routerSource = readFileSync(new URL("./routers/appBuilder.ts", import.meta.url), "utf8");
const builderSource = readFileSync(new URL("../client/src/pages/BuilderPages.tsx", import.meta.url), "utf8");

describe("game generator", () => {
  it("provides eight editable mode blueprints with a complete game scene and core blocks", () => {
    expect(generatedGameModes).toEqual([
      "platformer", "endless_runner", "puzzle", "quiz", "memory_cards", "tower_defense", "simple_shooter", "racing",
    ]);
    for (const mode of generatedGameModes) {
      const preset = getGameGeneratorPreset(mode);
      expect(preset.components).toHaveLength(11);
      expect(preset.components.map(component => component.componentType)).toEqual(expect.arrayContaining([
        "GameScene", "Player", "Platform", "Collectible", "Hazard", "FinishGate", "TouchControls", "Physics", "Score", "Level", "Condition",
      ]));
      expect(preset.components.every(component => component.properties.gameMode === mode)).toBe(true);
      expect(preset.rulesAr.length).toBeGreaterThan(8);
      expect(preset.rulesEn.length).toBeGreaterThan(8);
    }
  });

  it("keeps generation owner-protected, game-only, and limited to generated components on the selected page", () => {
    expect(routerSource).toContain("generateGame: protectedProcedure");
    expect(routerSource).toContain('project.category !== "games"');
    expect(routerSource).toContain("generatedBy === \"game-generator\"");
    expect(routerSource).toContain("getGameGeneratorPreset(input.mode)");
    expect(routerSource).toContain("pageId: input.pageId");
  });

  it("exposes the game-mode picker and generation action only from the game editor", () => {
    expect(builderSource).toContain("GameGeneratorPanel");
    expect(builderSource).toContain("generatedGameModes.map");
    expect(builderSource).toContain("workspace.data.project.category === \"games\"");
    expect(builderSource).toContain("trpc.appBuilder.editor.generateGame.useMutation");
  });
});
