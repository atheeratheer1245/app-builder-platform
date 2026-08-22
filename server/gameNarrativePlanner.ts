import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { fallbackGameNarrative, type GameNarrativePlan } from "../shared/gameNarrative";

const narrativeSchema = z.object({
  titleAr: z.string().trim().min(1).max(100), titleEn: z.string().trim().min(1).max(100),
  storyAr: z.string().trim().min(1).max(500), storyEn: z.string().trim().min(1).max(500),
  heroAr: z.string().trim().min(1).max(80), heroEn: z.string().trim().min(1).max(80),
  enemyAr: z.string().trim().min(1).max(80), enemyEn: z.string().trim().min(1).max(80),
  bossAr: z.string().trim().min(1).max(80), bossEn: z.string().trim().min(1).max(80),
  objectiveAr: z.string().trim().min(1).max(160), objectiveEn: z.string().trim().min(1).max(160),
  levelOneAr: z.string().trim().min(1).max(100), levelOneEn: z.string().trim().min(1).max(100),
  levelTwoAr: z.string().trim().min(1).max(100), levelTwoEn: z.string().trim().min(1).max(100),
});

export async function planGameNarrative(brief: string): Promise<GameNarrativePlan> {
  const fallback = fallbackGameNarrative(brief);
  try {
    const response = await invokeLLM({
      model: "gemini-3-flash-preview",
      maxTokens: 900,
      messages: [
        { role: "system", content: "You are a mobile game narrative planner. Turn the user's original game idea into a family-safe, non-infringing game story with a hero, level creature, final boss, objective, and two level names. Do not mention copyrighted characters, real brands, weapons, gore, sexual content, or gambling. Return bilingual Arabic and English fields only." },
        { role: "user", content: `Game idea: ${brief}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "game_narrative", strict: true, schema: { type: "object", properties: {
        titleAr: { type: "string" }, titleEn: { type: "string" }, storyAr: { type: "string" }, storyEn: { type: "string" }, heroAr: { type: "string" }, heroEn: { type: "string" }, enemyAr: { type: "string" }, enemyEn: { type: "string" }, bossAr: { type: "string" }, bossEn: { type: "string" }, objectiveAr: { type: "string" }, objectiveEn: { type: "string" }, levelOneAr: { type: "string" }, levelOneEn: { type: "string" }, levelTwoAr: { type: "string" }, levelTwoEn: { type: "string" },
      }, required: ["titleAr", "titleEn", "storyAr", "storyEn", "heroAr", "heroEn", "enemyAr", "enemyEn", "bossAr", "bossEn", "objectiveAr", "objectiveEn", "levelOneAr", "levelOneEn", "levelTwoAr", "levelTwoEn"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string") return fallback;
    const parsed = narrativeSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : fallback;
  } catch (error) {
    console.warn("[App Builder game planner] Falling back to local narrative", error);
    return fallback;
  }
}
