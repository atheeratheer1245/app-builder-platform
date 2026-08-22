import type { BuilderComponentType, GameMode } from "./componentCatalog";
import { fallbackGameNarrative, type GameNarrativePlan } from "./gameNarrative";

export const generatedGameModes = [
  "platformer",
  "endless_runner",
  "puzzle",
  "quiz",
  "memory_cards",
  "tower_defense",
  "simple_shooter",
  "racing",
] as const satisfies readonly GameMode[];

export type GeneratedGameMode = (typeof generatedGameModes)[number];

export type GeneratedGameComponent = {
  componentType: BuilderComponentType;
  labelAr: string;
  labelEn: string;
  properties: Record<string, unknown>;
};

export type GameGeneratorAsset = {
  id: number;
  url: string;
  filename: string;
};

export type GameGeneratorInput = {
  brief?: string;
  /** Kept for projects generated before role-specific image selection was introduced. */
  image?: GameGeneratorAsset | null;
  playerImage?: GameGeneratorAsset | null;
  playerImages?: GameGeneratorAsset[];
  enemyImage?: GameGeneratorAsset | null;
  enemyImages?: GameGeneratorAsset[];
  bossImage?: GameGeneratorAsset | null;
  bossImages?: GameGeneratorAsset[];
  stageImage?: GameGeneratorAsset | null;
  stageImages?: GameGeneratorAsset[];
  backgroundImages?: GameGeneratorAsset[];
  video?: GameGeneratorAsset | null;
  audio?: GameGeneratorAsset | null;
};

export type GameGeneratorPreset = {
  mode: GeneratedGameMode;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  rulesAr: string;
  rulesEn: string;
  components: GeneratedGameComponent[];
};

type ModeTuning = {
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  rulesAr: string;
  rulesEn: string;
  playerLabelAr: string;
  playerLabelEn: string;
  player: Record<string, unknown>;
  board: Record<string, unknown>;
  collectible: Record<string, unknown>;
  hazard: Record<string, unknown>;
  finish: Record<string, unknown>;
  controls: Record<string, unknown>;
  physics: Record<string, unknown>;
  score: Record<string, unknown>;
  level: Record<string, unknown>;
  condition: Record<string, unknown>;
};

function compactBrief(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ").slice(0, 1200) ?? "";
}

function multimediaComponents(mode: GeneratedGameMode, input: GameGeneratorInput): GeneratedGameComponent[] {
  const brief = compactBrief(input.brief);
  const stageImage = input.stageImages?.[0] ?? input.stageImage ?? input.image ?? input.playerImages?.[0] ?? input.playerImage ?? null;
  const backgroundImages = input.backgroundImages?.length ? input.backgroundImages : stageImage ? [stageImage] : [];
  const background = input.video
    ? { mediaType: "video", assetId: input.video.id, assetUrl: input.video.url, sourceFilename: input.video.filename }
    : backgroundImages[0]
      ? { mediaType: "image", assetId: backgroundImages[0].id, assetUrl: backgroundImages[0].url, sourceFilename: backgroundImages[0].filename, backgroundAssetIds: backgroundImages.map(asset => asset.id), backgroundAssetUrls: backgroundImages.map(asset => asset.url) }
      : input.audio
        ? { mediaType: "audio", assetId: input.audio.id, assetUrl: input.audio.url, sourceFilename: input.audio.filename }
        : null;
  const components: GeneratedGameComponent[] = [];
  if (background) components.push({ componentType: "Background", labelAr: "خلفية اللعبة", labelEn: "Game background", properties: { gameMode: mode, generatedBy: "game-generator", generatorBrief: brief, layer: 0, overlayOpacity: 0.38, ...background } });
  if (input.audio) components.push({ componentType: "Audio", labelAr: "صوت اللعبة", labelEn: "Game audio", properties: { gameMode: mode, generatedBy: "game-generator", assetId: input.audio.id, assetUrl: input.audio.url, captionAr: "الموسيقى أو المؤثرات التي أضفتها للعبة", captionEn: "Music or sound effects added to this game", autoplay: true, loop: true, layer: 95 } });
  return components;
}

