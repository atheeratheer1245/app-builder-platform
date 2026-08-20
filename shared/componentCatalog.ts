import type { TemplateCategory } from "./appBuilderCatalog";

export const baseComponentTypes = ["Card", "Button", "List", "Image", "Video", "Audio", "Form", "PaymentPlatform"] as const;
export const ecommerceComponentTypes = ["Product", "SearchBar"] as const;
export const booksComponentTypes = ["PDFDocument", "SearchBar"] as const;
export const searchableComponentCategories = ["ecommerce", "music", "podcasts", "movies", "books"] as const;
export const gameComponentTypes = ["GameScene", "Player", "ImageAnimation", "Platform", "Collectible", "Hazard", "FinishGate", "TouchControls", "Physics", "Score", "Level", "Condition"] as const;
export const builderComponentTypes = [...baseComponentTypes, ...ecommerceComponentTypes, ...booksComponentTypes, ...gameComponentTypes] as const;

export type BuilderComponentType = (typeof builderComponentTypes)[number];
export type ComponentProperties = Record<string, unknown>;

export const componentTypeLabels: Record<BuilderComponentType, { ar: string; en: string }> = {
  Card: { ar: "بطاقة معلومات", en: "Information card" },
  Button: { ar: "زر مرتبط", en: "Linked button" },
  List: { ar: "قائمة تنقل", en: "Navigation list" },
  Image: { ar: "صورة من المعرض", en: "Gallery image" },
  Video: { ar: "فيديو من المعرض", en: "Gallery video" },
  Audio: { ar: "مقطع صوتي من المعرض", en: "Gallery audio" },
  Form: { ar: "نموذج جاهز", en: "Ready form" },
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

const formFieldsByCategory: Record<TemplateCategory, Array<{ key: string; type: string; ar: string; en: string; required: boolean }>> = {
  ecommerce: [{ key: "name", type: "text", ar: "الاسم", en: "Name", required: true }, { key: "phone", type: "tel", ar: "رقم الجوال", en: "Phone", required: true }, { key: "note", type: "textarea", ar: "ملاحظات الطلب", en: "Order notes", required: false }],
  education: [{ key: "name", type: "text", ar: "اسم المتعلم", en: "Learner name", required: true }, { key: "email", type: "email", ar: "البريد الإلكتروني", en: "Email", required: true }, { key: "course", type: "select", ar: "المسار", en: "Learning path", required: true }],
  games: [{ key: "player", type: "text", ar: "اسم اللاعب", en: "Player name", required: true }, { key: "difficulty", type: "select", ar: "مستوى الصعوبة", en: "Difficulty", required: true }],
  music: [{ key: "name", type: "text", ar: "الاسم", en: "Name", required: true }, { key: "request", type: "textarea", ar: "طلب موسيقي", en: "Music request", required: false }],
  podcasts: [{ key: "name", type: "text", ar: "الاسم", en: "Name", required: true }, { key: "topic", type: "textarea", ar: "اقتراح حلقة", en: "Episode idea", required: true }],
  movies: [{ key: "name", type: "text", ar: "الاسم", en: "Name", required: true }, { key: "title", type: "text", ar: "العنوان المقترح", en: "Suggested title", required: true }],
  services: [{ key: "name", type: "text", ar: "الاسم", en: "Name", required: true }, { key: "service", type: "select", ar: "الخدمة", en: "Service", required: true }, { key: "appointment", type: "datetime-local", ar: "الموعد", en: "Appointment", required: true }],
  books: [{ key: "name", type: "text", ar: "الاسم", en: "Name", required: true }, { key: "email", type: "email", ar: "البريد الإلكتروني", en: "Email", required: true }, { key: "book", type: "text", ar: "الكتاب المطلوب", en: "Requested book", required: false }],
};

export function getAllowedComponentTypes(category: TemplateCategory): BuilderComponentType[] {
  if (category === "ecommerce") return [...baseComponentTypes, ...ecommerceComponentTypes];
  if (category === "books") return [...baseComponentTypes, ...booksComponentTypes];
  if ((searchableComponentCategories as readonly string[]).includes(category)) return [...baseComponentTypes, "SearchBar"];
  if (category === "games") return [...baseComponentTypes, ...gameComponentTypes];
  return [...baseComponentTypes];
}

export function getDefaultComponentProperties(type: BuilderComponentType, category: TemplateCategory): ComponentProperties {
  if (type === "Card") return { titleAr: "عنوان البطاقة", titleEn: "Card title", descriptionAr: "وصف مختصر للمعلومة", descriptionEn: "A short information description", icon: "Sparkles", actionPageId: null };
  if (type === "Button") return { textAr: "متابعة", textEn: "Continue", targetPageId: null, variant: "primary" };
  if (type === "List") return { titleAr: "", titleEn: "", items: [] as Array<{ labelAr: string; labelEn: string; targetPageId: number | null }> };
  if (type === "Image") return { assetId: null, assetUrl: "", altAr: "وصف الصورة", altEn: "Image description" };
  if (type === "Video") return { assetId: null, assetUrl: "", captionAr: "عنوان الفيديو", captionEn: "Video caption" };
  if (type === "Audio") return { assetId: null, assetUrl: "", captionAr: "عنوان المقطع الصوتي", captionEn: "Audio clip title" };
  if (type === "PDFDocument") return { assetId: null, assetUrl: "", titleAr: "عنوان الكتاب", titleEn: "Book title", descriptionAr: "وصف مختصر للكتاب", descriptionEn: "Short book description", startPage: 1 };
  if (type === "Form") return { fields: formFieldsByCategory[category], submitLabelAr: "إرسال", submitLabelEn: "Submit", contextPageId: null };
  if (type === "PaymentPlatform") return { mode: "product", provider: "moyasar", titleAr: "شراء الآن", titleEn: "Buy now", descriptionAr: "ادفع بأمان لإتمام الطلب", descriptionEn: "Pay securely to complete your order", amount: 0, currency: "SAR", billingCycle: "monthly", successPageId: null };
  if (type === "Product") return { nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", price: 0, salePrice: null, currency: "SAR", stock: 0, assetId: null, assetUrl: "" };
  if (type === "SearchBar") return { placeholderAr: category === "ecommerce" ? "ابحث في المنتجات" : "ابحث في المحتوى", placeholderEn: category === "ecommerce" ? "Search products" : "Search content", emptyAr: "لا توجد نتائج مطابقة للبحث", emptyEn: "No results match your search" };
  if (type === "GameScene") return { preset: "platformer", sceneNameAr: "المشهد الأول", sceneNameEn: "First scene", backgroundAssetId: null, durationSeconds: 90 };
  if (type === "Player") return { spriteAssetId: null, speed: 6, jumpForce: 12, lives: 3, startX: 8, startY: 64 };
  if (type === "ImageAnimation") return { assetId: null, assetUrl: "", target: "player", frameCount: 1, fps: 8, x: 12, y: 20, width: 18, height: 18, loop: true };
  if (type === "Platform") return { x: 8, y: 78, width: 84, height: 10, moving: false };
  if (type === "Collectible") return { x: 48, y: 58, amount: 3, value: 10, assetId: null, assetUrl: "" };
  if (type === "Hazard") return { x: 70, y: 70, width: 10, height: 8, damage: 1 };
  if (type === "FinishGate") return { x: 88, y: 58, requiredScore: 30, successPageId: null };
  if (type === "TouchControls") return { showDirections: true, showJump: true, showAction: false, position: "bottom" };
  if (type === "Physics") return { gravity: 1, collisions: true, boundaryMode: "screen" };
  if (type === "Score") return { startScore: 0, pointsPerCollectible: 10, showLeaderboard: true };
  if (type === "Level") return { levelNumber: 1, targetScore: 100, timeLimitSeconds: 90 };
  return { condition: "score_at_least", targetValue: 100, successPageId: null, failurePageId: null };
}
