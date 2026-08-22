export type GameNarrativePlan = {
  titleAr: string;
  titleEn: string;
  storyAr: string;
  storyEn: string;
  heroAr: string;
  heroEn: string;
  enemyAr: string;
  enemyEn: string;
  bossAr: string;
  bossEn: string;
  objectiveAr: string;
  objectiveEn: string;
  levelOneAr: string;
  levelOneEn: string;
  levelTwoAr: string;
  levelTwoEn: string;
};

function briefWords(brief: string) {
  return brief.trim().replace(/\s+/g, " ").split(" ").filter(Boolean).slice(0, 7).join(" ");
}

export function fallbackGameNarrative(brief: string): GameNarrativePlan {
  const subject = briefWords(brief) || "مغامرة جديدة";
  return {
    titleAr: `مغامرة: ${subject}`,
    titleEn: `Adventure: ${subject}`,
    storyAr: brief.trim() || "انطلق في رحلة عبر مراحل متتابعة، واجمع المكافآت، وتغلب على الخصوم.",
    storyEn: brief.trim() || "Begin a journey through connected levels, collect rewards, and defeat opponents.",
    heroAr: "البطل", heroEn: "Hero", enemyAr: "وحش المرحلة", enemyEn: "Level creature", bossAr: "زعيم النهاية", bossEn: "Final boss",
    objectiveAr: "اجمع المكافآت وأكمل المرحلة", objectiveEn: "Collect rewards and complete the level",
    levelOneAr: "المرحلة الأولى", levelOneEn: "Level one", levelTwoAr: "مواجهة الزعيم", levelTwoEn: "Boss encounter",
  };
}
