import { projectAssets } from "../drizzle/schema";
import type { GameGeneratorAsset } from "../shared/gameGenerator";
import type { GameNarrativePlan } from "../shared/gameNarrative";
import { getRequiredDb } from "./appBuilderDb";
import { generateImage } from "./_core/imageGeneration";

type GameVisualRole = "player" | "enemy" | "boss" | "stage";

const visualCopy: Record<GameVisualRole, { ar: string; en: string }> = {
  player: { ar: "الشخصية الرئيسية", en: "main playable hero" },
  enemy: { ar: "وحش المرحلة", en: "level creature" },
  boss: { ar: "زعيم المرحلة", en: "final level boss" },
  stage: { ar: "بيئة المرحلة", en: "game-stage environment" },
};

export function gameVisualPrompt(role: GameVisualRole, brief: string, narrative: GameNarrativePlan) {
  const subject = role === "player" ? narrative.heroEn : role === "enemy" ? narrative.enemyEn : role === "boss" ? narrative.bossEn : narrative.levelOneEn;
  const roleDetail = visualCopy[role].en;
  const composition = role === "stage" ? "wide 2D side-scrolling game backdrop with a clear play area and depth, no characters" : "single full-body character with a clear silhouette, centered, ready for a 2D game animation";
  return `Create one original, family-friendly 2D mobile game asset for: ${roleDetail}. Subject: ${subject}. Game idea: ${brief}. Composition: ${composition}. Style: polished colorful fantasy-adventure illustration, coherent lighting and palette across a single game. No text, no letters, no numbers, no logos, no watermarks, no user interface, no copyrighted characters, no real brands, no gore, no weapons, no sexual content, no gambling imagery.`;
}

async function saveGeneratedProjectImage(input: { ownerId: number; projectId: number; role: GameVisualRole; brief: string; narrative: GameNarrativePlan }): Promise<GameGeneratorAsset> {
  const result = await generateImage({ prompt: gameVisualPrompt(input.role, input.brief, input.narrative) });
  if (!result.url || !result.key) throw new Error("Generated image storage result is incomplete");
  const db = await getRequiredDb();
  const filename = `generated-${input.role}-${Date.now()}.png`;
  const inserted = await db.insert(projectAssets).values({
    projectId: input.projectId,
    ownerId: input.ownerId,
    kind: "image",
    filename,
    storageKey: result.key,
    url: result.url,
    mimeType: result.mimeType?.startsWith("image/") ? result.mimeType : "image/png",
    sizeBytes: result.sizeBytes ?? 0,
  });
  return { id: Number(inserted[0]?.insertId ?? 0), url: result.url, filename };
}

export async function generateMissingGameVisuals(input: { ownerId: number; projectId: number; brief: string; narrative: GameNarrativePlan; enabled: boolean; playerImage: GameGeneratorAsset | null; enemyImage: GameGeneratorAsset | null; bossImage: GameGeneratorAsset | null; stageImage: GameGeneratorAsset | null }) {
  if (!input.enabled) return { playerImage: input.playerImage, enemyImage: input.enemyImage, bossImage: input.bossImage, stageImage: input.stageImage, generatedImageCount: 0, generatedImageFailureCount: 0 };
  const candidates: Array<[GameVisualRole, GameGeneratorAsset | null]> = [["player", input.playerImage], ["enemy", input.enemyImage], ["boss", input.bossImage], ["stage", input.stageImage]];
  const results = await Promise.all(candidates.map(async ([role, asset]) => asset ? asset : saveGeneratedProjectImage({ ownerId: input.ownerId, projectId: input.projectId, role, brief: input.brief, narrative: input.narrative }).catch(() => null)));
  const [playerImage, enemyImage, bossImage, stageImage] = results;
  const generatedImageCount = results.filter((asset, index) => !candidates[index][1] && asset).length;
  const generatedImageFailureCount = results.filter((asset, index) => !candidates[index][1] && !asset).length;
  return { playerImage, enemyImage, bossImage, stageImage, generatedImageCount, generatedImageFailureCount };
}
