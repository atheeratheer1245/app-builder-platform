import type { BuilderComponentType, GameMode } from "./componentCatalog";

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
  image?: GameGeneratorAsset | null;
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
  const background = input.video
    ? { mediaType: "video", assetId: input.video.id, assetUrl: input.video.url, sourceFilename: input.video.filename }
    : input.image
      ? { mediaType: "image", assetId: input.image.id, assetUrl: input.image.url, sourceFilename: input.image.filename }
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
  { componentType: "Player", labelAr: tuning.playerLabelAr, labelEn: tuning.playerLabelEn, properties: { gameMode: mode, generatedBy: "game-generator", imageAssetId: input.image?.id ?? null, imageAssetUrl: input.image?.url ?? "", videoAssetId: input.video?.id ?? null, videoAssetUrl: input.video?.url ?? "", ...tuning.player } },
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