const baseComponents = (mode: GeneratedGameMode, tuning: ModeTuning, input: GameGeneratorInput = {}): GeneratedGameComponent[] => {
  const brief = compactBrief(input.brief);
  const media = {
    generatorBrief: brief,
    imageAssetId: input.image?.id ?? null,
    imageAssetUrl: input.image?.url ?? "",
    videoAssetId: input.video?.id ?? null,
    videoAssetUrl: input.video?.url ?? "",
    audioAssetId: input.audio?.id ?? null,
    audioAssetUrl: input.audio?.url ?? "",
  };
  return [
  {
    componentType: "GameScene",
    labelAr: tuning.titleAr,
    labelEn: tuning.titleEn,
    properties: {
      gameMode: mode,
      preset: mode,
      generatorVersion: 2,
      generatedBy: "game-generator",
      sceneNameAr: tuning.titleAr,
      sceneNameEn: tuning.titleEn,
      generatorSummaryAr: tuning.summaryAr,
      generatorSummaryEn: tuning.summaryEn,
      rulesAr: tuning.rulesAr,
      rulesEn: tuning.rulesEn,
      ...media,
      ...tuning.board,
    },
  },
  ...multimediaComponents(mode, input),
  { componentType: "Player", labelAr: tuning.playerLabelAr, labelEn: tuning.playerLabelEn, properties: { gameMode: mode, generatedBy: "game-generator", imageAssetId: input.image?.id ?? null, imageAssetUrl: input.image?.url ?? "", videoAssetId: input.video?.id ?? null, videoAssetUrl: input.video?.url ?? "", audioAssetId: input.audio?.id ?? null, audioAssetUrl: input.audio?.url ?? "", ...tuning.player } },
  { componentType: "Platform", labelAr: "ساحة اللعب", labelEn: "Play field", properties: { gameMode: mode, generatedBy: "game-generator", ...tuning.board } },
  { componentType: "Collectible", labelAr: "الهدف أو المكافأة", labelEn: "Goal or reward", properties: { gameMode: mode, generatedBy: "game-generator", ...tuning.collectible } },
  { componentType: "Hazard", labelAr: "التحدي أو الخصم", labelEn: "Challenge or opponent", properties: { gameMode: mode, generatedBy: "game-generator", ...tuning.hazard } },
  { componentType: "FinishGate", labelAr: "شرط الإنهاء", labelEn: "Finish condition", properties: { gameMode: mode, generatedBy: "game-generator", ...tuning.finish } },
  { componentType: "TouchControls", labelAr: "تحكم اللاعب", labelEn: "Player controls", properties: { gameMode: mode, generatedBy: "game-generator", ...tuning.controls } },
  { componentType: "Physics", labelAr: "الحركة والقواعد", labelEn: "Movement and rules", properties: { gameMode: mode, generatedBy: "game-generator", ...tuning.physics } },
  { componentType: "Score", labelAr: "النقاط", labelEn: "Score", properties: { gameMode: mode, generatedBy: "game-generator", ...tuning.score } },
  { componentType: "Level", labelAr: "المستوى الأول", labelEn: "Level one", properties: { gameMode: mode, generatedBy: "game-generator", ...tuning.level } },
  { componentType: "Condition", labelAr: "فوز أو خسارة", labelEn: "Win or lose", properties: { gameMode: mode, generatedBy: "game-generator", ...tuning.condition } },
];
};

