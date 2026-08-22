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
    expect(routerSource).toContain("getOwnedGameGeneratorAsset");
    expect(routerSource).toContain("assetId: input.imageAssetId");
    expect(routerSource).toContain("assetId: input.videoAssetId");
    expect(routerSource).toContain("assetId: input.audioAssetId");
    expect(routerSource).toContain("getGameGeneratorPreset(input.mode, { brief: input.brief, image, video, audio })");
    expect(routerSource).toContain("pageId: input.pageId");
  });

  it("turns an owner-selected brief, image, video, and audio into editable game media components", () => {
    const preset = getGameGeneratorPreset("platformer", {
      brief: "لعبة مغامرة في الصحراء تجمع فيها الماء وتتجنب الصخور.",
      image: { id: 11, url: "/image.png", filename: "hero.png" },
      video: { id: 12, url: "/scene.mp4", filename: "desert.mp4" },
      audio: { id: 13, url: "/music.mp3", filename: "music.mp3" },
    });
    const scene = preset.components.find(component => component.componentType === "GameScene");
    const player = preset.components.find(component => component.componentType === "Player");
    const background = preset.components.find(component => component.componentType === "Background");
    const audio = preset.components.find(component => component.componentType === "Audio");
    expect(preset.components).toHaveLength(13);
    expect(scene?.properties).toMatchObject({ generatorBrief: "لعبة مغامرة في الصحراء تجمع فيها الماء وتتجنب الصخور.", imageAssetId: 11, videoAssetId: 12, audioAssetId: 13 });
    expect(player?.properties).toMatchObject({ imageAssetId: 11, imageAssetUrl: "/image.png", videoAssetId: 12, videoAssetUrl: "/scene.mp4" });
    expect(background?.properties).toMatchObject({ mediaType: "video", assetId: 12, assetUrl: "/scene.mp4" });
    expect(audio?.properties).toMatchObject({ assetId: 13, assetUrl: "/music.mp3", autoplay: true, loop: true });
  });

  it("exposes the game-mode picker and generation action only from the game editor", () => {
    expect(builderSource).toContain("GameGeneratorPanel");
    expect(builderSource).toContain("generatedGameModes.map");
    expect(builderSource).toContain("workspace.data.project.category === \"games\"");
    expect(builderSource).toContain("trpc.appBuilder.editor.generateGame.useMutation");
    expect(builderSource).toContain("فكرة اللعبة وتعليماتها");
    expect(builderSource).toContain("gameGeneratorImageAssetId");
    expect(builderSource).toContain("gameGeneratorVideoAssetId");
    expect(builderSource).toContain("gameGeneratorAudioAssetId");
  });
});
