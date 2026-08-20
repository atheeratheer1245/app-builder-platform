import type { TemplateCategory, TemplatePageSeed } from "./appBuilderCatalog";
import type { BuilderComponentType, ComponentProperties } from "./componentCatalog";

export type PremiumExampleComponent = {
  pageKey: string;
  componentType: BuilderComponentType;
  labelAr: string;
  labelEn: string;
  properties: ComponentProperties;
};

export type PremiumExample = {
  slug: string;
  category: TemplateCategory;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  accentColor: string;
  iconName: string;
  pages: TemplatePageSeed[];
  components: PremiumExampleComponent[];
};

const nav = (items: Array<[string, string, string]>) => ({ items: items.map(([labelAr, labelEn, targetPageKey]) => ({ labelAr, labelEn, targetPageKey })) });
const button = (textAr: string, textEn: string, targetPageKey: string) => ({ textAr, textEn, targetPageKey, variant: "primary" });
const card = (titleAr: string, titleEn: string, descriptionAr: string, descriptionEn: string, actionPageKey?: string) => ({ titleAr, titleEn, descriptionAr, descriptionEn, ...(actionPageKey ? { actionPageKey } : {}) });

export const premiumExampleCatalog: PremiumExample[] = [
  {
    slug: "nova-market", category: "ecommerce", nameAr: "متجر نوفا", nameEn: "Nova Market", descriptionAr: "واجهة متجر متكاملة تجمع الاستكشاف والمنتجات والعروض والسلة في تجربة تسوق مترابطة.", descriptionEn: "A complete storefront that connects discovery, products, offers, and cart flows in one considered shopping experience.", accentColor: "#2563EB", iconName: "ShoppingBag",
    pages: [{ key: "home", titleAr: "الرئيسية", titleEn: "Home" }, { key: "offers", titleAr: "العروض", titleEn: "Offers" }, { key: "catalog", titleAr: "المنتجات", titleEn: "Catalog" }, { key: "cart", titleAr: "السلة", titleEn: "Cart" }, { key: "account", titleAr: "الحساب", titleEn: "Account" }],
    components: [
      { pageKey: "home", componentType: "SearchBar", labelAr: "", labelEn: "", properties: { placeholderAr: "ابحث في منتجات نوفا", placeholderEn: "Search Nova products", emptyAr: "لم نعثر على منتج مطابق", emptyEn: "No matching product found" } },
      { pageKey: "home", componentType: "Card", labelAr: "", labelEn: "", properties: card("اختيارات الموسم", "Seasonal edit", "منتجات مختارة بعناية للاستخدام اليومي مع وصول واضح للعروض والتصنيفات.", "A considered selection for daily use, with clear paths to offers and collections.", "offers") },
      { pageKey: "home", componentType: "List", labelAr: "", labelEn: "", properties: nav([["العروض الحالية", "Current offers", "offers"], ["تصفح المنتجات", "Browse products", "catalog"], ["سلة التسوق", "Shopping cart", "cart"]]) },
      { pageKey: "home", componentType: "Product", labelAr: "", labelEn: "", properties: { nameAr: "حقيبة تنظيم يومية", nameEn: "Daily organizer tote", descriptionAr: "حقيبة عملية بخامات متينة وتقسيمات داخلية منظمة.", descriptionEn: "A durable everyday tote with considered internal compartments.", price: 189, salePrice: 149, currency: "SAR", stock: 12, assetId: null, assetUrl: "" } },
      { pageKey: "offers", componentType: "Product", labelAr: "", labelEn: "", properties: { nameAr: "مجموعة العمل الذكية", nameEn: "Smart work set", descriptionAr: "ثلاثة أساسيات للعمل في مجموعة موفرة لفترة محدودة.", descriptionEn: "Three work essentials in a limited-time value bundle.", price: 260, salePrice: 199, currency: "SAR", stock: 8, assetId: null, assetUrl: "" } },
      { pageKey: "catalog", componentType: "Product", labelAr: "", labelEn: "", properties: { nameAr: "زجاجة حرارية", nameEn: "Thermal bottle", descriptionAr: "زجاجة ستانلس تحفظ الحرارة والبرودة طوال اليوم.", descriptionEn: "A stainless-steel bottle built to retain temperature all day.", price: 95, salePrice: null, currency: "SAR", stock: 25, assetId: null, assetUrl: "" } },
      { pageKey: "cart", componentType: "Card", labelAr: "", labelEn: "", properties: card("ملخص الطلب", "Order summary", "راجع العناصر التي اخترتها ثم انتقل إلى الحساب لإكمال إعداد الطلب.", "Review selected items, then continue to account to complete the order setup.", "account") },
      { pageKey: "account", componentType: "Button", labelAr: "", labelEn: "", properties: button("استكشاف المنتجات", "Explore products", "catalog") },
    ],
  },
  {
    slug: "athra-academy", category: "education", nameAr: "أكاديمية إثراء", nameEn: "Athra Academy", descriptionAr: "تجربة تعليمية منظمة للمسارات والدروس والاختبارات ومتابعة التقدم الشخصي.", descriptionEn: "An organized learning experience for paths, lessons, assessments, and personal progress.", accentColor: "#0E7490", iconName: "GraduationCap",
    pages: [{ key: "dashboard", titleAr: "لوحة التعلم", titleEn: "Learning dashboard" }, { key: "paths", titleAr: "المسارات", titleEn: "Learning paths" }, { key: "lesson", titleAr: "الدرس", titleEn: "Lesson" }, { key: "quiz", titleAr: "الاختبار", titleEn: "Assessment" }, { key: "progress", titleAr: "التقدم", titleEn: "Progress" }],
    components: [
      { pageKey: "dashboard", componentType: "Card", labelAr: "", labelEn: "", properties: card("تابع من حيث توقفت", "Continue where you left off", "أنجزت جزءًا من مسار إدارة المنتجات. أكمل الدرس التالي لبناء خطة إطلاق واضحة.", "You have progressed through product management. Continue the next lesson to shape a clear launch plan.", "lesson") },
      { pageKey: "dashboard", componentType: "List", labelAr: "", labelEn: "", properties: nav([["المسارات التعليمية", "Learning paths", "paths"], ["الدرس الحالي", "Current lesson", "lesson"], ["تقدمي", "My progress", "progress"]]) },
      { pageKey: "paths", componentType: "Card", labelAr: "", labelEn: "", properties: card("مسار: من الفكرة إلى الإطلاق", "Path: From idea to launch", "سلسلة دروس عملية لتحديد الجمهور وبناء العرض وتحضير الإطلاق.", "A practical lesson series for audience definition, value proposition, and launch readiness.", "lesson") },
      { pageKey: "lesson", componentType: "Card", labelAr: "", labelEn: "", properties: card("الدرس الأول: مشكلة المستخدم", "Lesson one: The user problem", "ابدأ بتدوين المشكلة كما يصفها المستخدم، ثم حوّل الملاحظات إلى فرضية قابلة للاختبار.", "Start by recording the problem in the user’s own words, then turn your observations into a testable hypothesis.", "quiz") },
      { pageKey: "quiz", componentType: "Card", labelAr: "", labelEn: "", properties: card("تحدي الدرس", "Lesson challenge", "سجّل إجاباتك في ملاحظاتك ثم راجع تقدمك في المسار.", "Record your answers in your notes, then review your progress in the path.", "progress") },
      { pageKey: "progress", componentType: "Button", labelAr: "", labelEn: "", properties: button("العودة إلى المسارات", "Back to paths", "paths") },
    ],
  },
  {
    slug: "galaxy-challenge", category: "games", nameAr: "تحدي المجرّة", nameEn: "Galaxy Challenge", descriptionAr: "نموذج لعبة يشمل تدفق بدء واضح ومراحل ومهام ونظام نقاط وشروط نهاية قابلة للتعديل.", descriptionEn: "A game example with a clear start flow, levels, missions, scoring, and editable end conditions.", accentColor: "#7C3AED", iconName: "Gamepad2",
    pages: [{ key: "start", titleAr: "ابدأ اللعب", titleEn: "Start game" }, { key: "levels", titleAr: "المراحل", titleEn: "Levels" }, { key: "mission", titleAr: "المهمة", titleEn: "Mission" }, { key: "scores", titleAr: "النقاط", titleEn: "Scores" }, { key: "profile", titleAr: "الملف", titleEn: "Profile" }],
    components: [
      { pageKey: "start", componentType: "GameScene", labelAr: "", labelEn: "", properties: { sceneNameAr: "بوابة المجرّة", sceneNameEn: "Galaxy gate", backgroundAssetId: null, durationSeconds: 90 } },
      { pageKey: "start", componentType: "Player", labelAr: "", labelEn: "", properties: { spriteAssetId: null, speed: 6, jumpForce: 12, lives: 3 } },
      { pageKey: "start", componentType: "Button", labelAr: "", labelEn: "", properties: button("اختيار المرحلة", "Choose level", "levels") },
      { pageKey: "levels", componentType: "Level", labelAr: "", labelEn: "", properties: { levelNumber: 1, targetScore: 500, timeLimitSeconds: 90 } },
      { pageKey: "mission", componentType: "Physics", labelAr: "", labelEn: "", properties: { gravity: 1, collisions: true, boundaryMode: "screen" } },
      { pageKey: "scores", componentType: "Score", labelAr: "", labelEn: "", properties: { startScore: 0, pointsPerCollectible: 25, showLeaderboard: true } },
      { pageKey: "mission", componentType: "Condition", labelAr: "", labelEn: "", properties: { condition: "score_at_least", targetValue: 500, successPageKey: "scores", failurePageKey: "levels" } },
      { pageKey: "profile", componentType: "List", labelAr: "", labelEn: "", properties: nav([["المراحل", "Levels", "levels"], ["النقاط", "Scores", "scores"]]) },
    ],
  },
  {
    slug: "naghm-now", category: "music", nameAr: "نغم الآن", nameEn: "Naghm Now", descriptionAr: "تجربة موسيقية حديثة للاكتشاف وقوائم التشغيل والألبومات والمكتبة الشخصية.", descriptionEn: "A modern music experience for discovery, playlists, albums, and a personal library.", accentColor: "#DB2777", iconName: "Music2",
    pages: [{ key: "discover", titleAr: "اكتشف", titleEn: "Discover" }, { key: "now-playing", titleAr: "يعمل الآن", titleEn: "Now playing" }, { key: "playlists", titleAr: "قوائم التشغيل", titleEn: "Playlists" }, { key: "albums", titleAr: "الألبومات", titleEn: "Albums" }, { key: "library", titleAr: "مكتبتي", titleEn: "My library" }],
    components: [
      { pageKey: "discover", componentType: "SearchBar", labelAr: "", labelEn: "", properties: { placeholderAr: "ابحث عن فنان أو ألبوم", placeholderEn: "Search artists or albums", emptyAr: "لا توجد نتائج استماع", emptyEn: "No listening results found" } },
      { pageKey: "discover", componentType: "Card", labelAr: "", labelEn: "", properties: card("جلسة اليوم", "Today’s session", "مجموعة منتقاة من الإيقاعات الهادئة التي تناسب التركيز والعمل.", "A considered selection of calm rhythms for focus and work.", "now-playing") },
      { pageKey: "discover", componentType: "List", labelAr: "", labelEn: "", properties: nav([["يعمل الآن", "Now playing", "now-playing"], ["قوائم التشغيل", "Playlists", "playlists"], ["الألبومات", "Albums", "albums"]]) },
      { pageKey: "now-playing", componentType: "Card", labelAr: "", labelEn: "", properties: card("ضوء المدينة", "City lights", "المقطع الحالي من مجموعة إلكترونية هادئة، مع وصول سريع إلى الألبوم الكامل.", "The current track from a calm electronic set, with quick access to the full album.", "albums") },
      { pageKey: "playlists", componentType: "List", labelAr: "", labelEn: "", properties: nav([["تركيز صباحي", "Morning focus", "library"], ["مشوار المساء", "Evening drive", "library"]]) },
      { pageKey: "library", componentType: "Button", labelAr: "", labelEn: "", properties: button("اكتشف المزيد", "Discover more", "discover") },
    ],
  },
  {
    slug: "madar-podcast", category: "podcasts", nameAr: "بودكاست مدار", nameEn: "Madar Podcast", descriptionAr: "منصة حلقات صوتية مقترحة وقنوات ومتابعة الاستماع في تجربة منظمة وواضحة.", descriptionEn: "An organized audio platform for featured episodes, channels, and listening continuity.", accentColor: "#9333EA", iconName: "Mic2",
    pages: [{ key: "featured", titleAr: "الحلقات المميزة", titleEn: "Featured episodes" }, { key: "episode", titleAr: "الحلقة", titleEn: "Episode" }, { key: "channels", titleAr: "القنوات", titleEn: "Channels" }, { key: "saved", titleAr: "المحفوظات", titleEn: "Saved" }, { key: "profile", titleAr: "الملف", titleEn: "Profile" }],
    components: [
      { pageKey: "featured", componentType: "SearchBar", labelAr: "", labelEn: "", properties: { placeholderAr: "ابحث عن حلقة أو قناة", placeholderEn: "Search episodes or channels", emptyAr: "لا توجد حلقات مطابقة", emptyEn: "No matching episodes" } },
      { pageKey: "featured", componentType: "Card", labelAr: "", labelEn: "", properties: card("حلقة الأسبوع", "Episode of the week", "حوار مركز عن بناء عادات العمل العميق في بيئات سريعة التغير.", "A focused conversation on building deep-work habits in fast-changing environments.", "episode") },
      { pageKey: "featured", componentType: "List", labelAr: "", labelEn: "", properties: nav([["استمع للحلقة", "Listen to episode", "episode"], ["القنوات", "Channels", "channels"], ["المحفوظات", "Saved", "saved"]]) },
      { pageKey: "episode", componentType: "Card", labelAr: "", labelEn: "", properties: card("العمل العميق", "Deep work", "ملخص الحلقة ونقاط النقاش الأساسية مع تذكير للعودة إلى قائمة المحفوظات.", "Episode summary and key talking points, with a reminder to save for later.", "saved") },
      { pageKey: "channels", componentType: "List", labelAr: "", labelEn: "", properties: nav([["محادثات المنتج", "Product conversations", "episode"], ["مساحات إبداعية", "Creative spaces", "episode"]]) },
      { pageKey: "profile", componentType: "Button", labelAr: "", labelEn: "", properties: button("عرض الحلقات", "Browse episodes", "featured") },
    ],
  },
  {
    slug: "studio-watch", category: "movies", nameAr: "شاهد ستوديو", nameEn: "Studio Watch", descriptionAr: "مكتبة عرض للأفلام والمسلسلات وقائمة المشاهدة والتفاصيل والمواسم.", descriptionEn: "A watch library for movies, series, details, seasons, and a personal watchlist.", accentColor: "#EA580C", iconName: "Clapperboard",
    pages: [{ key: "featured", titleAr: "المختارات", titleEn: "Featured" }, { key: "movies", titleAr: "الأفلام", titleEn: "Movies" }, { key: "shows", titleAr: "المسلسلات", titleEn: "Shows" }, { key: "details", titleAr: "التفاصيل", titleEn: "Details" }, { key: "watchlist", titleAr: "قائمتي", titleEn: "Watchlist" }],
    components: [
      { pageKey: "featured", componentType: "SearchBar", labelAr: "", labelEn: "", properties: { placeholderAr: "ابحث عن فيلم أو مسلسل", placeholderEn: "Search movies or shows", emptyAr: "لا توجد أعمال مطابقة", emptyEn: "No matching titles" } },
      { pageKey: "featured", componentType: "Card", labelAr: "", labelEn: "", properties: card("عرض هذا المساء", "Tonight’s pick", "اختيار درامي جديد مع صفحة تفاصيل تشمل الملخص ومتابعة الموسم.", "A new drama selection with a detail page for synopsis and season tracking.", "details") },
      { pageKey: "featured", componentType: "List", labelAr: "", labelEn: "", properties: nav([["الأفلام", "Movies", "movies"], ["المسلسلات", "Shows", "shows"], ["قائمتي", "My watchlist", "watchlist"]]) },
      { pageKey: "movies", componentType: "Card", labelAr: "", labelEn: "", properties: card("مكتبة الأفلام", "Movie library", "تصنيف بسيط يساعد المستخدم على الانتقال من الاختيار إلى صفحة التفاصيل.", "A simple categorization flow that takes viewers from discovery to details.", "details") },
      { pageKey: "shows", componentType: "List", labelAr: "", labelEn: "", properties: nav([["الموسم الأول", "Season one", "details"], ["الموسم الثاني", "Season two", "details"]]) },
      { pageKey: "watchlist", componentType: "Button", labelAr: "", labelEn: "", properties: button("استكشاف المختارات", "Explore featured", "featured") },
    ],
  },
  {
    slug: "khidmati-pro", category: "services", nameAr: "خدماتي برو", nameEn: "Khidmati Pro", descriptionAr: "مثال عملي لإدارة الخدمات والحجوزات والعملاء والمواعيد ضمن تدفق واضح.", descriptionEn: "A practical service app for managing offers, bookings, clients, and appointments through a clear flow.", accentColor: "#059669", iconName: "BriefcaseBusiness",
    pages: [{ key: "services", titleAr: "الخدمات", titleEn: "Services" }, { key: "booking", titleAr: "الحجز", titleEn: "Book service" }, { key: "schedule", titleAr: "المواعيد", titleEn: "Schedule" }, { key: "clients", titleAr: "العملاء", titleEn: "Clients" }, { key: "account", titleAr: "الحساب", titleEn: "Account" }],
    components: [
      { pageKey: "services", componentType: "Card", labelAr: "", labelEn: "", properties: card("استشارة الانطلاقة", "Launch consultation", "جلسة منظمة لمراجعة الفكرة وتحديد الأولويات والخطوات التالية.", "A structured session to review the idea, set priorities, and define next steps.", "booking") },
      { pageKey: "services", componentType: "List", labelAr: "", labelEn: "", properties: nav([["احجز خدمة", "Book a service", "booking"], ["عرض المواعيد", "View schedule", "schedule"], ["سجل العملاء", "Client records", "clients"]]) },
      { pageKey: "booking", componentType: "Card", labelAr: "", labelEn: "", properties: card("خطوات الحجز", "Booking steps", "اختر الخدمة والموعد المناسبين، ثم راجع المواعيد المتاحة.", "Choose the service and suitable time, then review available appointments.", "schedule") },
      { pageKey: "schedule", componentType: "Card", labelAr: "", labelEn: "", properties: card("مواعيد هذا الأسبوع", "This week’s schedule", "اعرض المواعيد القادمة في قائمة منظمة مع انتقال مباشر للخدمة المطلوبة.", "Review upcoming appointments in an organized list with a direct path to the requested service.", "services") },
      { pageKey: "clients", componentType: "Card", labelAr: "", labelEn: "", properties: card("ملفات العملاء", "Client records", "مكان منظم لمتابعة الطلبات والملاحظات وخطوات التواصل القادمة.", "An organized place to follow requests, notes, and next communication steps.", "account") },
      { pageKey: "account", componentType: "Button", labelAr: "", labelEn: "", properties: button("حجز خدمة", "Book a service", "booking") },
    ],
  },
  {
    slug: "warraq-library", category: "books", nameAr: "مكتبة ورّاق", nameEn: "Warraq Library", descriptionAr: "تجربة قراءة منظمة لاكتشاف الكتب والتصنيفات والمفضلة ومتابعة القراءة من صفحة واحدة واضحة.", descriptionEn: "An organized reading experience for discovering books, categories, favorites, and reading progress through a clear flow.", accentColor: "#0F766E", iconName: "BookOpen",
    pages: [{ key: "library", titleAr: "المكتبة", titleEn: "Library" }, { key: "categories", titleAr: "التصنيفات", titleEn: "Categories" }, { key: "details", titleAr: "تفاصيل الكتاب", titleEn: "Book details" }, { key: "reader", titleAr: "القارئ", titleEn: "Reader" }, { key: "favorites", titleAr: "المفضلة", titleEn: "Favorites" }, { key: "account", titleAr: "الحساب", titleEn: "Account" }],
    components: [
      { pageKey: "library", componentType: "SearchBar", labelAr: "", labelEn: "", properties: { placeholderAr: "ابحث عن كتاب أو مؤلف", placeholderEn: "Search books or authors", emptyAr: "لا توجد كتب مطابقة", emptyEn: "No matching books" } },
      { pageKey: "library", componentType: "Card", labelAr: "", labelEn: "", properties: card("اختيار هذا الأسبوع", "This week's pick", "مجموعة قراءة منتقاة تجمع العناوين الهادئة والعملية مع مسار واضح لبدء القراءة.", "A considered reading selection that connects calm, practical titles with a clear path to start reading.", "details") },
      { pageKey: "library", componentType: "List", labelAr: "", labelEn: "", properties: nav([["استكشف التصنيفات", "Explore categories", "categories"], ["تابع القراءة", "Continue reading", "reader"], ["كتبي المفضلة", "My favorites", "favorites"]]) },
      { pageKey: "categories", componentType: "List", labelAr: "", labelEn: "", properties: nav([["فكر وأعمال", "Ideas & business", "details"], ["روايات", "Fiction", "details"], ["تطوير الذات", "Personal growth", "details"]]) },
      { pageKey: "details", componentType: "Card", labelAr: "", labelEn: "", properties: card("خرائط الأفكار الواضحة", "Maps of clear ideas", "كتاب عملي يساعد القارئ على تنظيم الملاحظات وتحويلها إلى خطوات صغيرة قابلة للتنفيذ.", "A practical book for organizing notes and turning them into small, actionable steps.", "reader") },
      { pageKey: "details", componentType: "Button", labelAr: "", labelEn: "", properties: button("ابدأ القراءة", "Start reading", "reader") },
      { pageKey: "reader", componentType: "PDFDocument", labelAr: "", labelEn: "", properties: { assetId: null, assetUrl: "", titleAr: "نسخة القراءة", titleEn: "Reading edition", descriptionAr: "ارفع ملف PDF مرخّصًا ثم اختره هنا لعرضه داخل القارئ.", descriptionEn: "Upload a licensed PDF, then select it here to display it inside the reader.", startPage: 1 } },
      { pageKey: "reader", componentType: "Button", labelAr: "", labelEn: "", properties: button("أضف إلى المفضلة", "Add to favorites", "favorites") },
      { pageKey: "favorites", componentType: "Card", labelAr: "", labelEn: "", properties: card("قائمة قراءتك", "Your reading list", "مساحة منظمة لحفظ الكتب التي تريد العودة إليها ومتابعة تقدمك فيها.", "An organized space to save books you want to revisit and follow your progress.", "library") },
      { pageKey: "account", componentType: "List", labelAr: "", labelEn: "", properties: nav([["المكتبة", "Library", "library"], ["المفضلة", "Favorites", "favorites"], ["إعدادات القراءة", "Reading settings", "reader"]]) },
    ],
  },
];