const tuning: Record<GeneratedGameMode, ModeTuning> = {
  platformer: {
    titleAr: "مغامرة المنصات", titleEn: "Platform adventure",
    summaryAr: "اقفز بين المنصات واجمع المكافآت حتى تصل إلى البوابة.", summaryEn: "Jump across platforms, collect rewards, and reach the gate.",
    rulesAr: "قفز، جاذبية، سقوط، جمع، وصول إلى النهاية.", rulesEn: "Jumping, gravity, falling, collecting, and reaching the finish.",
    playerLabelAr: "لاعب قافز", playerLabelEn: "Jumping player",
    player: { speed: 6, jumpForce: 12, lives: 3, startX: 8, startY: 64, controlStyle: "jump", layer: 30 },
    board: { x: 8, y: 78, width: 84, height: 10, layout: "platforms", progressionMode: "linear", durationSeconds: 90, showHud: true, layer: 10 },
    collectible: { x: 30, y: 58, amount: 4, value: 10, objective: "collect_coins", layer: 20 },
    hazard: { x: 68, y: 70, width: 10, height: 8, damage: 1, behavior: "side_obstacle", layer: 21 },
    finish: { x: 88, y: 58, requiredScore: 40, completionRule: "reach_gate", layer: 25 },
    controls: { showDirections: true, showJump: true, showAction: false, controlStyle: "jump", layer: 90 },
    physics: { gravity: 1, collisions: true, boundaryMode: "screen", movementRule: "jump_and_fall", layer: 2 },
    score: { startScore: 0, pointsPerCollectible: 10, showLeaderboard: true, layer: 80 },
    level: { levelNumber: 1, targetScore: 40, timeLimitSeconds: 90, objective: "reach_finish", layer: 80 },
    condition: { condition: "reach_gate", targetValue: 40, successPageId: null, failurePageId: null, layer: 80 },
  },
  endless_runner: {
    titleAr: "الجري اللانهائي", titleEn: "Endless runner",
    summaryAr: "تحرك تلقائيًا، بدّل المسار أو اقفز، وتجنب العوائق لتحقق مسافة أكبر.", summaryEn: "Move automatically, switch lanes or jump, and avoid obstacles for a longer run.",
    rulesAr: "حركة تلقائية، قفز أو انزلاق، سرعة متزايدة، مكافآت.", rulesEn: "Auto-run, jump or slide, increasing speed, and rewards.",
    playerLabelAr: "العدّاء", playerLabelEn: "Runner",
    player: { speed: 8, jumpForce: 10, lives: 1, startX: 18, startY: 64, controlStyle: "lane_jump", autoMove: true, layer: 30 },
    board: { x: 0, y: 72, width: 100, height: 16, layout: "moving_track", progressionMode: "endless", durationSeconds: 120, showHud: true, layer: 10 },
    collectible: { x: 42, y: 55, amount: 5, value: 5, objective: "collect_boosts", layer: 20 },
    hazard: { x: 68, y: 68, width: 8, height: 10, damage: 1, behavior: "approach_player", layer: 21 },
    finish: { x: 92, y: 58, requiredScore: 100, completionRule: "distance_or_score", layer: 25 },
    controls: { showDirections: true, showJump: true, showAction: true, controlStyle: "lane_jump", layer: 90 },
    physics: { gravity: 1, collisions: true, boundaryMode: "lanes", movementRule: "auto_run", layer: 2 },
    score: { startScore: 0, pointsPerCollectible: 5, showLeaderboard: true, layer: 80 },
    level: { levelNumber: 1, targetScore: 100, timeLimitSeconds: 120, objective: "survive_run", layer: 80 },
    condition: { condition: "score_at_least", targetValue: 100, successPageId: null, failurePageId: null, layer: 80 },
  },
  puzzle: {
    titleAr: "تحدي الألغاز", titleEn: "Puzzle challenge",
    summaryAr: "رتّب القطع أو اسحبها إلى الشبكة حتى يتحقق شكل الهدف.", summaryEn: "Arrange or drag pieces into the grid until the target shape is complete.",
    rulesAr: "شبكة، قطع، مطابقة أو سحب وإفلات، عداد حركات.", rulesEn: "Grid, pieces, match or drag-and-drop, and a move counter.",
    playerLabelAr: "مؤشر الحل", playerLabelEn: "Puzzle cursor",
    player: { speed: 4, jumpForce: 0, lives: 3, startX: 50, startY: 50, controlStyle: "select_drag", layer: 30 },
    board: { x: 12, y: 18, width: 76, height: 64, layout: "grid", gridColumns: 4, progressionMode: "linear", durationSeconds: 180, showHud: true, layer: 10 },
    collectible: { x: 28, y: 40, amount: 6, value: 10, objective: "place_piece", layer: 20 },
    hazard: { x: 66, y: 42, width: 10, height: 10, damage: 1, behavior: "wrong_placement", layer: 21 },
    finish: { x: 84, y: 18, requiredScore: 60, completionRule: "solve_grid", layer: 25 },
    controls: { showDirections: true, showJump: false, showAction: true, controlStyle: "select_drag", layer: 90 },
    physics: { gravity: 0, collisions: false, boundaryMode: "grid", movementRule: "drag_drop", layer: 2 },
    score: { startScore: 0, pointsPerCollectible: 10, showLeaderboard: false, layer: 80 },
    level: { levelNumber: 1, targetScore: 60, timeLimitSeconds: 180, objective: "complete_puzzle", layer: 80 },
    condition: { condition: "score_at_least", targetValue: 60, successPageId: null, failurePageId: null, layer: 80 },
  },
  quiz: {
    titleAr: "مسابقة الأسئلة", titleEn: "Quiz challenge",
    summaryAr: "أجب عن سلسلة أسئلة قبل انتهاء الوقت لتحقق النقاط والمستوى.", summaryEn: "Answer a sequence of questions before time runs out to earn points and level up.",
    rulesAr: "سؤال، إجابات، صحيحة أو خاطئة، سلسلة إجابات ووقت محدود.", rulesEn: "Questions, answers, correct or wrong choices, streaks, and a time limit.",
    playerLabelAr: "المتسابق", playerLabelEn: "Contestant",
    player: { speed: 3, jumpForce: 0, lives: 3, startX: 50, startY: 64, controlStyle: "choose_answer", layer: 30 },
    board: { x: 8, y: 16, width: 84, height: 66, layout: "question_cards", questionCount: 8, progressionMode: "linear", durationSeconds: 120, showHud: true, layer: 10 },
    collectible: { x: 42, y: 42, amount: 8, value: 10, objective: "correct_answer", layer: 20 },
    hazard: { x: 64, y: 56, width: 12, height: 8, damage: 1, behavior: "wrong_answer", layer: 21 },
    finish: { x: 86, y: 18, requiredScore: 50, completionRule: "answer_series", layer: 25 },
    controls: { showDirections: false, showJump: false, showAction: true, controlStyle: "choose_answer", layer: 90 },
    physics: { gravity: 0, collisions: false, boundaryMode: "screen", movementRule: "answer_selection", layer: 2 },
    score: { startScore: 0, pointsPerCollectible: 10, showLeaderboard: true, layer: 80 },
    level: { levelNumber: 1, targetScore: 50, timeLimitSeconds: 120, objective: "quiz_score", layer: 80 },
    condition: { condition: "score_at_least", targetValue: 50, successPageId: null, failurePageId: null, layer: 80 },
  },
  memory_cards: {
    titleAr: "بطاقات الذاكرة", titleEn: "Memory cards",
    summaryAr: "اكشف بطاقتين في كل مرة وطابق الأزواج قبل انتهاء الجولة.", summaryEn: "Reveal two cards at a time and match pairs before the round ends.",
    rulesAr: "قلب بطاقتين، مطابقة، حفظ الحالة، إنهاء الجولة.", rulesEn: "Flip two cards, match pairs, retain state, and complete the round.",
    playerLabelAr: "مؤشر البطاقات", playerLabelEn: "Card selector",
    player: { speed: 3, jumpForce: 0, lives: 4, startX: 50, startY: 50, controlStyle: "flip_cards", layer: 30 },
    board: { x: 12, y: 16, width: 76, height: 68, layout: "card_grid", gridColumns: 4, pairs: 6, progressionMode: "linear", durationSeconds: 150, showHud: true, layer: 10 },
    collectible: { x: 26, y: 36, amount: 6, value: 10, objective: "match_pair", layer: 20 },
    hazard: { x: 68, y: 50, width: 10, height: 10, damage: 1, behavior: "mismatch", layer: 21 },
    finish: { x: 86, y: 18, requiredScore: 60, completionRule: "match_all_pairs", layer: 25 },
    controls: { showDirections: true, showJump: false, showAction: true, controlStyle: "flip_cards", layer: 90 },
    physics: { gravity: 0, collisions: false, boundaryMode: "grid", movementRule: "card_selection", layer: 2 },
    score: { startScore: 0, pointsPerCollectible: 10, showLeaderboard: false, layer: 80 },
    level: { levelNumber: 1, targetScore: 60, timeLimitSeconds: 150, objective: "match_pairs", layer: 80 },
    condition: { condition: "score_at_least", targetValue: 60, successPageId: null, failurePageId: null, layer: 80 },
  },
  tower_defense: {
    titleAr: "الدفاع عن المسار", titleEn: "Tower defense",
    summaryAr: "ابنِ دفاعات على المسار، أوقف موجات الخصوم، واحمِ القاعدة.", summaryEn: "Place defenses along the path, stop enemy waves, and protect the base.",
    rulesAr: "مسار، أبراج، خصوم، عملة، موجات، وصحة للقاعدة.", rulesEn: "Path, towers, enemies, currency, waves, and base health.",
    playerLabelAr: "مدير الدفاع", playerLabelEn: "Defense commander",
    player: { speed: 3, jumpForce: 0, lives: 10, startX: 12, startY: 70, controlStyle: "place_tower", layer: 30 },
    board: { x: 4, y: 18, width: 92, height: 66, layout: "defense_path", waves: 3, progressionMode: "linear", durationSeconds: 180, showHud: true, layer: 10 },
    collectible: { x: 28, y: 48, amount: 4, value: 20, objective: "earn_currency", layer: 20 },
    hazard: { x: 68, y: 48, width: 10, height: 10, damage: 1, behavior: "enemy_wave", layer: 21 },
    finish: { x: 88, y: 58, requiredScore: 80, completionRule: "survive_waves", layer: 25 },
    controls: { showDirections: true, showJump: false, showAction: true, controlStyle: "place_tower", layer: 90 },
    physics: { gravity: 0, collisions: true, boundaryMode: "path", movementRule: "wave_defense", layer: 2 },
    score: { startScore: 40, pointsPerCollectible: 20, showLeaderboard: true, layer: 80 },
    level: { levelNumber: 1, targetScore: 80, timeLimitSeconds: 180, objective: "defend_base", layer: 80 },
    condition: { condition: "score_at_least", targetValue: 80, successPageId: null, failurePageId: null, layer: 80 },
  },
  simple_shooter: {
    titleAr: "التصويب السريع", titleEn: "Quick shooter",
    summaryAr: "صوّب نحو الأهداف المتحركة وتجنب الضربات حتى تحقق النتيجة المطلوبة.", summaryEn: "Aim at moving targets and avoid hits until you reach the required score.",
    rulesAr: "إطلاق، إصابة، نقاط، صحة، وإعادة ظهور للأهداف.", rulesEn: "Shoot, hit, score, health, and target respawns.",
    playerLabelAr: "المصوّب", playerLabelEn: "Shooter",
    player: { speed: 6, jumpForce: 0, lives: 3, startX: 12, startY: 64, controlStyle: "aim_fire", layer: 30 },
    board: { x: 0, y: 12, width: 100, height: 76, layout: "shooting_range", progressionMode: "linear", durationSeconds: 90, showHud: true, layer: 10 },
    collectible: { x: 44, y: 42, amount: 5, value: 15, objective: "hit_target", layer: 20 },
    hazard: { x: 70, y: 52, width: 9, height: 9, damage: 1, behavior: "enemy_fire", layer: 21 },
    finish: { x: 88, y: 18, requiredScore: 75, completionRule: "hit_quota", layer: 25 },
    controls: { showDirections: true, showJump: false, showAction: true, controlStyle: "aim_fire", layer: 90 },
    physics: { gravity: 0, collisions: true, boundaryMode: "screen", movementRule: "projectiles", layer: 2 },
    score: { startScore: 0, pointsPerCollectible: 15, showLeaderboard: true, layer: 80 },
    level: { levelNumber: 1, targetScore: 75, timeLimitSeconds: 90, objective: "hit_targets", layer: 80 },
    condition: { condition: "score_at_least", targetValue: 75, successPageId: null, failurePageId: null, layer: 80 },
  },
  racing: {
    titleAr: "سباق المسار", titleEn: "Track racing",
    summaryAr: "قد المركبة على المسار، اجتز نقاط التحقق، واصل إلى خط النهاية قبل الوقت.", summaryEn: "Drive on the track, pass checkpoints, and reach the finish before time runs out.",
    rulesAr: "تسارع، توجيه، لفة، وقت، نقاط تحقق ومنافس اختياري.", rulesEn: "Acceleration, steering, lap, time, checkpoints, and an optional rival.",
    playerLabelAr: "المركبة", playerLabelEn: "Vehicle",
    player: { speed: 9, jumpForce: 0, lives: 3, startX: 10, startY: 68, controlStyle: "steer_accelerate", layer: 30 },
    board: { x: 2, y: 14, width: 96, height: 72, layout: "race_track", checkpoints: 3, progressionMode: "linear", durationSeconds: 120, showHud: true, layer: 10 },
    collectible: { x: 34, y: 48, amount: 3, value: 10, objective: "pass_checkpoint", layer: 20 },
    hazard: { x: 64, y: 58, width: 10, height: 8, damage: 1, behavior: "track_obstacle", layer: 21 },
    finish: { x: 88, y: 34, requiredScore: 30, completionRule: "finish_race", layer: 25 },
    controls: { showDirections: true, showJump: false, showAction: true, controlStyle: "steer_accelerate", layer: 90 },
    physics: { gravity: 0, collisions: true, boundaryMode: "track", movementRule: "vehicle", layer: 2 },
    score: { startScore: 0, pointsPerCollectible: 10, showLeaderboard: true, layer: 80 },
    level: { levelNumber: 1, targetScore: 30, timeLimitSeconds: 120, objective: "finish_race", layer: 80 },
    condition: { condition: "reach_gate", targetValue: 30, successPageId: null, failurePageId: null, layer: 80 },
  },
};

