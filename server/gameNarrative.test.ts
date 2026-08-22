import { describe, expect, it } from "vitest";
import { fallbackGameNarrative } from "../shared/gameNarrative";

describe("game narrative fallback", () => {
  it("returns complete bilingual editable defaults when an AI planner response is unavailable", () => {
    const narrative = fallbackGameNarrative("مغامرة في غابة مضيئة");
    expect(narrative).toMatchObject({ heroAr: "البطل", enemyEn: "Level creature", bossAr: "زعيم النهاية" });
    expect(narrative.titleAr).toContain("مغامرة في غابة مضيئة");
    expect(narrative.objectiveAr).toBeTruthy();
    expect(narrative.levelTwoEn).toBeTruthy();
  });
});
