import type { TemplateCategory } from "./appBuilderCatalog";

export const baseComponentTypes = ["Card", "Button", "List", "Image", "Video", "Audio", "PaymentPlatform"] as const;
export const ecommerceComponentTypes = ["Product", "SearchBar"] as const;
export const booksComponentTypes = ["PDFDocument", "SearchBar"] as const;
/** Legacy-only type retained to read old saved projects. It is never returned to the editor picker. */
const legacyComponentTypes = ["Form"] as const;
export const searchableComponentCategories = ["ecommerce", "music", "podcasts", "movies", "books"] as const;
export const gameComponentTypes = ["GameScene", "Player", "ImageAnimation", "Platform", "Collectible", "Hazard", "FinishGate", "TouchControls", "Physics", "Score", "Level", "Condition"] as const;
export const builderComponentTypes = [...baseComponentTypes, ...ecommerceComponentTypes, ...booksComponentTypes, ...gameComponentTypes, ...legacyComponentTypes] as const;
export const gameModes = ["platformer", "endless_runner", "puzzle", "quiz", "memory_cards", "tower_defense", "simple_shooter", "racing", "light_simulation"] as const;
export type GameMode = (typeof gameModes)[number];
export const gameModeLabels: Record<GameMode, { ar: string; en: string }> = {
  platformer: { ar: "المنصات", en: "Platformer" },
  endless_runner: { ar: "الجري اللانهائي", en: "Endless runner" },
  puzzle: { ar: "الألغاز", en: "Puzzle" },
  quiz: { ar: "الأسئلة والاختبارات", en: "Quiz" },
  memory_cards: { ar: "الذاكرة والبطاقات", en: "Memory cards" },
  tower_defense: { ar: "الدفاع عن المسار", en: "Tower defense" },
  simple_shooter: { ar: "التصويب البسيط", en: "Simple shooter" },
  racing: { ar: "السباق المبسط", en: "Racing" },
  light_simulation: { ar: "المحاكاة الخفيفة", en: "Light simulation" },
};

export type BuilderComponentType = (typeof builderComponentTypes)[number];
export type ComponentProperties = Record<string, unknown>;

export const componentTypeLabels: Record<BuilderComponentType, { ar: string; en: string }> = {
  Card: { ar: "بطاقة معلومات", en: "Information card" },
  Button: { ar: "زر مرتبط", en: "Linked button" },
  List: { ar: "قائمة تنقل", en: "Navigation list" },
  Image: { ar: "صورة", en: "Image" },
  Video: { ar: "فيديو", en: "Video" },
  Audio: { ar: "مقطع صوتي", en: "Audio" },
  Form: { ar: "نموذج قديم", en: "Legacy form" },
  PaymentPlatform: { ar: "منصة دفع اختيارية", en: "Optional payment platform" },
  Product: { ar: "منتج", en: "Product" },
  SearchBar: { ar: "شريط بحث", en: "Search bar" },
  PDFDocument: { ar: "ملف PDF", en: "PDF document" },
  GameScene: { ar: "مشهد لعبة", en: "Game scene" },
  Player: { ar: "لاعب", en: "Player" },
  ImageAnimation: { ar: "مشغّل صور متحركة", en: "Image animation player" },
  Platform: { ar: "منصة أو أرض", en: "Platform or ground" },
  Collectible: { ar: "عنصر قابل للجمع", en: "Collectible" },
  Hazard: { ar: "عائق أو خطر", en: "Hazard" },
  FinishGate: { ar: "بوابة النهاية", en: "Finish gate" },
  TouchControls: { ar: "تحكم باللمس", en: "Touch controls" },
  Physics: { ar: "فيزياء وحركة", en: "Physics & movement" },
  Score: { ar: "نقاط", en: "Score" },
  Level: { ar: "مستوى", en: "Level" },
  Condition: { ar: "شرط فوز أو خسارة", en: "Win / lose condition" },
};

