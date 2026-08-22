import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getDescribedGameProject } from "../shared/gameGenerator";

const routerSource = readFileSync(new URL("./routers/appBuilder.ts", import.meta.url), "utf8");
const builderSource = readFileSync(new URL("../client/src/pages/BuilderPages.tsx", import.meta.url), "utf8");

describe("description-led game generator", () => {
  it("builds an editable five-screen game journey with onboarding, levels, a boss, and completion", () => {
    const project = getDescribedGameProject({ brief: "لعبة مغامرة في الصحراء تجمع فيها الماء وتتجنب الصخور وتواجه وحشًا أخيرًا." });
    expect(project.pages.map(page => page.key)).toEqual(["game-start", "game-tutorial", "game-level-one", "game-level-two", "game-victory"]);
    expect(project.pages.flatMap(page => page.components).map(component => component.componentType)).toEqual(expect.arrayContaining([
      "GameScene", "Player", "Platform", "Collectible", "Hazard", "FinishGate", "TouchControls", "Physics", "Score", "Level", "Condition", "Button", "Card",
    ]));
    const boss = project.pages.find(page => page.key === "game-level-two")?.components.find(component => component.componentType === "Hazard");
    expect(boss?.properties).toMatchObject({ role: "boss", generatorStyle: "description-led" });
    const firstLevelCondition = project.pages.find(page => page.key === "game-level-one")?.components.find(component => component.componentType === "Condition");
    expect(firstLevelCondition?.properties).toMatchObject({ successPageKey: "game-level-two" });
  });

  it("uses owner-selected image, video, and audio as editable media and creates motion-ready hero, enemy, and stage elements", () => {
    const project = getDescribedGameProject({
      brief: "مغامرة بحرية", image: { id: 11, url: "/hero.png", filename: "hero.png" }, video: { id: 12, url: "/sea.mp4", filename: "sea.mp4" }, audio: { id: 13, url: "/music.mp3", filename: "music.mp3" },
    });
    const firstLevel = project.pages.find(page => page.key === "game-level-one");
    const player = firstLevel?.components.find(component => component.componentType === "Player");
    const background = firstLevel?.components.find(component => component.componentType === "Background");
    const audio = firstLevel?.components.find(component => component.componentType === "Audio");
    const animations = firstLevel?.components.filter(component => component.componentType === "ImageAnimation") ?? [];
    expect(player?.properties).toMatchObject({ imageAssetId: 11, imageAssetUrl: "/hero.png", videoAssetId: 12, videoAssetUrl: "/sea.mp4", audioAssetId: 13, audioAssetUrl: "/music.mp3" });
    expect(background?.properties).toMatchObject({ mediaType: "video", assetId: 12, assetUrl: "/sea.mp4" });
    expect(audio?.properties).toMatchObject({ assetId: 13, assetUrl: "/music.mp3", autoplay: true, loop: true });
    expect(animations.map(component => component.properties.target)).toEqual(expect.arrayContaining(["player", "enemy", "stage"]));
  });

  it("assigns separate owned gallery images to the player, enemy, boss, and animated stage", () => {
    const project = getDescribedGameProject({
      brief: "مغامرة في مدينة سحرية",
      playerImage: { id: 21, url: "/player.png", filename: "player.png" },
      enemyImage: { id: 22, url: "/enemy.png", filename: "enemy.png" },
      bossImage: { id: 23, url: "/boss.png", filename: "boss.png" },
      stageImage: { id: 24, url: "/stage.png", filename: "stage.png" },
    });
    const firstLevel = project.pages.find(page => page.key === "game-level-one");
    const bossLevel = project.pages.find(page => page.key === "game-level-two");
    expect(firstLevel?.components.find(component => component.componentType === "Player")?.properties).toMatchObject({ imageAssetId: 21, imageAssetUrl: "/player.png" });
    expect(firstLevel?.components.find(component => component.componentType === "Hazard")?.properties).toMatchObject({ assetId: 22, assetUrl: "/enemy.png", role: "enemy" });
    expect(bossLevel?.components.find(component => component.componentType === "Hazard")?.properties).toMatchObject({ assetId: 23, assetUrl: "/boss.png", role: "boss" });
    const stageAnimation = bossLevel?.components.find(component => component.componentType === "ImageAnimation" && component.properties.target === "stage");
    expect(stageAnimation?.properties).toMatchObject({ assetId: 24, assetUrl: "/stage.png", motionStyle: "drift" });
  });

  it("applies a narrative plan to the editable game title, levels, hero, enemy, and boss", () => {
    const project = getDescribedGameProject({
      brief: "مغامرة جبلية",
      narrative: {
        titleAr: "رحلة القمم", titleEn: "Summit quest", storyAr: "يصعد المستكشف عبر القمم.", storyEn: "An explorer climbs through the peaks.",
        heroAr: "المستكشف", heroEn: "Explorer", enemyAr: "حارس الكهف", enemyEn: "Cave guardian", bossAr: "عملاق القمة", bossEn: "Summit giant",
        objectiveAr: "اجمع الحبال للوصول إلى القمة", objectiveEn: "Collect ropes to reach the summit", levelOneAr: "ممر الجبل", levelOneEn: "Mountain pass", levelTwoAr: "قمة العاصفة", levelTwoEn: "Storm summit",
      },
    });
    expect(project).toMatchObject({ titleAr: "رحلة القمم", titleEn: "Summit quest" });
    expect(project.pages.find(page => page.key === "game-level-one")?.titleAr).toBe("ممر الجبل");
    expect(project.pages.find(page => page.key === "game-level-two")?.titleEn).toBe("Storm summit");
    const levelOne = project.pages.find(page => page.key === "game-level-one");
    const levelTwo = project.pages.find(page => page.key === "game-level-two");
    expect(levelOne?.components.find(component => component.componentType === "Player")?.labelAr).toBe("المستكشف");
    expect(levelOne?.components.find(component => component.componentType === "Hazard")?.labelAr).toBe("حارس الكهف");
    expect(levelTwo?.components.find(component => component.componentType === "Hazard")?.labelAr).toBe("عملاق القمة");
  });

  it("keeps generation owner-protected, game-only, and preserves manual project components while refreshing generated content", () => {
    expect(routerSource).toContain("generateGame: protectedProcedure");
    expect(routerSource).toContain('project.category !== "games"');
    expect(routerSource).toContain("generatedBy === \"game-generator\"");
    expect(routerSource).toContain("getOwnedGameGeneratorAsset");
    expect(routerSource).toContain("planGameNarrative(input.brief)");
    expect(routerSource).toContain("getDescribedGameProject({ brief: input.brief, image, playerImage, enemyImage, bossImage, stageImage, video, audio, narrative })");
    expect(routerSource).toContain("sourcePageKey === page.key");
    expect(routerSource).toContain("targetPageKey");
    expect(routerSource).toContain("successPageKey");
  });

  it("shows a description-first complete-game creator without a visible mode picker", () => {
    expect(builderSource).toContain("GameGeneratorPanel");
    expect(builderSource).toContain("منشئ لعبة كاملة");
    expect(builderSource).toContain("إنشاء لعبة كاملة");
    expect(builderSource).toContain("workspace.data.project.category === \"games\"");
    expect(builderSource).toContain("trpc.appBuilder.editor.generateGame.useMutation");
    expect(builderSource).toContain("gameGeneratorPlayerImageAssetId");
    expect(builderSource).toContain("gameGeneratorEnemyImageAssetId");
    expect(builderSource).toContain("gameGeneratorBossImageAssetId");
    expect(builderSource).toContain("gameGeneratorStageImageAssetId");
    expect(builderSource).toContain("Direct image motion");
    expect(builderSource).toContain("In-game image motion");
    expect(builderSource).toContain("gameGeneratorVideoAssetId");
    expect(builderSource).toContain("gameGeneratorAudioAssetId");
    expect(builderSource).not.toContain("generatedGameModes.map");
  });
});