export const gameGeneratorPresets: Record<GeneratedGameMode, GameGeneratorPreset> = Object.fromEntries(
  generatedGameModes.map(mode => {
    const configuration = tuning[mode];
    return [mode, {
      mode,
      titleAr: configuration.titleAr,
      titleEn: configuration.titleEn,
      summaryAr: configuration.summaryAr,
      summaryEn: configuration.summaryEn,
      rulesAr: configuration.rulesAr,
      rulesEn: configuration.rulesEn,
      components: baseComponents(mode, configuration),
    }];
  }),
) as Record<GeneratedGameMode, GameGeneratorPreset>;

export function getGameGeneratorPreset(mode: GeneratedGameMode, input: GameGeneratorInput = {}) {
  const base = gameGeneratorPresets[mode];
  if (!input.brief?.trim() && !input.image && !input.video && !input.audio) return base;
  return { ...base, components: baseComponents(mode, tuning[mode], input) };
}

export type GeneratedGamePage = {
  key: string;
  titleAr: string;
  titleEn: string;
  route: string;
  components: GeneratedGameComponent[];
};

export type DescribedGameProject = {
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  pages: GeneratedGamePage[];
};

function descriptionTitle(brief: string, language: "ar" | "en") {
  const cleaned = compactBrief(brief);
  if (!cleaned) return language === "ar" ? "مغامرة جديدة" : "New adventure";
  const words = cleaned.split(" ").slice(0, 7).join(" ");
  return language === "ar" ? `مغامرة: ${words}` : `Adventure: ${words}`;
}

