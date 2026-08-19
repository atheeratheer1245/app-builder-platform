import type { TemplateCategory } from "./appBuilderCatalog";

export const baseComponentTypes = ["Card", "Button", "List", "Image", "Video", "Form"] as const;
export const ecommerceComponentTypes = ["SearchBar"] as const;
export const gameComponentTypes = ["GameScene", "Player", "Physics", "Score", "Level", "Condition"] as const;
export const builderComponentTypes = [...baseComponentTypes, ...ecommerceComponentTypes, ...gameComponentTypes] as const;

export type BuilderComponentType = (typeof builderComponentTypes)[number];
export type ComponentProperties = Record<string, unknown>;

export const componentTypeLabels: Record<BuilderComponentType, { ar: string; en: string }> = {
  Card: { ar: "بطاقة معلومات", en: "Information card" },
  Button: { ar: "زر مرتبط", en: "Linked button" },
  List: { ar: "قائمة تنقل", en: "Navigation list" },
  Image: { ar: "صورة من المعرض", en: "Gallery image" },
  Video: { ar: "فيديو من المعرض", en: "Gallery video" },
  Form: { ar: "نموذج جاهز", en: "Ready form" },
  SearchBar: { ar: "شريط بحث", en: "Search bar" },
  GameScene: { ar: "مشهد لعبة", en: "Game scene" },
  Player: { ar: "لاعب", en: "Player" },
  Physics: { ar: "فيزياء وحركة", en: "Physics & movement" },
  Score: { ar: "نقاط", en: "Score" },
  Level: { ar: "مستوى", en: "Level" },
  Condition: { ar: "شرط فوز أو خسارة", en: "Win / lose condition" },
};

const formFieldsByCategory: Record<TemplateCategory, Array<{ key: string; type: string; ar: string; en: string; required: boolean }>> = {
  ecommerce: [{ key: "name", type: "text", ar: "الاسم", en: "Name", required: true }, { key: "phone", type: "tel", ar: "رقم الجوال", en: "Phone", required: true }, { key: "note", type: "textarea", ar: "ملاحظات الطلب", en: "Order notes", required: false }],
  education: [{ key: "name", type: "text", ar: "اسم المتعلم", en: "Learner name", required: true }, { key: "email", type: "email", ar: "البريد الإلكتروني", en: "Email", required: true }, { key: "course", type: "select", ar: "المسار", en: "Learning path", required: true }],
  games: [{ key: "player", type: "text", ar: "اسم اللاعب", en: "Player name", required: true }, { key: "difficulty", type: "select", ar: "مستوى الصعوبة", en: "Difficulty", required: true }],
  music: [{ key: "name", type: "text", ar: "الاسم", en: "Name", required: true }, { key: "request", type: "textarea", ar: "طلب موسيقي", en: "Music request", required: false }],
  podcasts: [{ key: "name", type: "text", ar: "الاسم", en: "Name", required: true }, { key: "topic", type: "textarea", ar: "اقتراح حلقة", en: "Episode idea", required: true }],
  movies: [{ key: "name", type: "text", ar: "الاسم", en: "Name", required: true }, { key: "title", type: "text", ar: "العنوان المقترح", en: "Suggested title", required: true }],
  services: [{ key: "name", type: "text", ar: "الاسم", en: "Name", required: true }, { key: "service", type: "select", ar: "الخدمة", en: "Service", required: true }, { key: "appointment", type: "datetime-local", ar: "الموعد", en: "Appointment", required: true }],
};

export function getAllowedComponentTypes(category: TemplateCategory): BuilderComponentType[] {
  if (category === "ecommerce") return [...baseComponentTypes, ...ecommerceComponentTypes];
  if (category === "games") return [...baseComponentTypes, ...gameComponentTypes];
  return [...baseComponentTypes];
}

export function getDefaultComponentProperties(type: BuilderComponentType, category: TemplateCategory): ComponentProperties {
  if (type === "Card") return { titleAr: "عنوان البطاقة", titleEn: "Card title", descriptionAr: "وصف مختصر للمعلومة", descriptionEn: "A short information description", icon: "Sparkles", actionPageId: null };
  if (type === "Button") return { textAr: "متابعة", textEn: "Continue", targetPageId: null, variant: "primary" };
  if (type === "List") return { items: [] as Array<{ labelAr: string; labelEn: string; targetPageId: number | null }> };
  if (type === "Image") return { assetId: null, assetUrl: "", altAr: "وصف الصورة", altEn: "Image description" };
  if (type === "Video") return { assetId: null, assetUrl: "", captionAr: "عنوان الفيديو", captionEn: "Video caption" };
  if (type === "Form") return { fields: formFieldsByCategory[category], submitLabelAr: "إرسال", submitLabelEn: "Submit" };
  if (type === "SearchBar") return { placeholderAr: "ابحث في المنتجات", placeholderEn: "Search products", emptyAr: "لا توجد منتجات مطابقة للبحث", emptyEn: "No products match your search" };
  if (type === "GameScene") return { sceneNameAr: "المشهد الأول", sceneNameEn: "First scene", backgroundAssetId: null, durationSeconds: 90 };
  if (type === "Player") return { spriteAssetId: null, speed: 6, jumpForce: 12, lives: 3 };
  if (type === "Physics") return { gravity: 1, collisions: true, boundaryMode: "screen" };
  if (type === "Score") return { startScore: 0, pointsPerCollectible: 10, showLeaderboard: true };
  if (type === "Level") return { levelNumber: 1, targetScore: 100, timeLimitSeconds: 90 };
  return { condition: "score_at_least", targetValue: 100, successPageId: null, failurePageId: null };
}