export function getAllowedComponentTypes(category: TemplateCategory): BuilderComponentType[] {
  if (category === "ecommerce") return [...baseComponentTypes, ...ecommerceComponentTypes];
  if (category === "books") return [...baseComponentTypes, ...booksComponentTypes];
  if ((searchableComponentCategories as readonly string[]).includes(category)) return [...baseComponentTypes, "SearchBar"];
  if (category === "games") return [...baseComponentTypes, ...gameComponentTypes];
  return [...baseComponentTypes];
}

export function getDefaultComponentProperties(type: BuilderComponentType, category: TemplateCategory): ComponentProperties {
  if (type === "Card") return { titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "", icon: "Sparkles", actionPageId: null };
  if (type === "Button") return { textAr: "", textEn: "", targetPageId: null, variant: "primary" };
  if (type === "List") return { titleAr: "", titleEn: "", items: [] as Array<{ labelAr: string; labelEn: string; targetPageId: number | null }> };
  if (type === "Image") return { assetId: null, assetUrl: "", altAr: "", altEn: "" };
  if (type === "Video") return { assetId: null, assetUrl: "", captionAr: "", captionEn: "", autoplay: true };
  if (type === "Audio") return { assetId: null, assetUrl: "", captionAr: "", captionEn: "" };
  if (type === "PDFDocument") return { assetId: null, assetUrl: "", titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "", startPage: 1 };
  if (type === "Form") return { fields: [], submitLabelAr: "", submitLabelEn: "", contextPageId: null };
  if (type === "PaymentPlatform") return { mode: "product", provider: "moyasar", titleAr: "شراء الآن", titleEn: "Buy now", descriptionAr: "ادفع بأمان لإتمام الطلب", descriptionEn: "Pay securely to complete your order", amount: 0, currency: "SAR", billingCycle: "monthly", successPageId: null };
  if (type === "Product") return { nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", price: 0, salePrice: null, currency: "SAR", stock: 0, assetId: null, assetUrl: "" };
  if (type === "SearchBar") return { placeholderAr: category === "ecommerce" ? "ابحث في المنتجات" : "ابحث في المحتوى", placeholderEn: category === "ecommerce" ? "Search products" : "Search content", emptyAr: "لا توجد نتائج مطابقة للبحث", emptyEn: "No results match your search" };
  if (type === "GameScene") return { gameMode: "platformer", preset: "platformer", sceneNameAr: "", sceneNameEn: "", backgroundAssetId: null, durationSeconds: 90 };
  if (type === "Player") return { gameMode: "platformer", spriteAssetId: null, speed: 6, jumpForce: 12, lives: 3, startX: 8, startY: 64 };
  if (type === "ImageAnimation") return { gameMode: "platformer", assetId: null, assetUrl: "", target: "player", frameCount: 1, fps: 8, x: 12, y: 20, width: 18, height: 18, loop: true };
  if (type === "Platform") return { gameMode: "platformer", x: 8, y: 78, width: 84, height: 10, moving: false };
  if (type === "Collectible") return { gameMode: "platformer", x: 48, y: 58, amount: 3, value: 10, assetId: null, assetUrl: "" };
  if (type === "Hazard") return { gameMode: "platformer", x: 70, y: 70, width: 10, height: 8, damage: 1 };
  if (type === "FinishGate") return { gameMode: "platformer", x: 88, y: 58, requiredScore: 30, successPageId: null };
  if (type === "TouchControls") return { gameMode: "platformer", showDirections: true, showJump: true, showAction: false, position: "bottom" };
  if (type === "Physics") return { gameMode: "platformer", gravity: 1, collisions: true, boundaryMode: "screen" };
  if (type === "Score") return { gameMode: "platformer", startScore: 0, pointsPerCollectible: 10, showLeaderboard: true };
  if (type === "Level") return { gameMode: "platformer", levelNumber: 1, targetScore: 100, timeLimitSeconds: 90 };
  return { gameMode: "platformer", condition: "score_at_least", targetValue: 100, successPageId: null, failurePageId: null };
}