function copyComponents(components: GeneratedGameComponent[]) {
  return components.map(component => ({ ...component, properties: JSON.parse(JSON.stringify(component.properties)) as Record<string, unknown> }));
}

function levelComponents(input: GameGeneratorInput, levelNumber: number, levelTitleAr: string, levelTitleEn: string, nextPageKey: string): GeneratedGameComponent[] {
  const stageImages = input.stageImages?.length ? input.stageImages : [input.stageImage ?? input.image ?? input.playerImages?.[0] ?? input.playerImage].filter((asset): asset is GameGeneratorAsset => Boolean(asset));
  const playerImages = input.playerImages?.length ? input.playerImages : [input.playerImage ?? input.image ?? stageImages[0]].filter((asset): asset is GameGeneratorAsset => Boolean(asset));
  const enemyImages = input.enemyImages?.length ? input.enemyImages : [input.enemyImage ?? input.image ?? playerImages[0]].filter((asset): asset is GameGeneratorAsset => Boolean(asset));
  const bossImages = input.bossImages?.length ? input.bossImages : [input.bossImage ?? input.enemyImage ?? input.image ?? playerImages[0]].filter((asset): asset is GameGeneratorAsset => Boolean(asset));
  const stageImage = stageImages[0] ?? null;
  const playerImage = playerImages[0] ?? stageImage;
  const opponentImages = levelNumber === 1 ? enemyImages : bossImages;
  const opponentImage = opponentImages[0] ?? playerImage;
  const components = copyComponents(getGameGeneratorPreset("platformer", { ...input, image: stageImage ?? playerImage }).components);
  const levelTarget = 40 + levelNumber * 20;
  for (const component of components) {
    component.properties = {
      ...component.properties,
      generatorVersion: 3,
      generatorStyle: "description-led",
      generatorBrief: compactBrief(input.brief),
    };
    if (component.componentType === "GameScene") component.properties = { ...component.properties, sceneNameAr: levelTitleAr, sceneNameEn: levelTitleEn, gameMode: "custom", preset: "custom" };
    if (component.componentType === "Player" && playerImage) component.properties = { ...component.properties, imageAssetId: playerImage.id, imageAssetUrl: playerImage.url, sourceFilename: playerImage.filename };
    if (component.componentType === "Level") component.properties = { ...component.properties, levelNumber, targetScore: levelTarget, objective: "complete_story_level" };
    if (component.componentType === "Score") component.properties = { ...component.properties, pointsPerCollectible: 10 + levelNumber * 5 };
    if (component.componentType === "Condition") component.properties = { ...component.properties, successPageKey: nextPageKey, targetValue: levelTarget, condition: "reach_goal" };
    if (component.componentType === "FinishGate") component.properties = { ...component.properties, requiredScore: levelTarget, objective: "complete_level" };
    if (component.componentType === "Hazard") {
      component.labelAr = levelNumber === 1 ? "وحش المرحلة" : "زعيم المرحلة";
      component.labelEn = levelNumber === 1 ? "Level creature" : "Level boss";
      component.properties = { ...component.properties, role: levelNumber === 1 ? "enemy" : "boss", nameAr: component.labelAr, nameEn: component.labelEn, assetId: opponentImage?.id ?? null, assetUrl: opponentImage?.url ?? "", amount: levelNumber + 1 };
    }
  }
  playerImages.forEach((asset, index) => components.push({ componentType: "ImageAnimation", labelAr: index === 0 ? "حركة البطل" : `حركة شخصية ${index + 1}`, labelEn: index === 0 ? "Hero animation" : `Character animation ${index + 1}`, properties: { generatedBy: "game-generator", generatorVersion: 5, assetId: asset.id, assetUrl: asset.url, target: index === 0 ? "player" : "character", motionStyle: index % 2 ? "drift" : "bob", motionPrompt: "حركة شخصية متقدمة ومستمرة", frameCount: 1, fps: 10, x: 12 + index * 17, y: 58 - (index % 2) * 13, width: 16, height: 20, loop: true, layer: 40 + index } }));
  opponentImages.forEach((asset, index) => components.push({ componentType: "ImageAnimation", labelAr: levelNumber === 1 ? `حركة وحش ${index + 1}` : `حركة زعيم ${index + 1}`, labelEn: levelNumber === 1 ? `Creature animation ${index + 1}` : `Boss animation ${index + 1}`, properties: { generatedBy: "game-generator", generatorVersion: 5, assetId: asset.id, assetUrl: asset.url, target: levelNumber === 1 ? "enemy" : "boss", motionStyle: levelNumber === 1 ? (index % 2 ? "drift" : "shake") : (index % 2 ? "shake" : "pulse"), motionPrompt: levelNumber === 1 ? "حركة وحش متربص" : "حركة زعيم قوية", frameCount: 1, fps: 8, x: 64 + (index % 2) * 16, y: 52 - Math.floor(index / 2) * 15, width: 18, height: 22, loop: true, layer: 45 + index } }));
  stageImages.forEach((asset, index) => components.push({ componentType: "ImageAnimation", labelAr: `حركة المرحلة ${index + 1}`, labelEn: `Stage animation ${index + 1}`, properties: { generatedBy: "game-generator", generatorVersion: 5, assetId: asset.id, assetUrl: asset.url, target: "stage", motionStyle: "drift", motionPrompt: "حركة بيئية هادئة للمشهد", frameCount: 1, fps: 6, x: (index % 2) * 48, y: Math.floor(index / 2) * 22, width: 52, height: 28, loop: true, layer: 5 + index } }));
  return components;
}

