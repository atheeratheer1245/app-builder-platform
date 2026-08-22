import { describe, expect, it } from "vitest";
import { gameVisualPrompt } from "./gameVisualGenerator";
import { fallbackGameNarrative } from "../shared/gameNarrative";

describe("generated game visuals", () => {
  it("creates role-specific, safe prompts for an editable player, enemy, boss, and stage asset set", () => {
    const narrative = fallbackGameNarrative("مغامرة في غابة مضيئة");
    for (const role of ["player", "enemy", "boss", "stage"] as const) {
      const prompt = gameVisualPrompt(role, "مغامرة في غابة مضيئة", narrative);
      expect(prompt).toContain("original, family-friendly 2D mobile game asset");
      expect(prompt).toContain("No text");
      expect(prompt).toContain("no copyrighted characters");
    }
    expect(gameVisualPrompt("stage", "فكرة", narrative)).toContain("no characters");
    expect(gameVisualPrompt("player", "فكرة", narrative)).toContain("single full-body character");
  });
});