/** Builds an editable game journey from a natural-language brief; no visible genre picker is required. */
export function getDescribedGameProject(input: GameGeneratorInput & { narrative?: GameNarrativePlan } = {}): DescribedGameProject {
  const narrative = input.narrative ?? fallbackGameNarrative(input.brief ?? "");
  const titleAr = narrative.titleAr || descriptionTitle(input.brief ?? "", "ar");
  const titleEn = narrative.titleEn || descriptionTitle(input.brief ?? "", "en");
  const sharedMedia = multimediaComponents("platformer", input).map(component => ({ ...component, properties: { ...component.properties, generatorVersion: 3, generatorStyle: "description-led" } }));
  const startComponents: GeneratedGameComponent[] = [
    ...sharedMedia,
    { componentType: "Card", labelAr: "قصة اللعبة", labelEn: "Game story", properties: { generatedBy: "game-generator", generatorVersion: 3, titleAr, titleEn, descriptionAr: narrative.storyAr, descriptionEn: narrative.storyEn, actionPageKey: "game-tutorial" } },
    { componentType: "Button", labelAr: "ابدأ اللعبة", labelEn: "Start game", properties: { generatedBy: "game-generator", generatorVersion: 3, textAr: "ابدأ اللعبة", textEn: "Start game", targetPageKey: "game-tutorial", variant: "primary" } },
  ];
  const tutorialComponents: GeneratedGameComponent[] = [
    ...sharedMedia,
    { componentType: "Card", labelAr: "كيفية اللعب", labelEn: "How to play", properties: { generatedBy: "game-generator", generatorVersion: 3, titleAr: "كيف تلعب", titleEn: "How to play", descriptionAr: `${narrative.objectiveAr}. جميع العناصر والقواعد قابلة للتحرير.`, descriptionEn: `${narrative.objectiveEn}. Every rule and element is editable.` } },
    { componentType: "Button", labelAr: "دخول المرحلة الأولى", labelEn: "Enter level one", properties: { generatedBy: "game-generator", generatorVersion: 3, textAr: "دخول المرحلة الأولى", textEn: "Enter level one", targetPageKey: "game-level-one", variant: "primary" } },
  ];
  const victoryComponents: GeneratedGameComponent[] = [
    ...sharedMedia,
    { componentType: "Card", labelAr: "اكتملت المغامرة", labelEn: "Adventure complete", properties: { generatedBy: "game-generator", generatorVersion: 3, titleAr: "أحسنت! اكتملت المغامرة", titleEn: "Great work! Adventure complete", descriptionAr: "حرر هذه الشاشة لإضافة القصة التالية أو نقاط إضافية أو رابط إعادة اللعب.", descriptionEn: "Edit this screen to add the next story, bonus points, or a replay link." } },
    { componentType: "Button", labelAr: "أعد اللعب", labelEn: "Play again", properties: { generatedBy: "game-generator", generatorVersion: 3, textAr: "أعد اللعب", textEn: "Play again", targetPageKey: "game-start", variant: "primary" } },
  ];
  return {
    titleAr,
    titleEn,
    summaryAr: "لعبة متعددة الشاشات تشمل البداية والتعليم والمرحلتين والإنهاء، مع بطل ووحوش ورسوم حركة قابلة للتحرير.",
    summaryEn: "A multi-screen game with start, tutorial, two levels, completion, hero, creatures, and editable motion-ready visuals.",
    pages: [
      { key: "game-start", titleAr: "بدء اللعبة", titleEn: "Start game", route: "/game-start", components: startComponents },
      { key: "game-tutorial", titleAr: "كيفية اللعب", titleEn: "How to play", route: "/how-to-play", components: tutorialComponents },
      { key: "game-level-one", titleAr: narrative.levelOneAr, titleEn: narrative.levelOneEn, route: "/level-one", components: levelComponents(input, 1, narrative.levelOneAr, narrative.levelOneEn, "game-level-two").map(component => component.componentType === "Player" ? { ...component, labelAr: narrative.heroAr, labelEn: narrative.heroEn } : component.componentType === "Hazard" ? { ...component, labelAr: narrative.enemyAr, labelEn: narrative.enemyEn, properties: { ...component.properties, nameAr: narrative.enemyAr, nameEn: narrative.enemyEn } } : component) },
      { key: "game-level-two", titleAr: narrative.levelTwoAr, titleEn: narrative.levelTwoEn, route: "/boss-encounter", components: levelComponents(input, 2, narrative.levelTwoAr, narrative.levelTwoEn, "game-victory").map(component => component.componentType === "Player" ? { ...component, labelAr: narrative.heroAr, labelEn: narrative.heroEn } : component.componentType === "Hazard" ? { ...component, labelAr: narrative.bossAr, labelEn: narrative.bossEn, properties: { ...component.properties, nameAr: narrative.bossAr, nameEn: narrative.bossEn } } : component) },
      { key: "game-victory", titleAr: "نهاية المغامرة", titleEn: "Adventure complete", route: "/adventure-complete", components: victoryComponents },
    ],
  };
}
