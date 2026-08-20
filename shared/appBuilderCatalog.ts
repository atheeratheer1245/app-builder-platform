export const templateCategories = [
  "ecommerce",
  "education",
  "games",
  "music",
  "podcasts",
  "movies",
  "services",
  "books",
] as const;

export type TemplateCategory = (typeof templateCategories)[number];
export type SupportedLocale = "ar" | "en";

export type TemplatePageSeed = {
  key: string;
  titleAr: string;
  titleEn: string;
};

export type TemplateCatalogItem = {
  slug: string;
  category: TemplateCategory;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  accentColor: string;
  iconName: string;
  components: string[];
  suggestedStructure: TemplatePageSeed[];
};

export const templateCatalog: TemplateCatalogItem[] = [
  {
    slug: "ecommerce-store",
    category: "ecommerce",
    nameAr: "متجر إلكتروني",
    nameEn: "E-commerce Store",
    descriptionAr: "واجهة بيع متكاملة للمنتجات والسلة والدفع والحساب.",
    descriptionEn: "A complete storefront for products, cart, checkout, and accounts.",
    accentColor: "#2563EB",
    iconName: "ShoppingBag",
    components: ["Product cards", "Category list", "Cart", "Favorites", "Search"],
    suggestedStructure: [
      { key: "home", titleAr: "الرئيسية", titleEn: "Home" },
      { key: "categories", titleAr: "الأقسام", titleEn: "Categories" },
      { key: "products", titleAr: "المنتجات", titleEn: "Products" },
      { key: "cart", titleAr: "السلة", titleEn: "Cart" },
      { key: "checkout", titleAr: "الدفع", titleEn: "Checkout" },
      { key: "account", titleAr: "الحساب", titleEn: "Account" },
    ],
  },
  {
    slug: "education-platform",
    category: "education",
    nameAr: "تطبيق تعليمي",
    nameEn: "Education App",
    descriptionAr: "تعلم منظّم بالدروس والفيديوهات والاختبارات والإنجازات.",
    descriptionEn: "Structured learning with lessons, video, quizzes, and achievements.",
    accentColor: "#0E7490",
    iconName: "GraduationCap",
    components: ["Lesson card", "Video player", "Multiple-choice quiz", "Progress"],
    suggestedStructure: [
      { key: "home", titleAr: "الرئيسية", titleEn: "Home" },
      { key: "lessons", titleAr: "الدروس", titleEn: "Lessons" },
      { key: "videos", titleAr: "الفيديوهات", titleEn: "Videos" },
      { key: "quizzes", titleAr: "الاختبارات", titleEn: "Quizzes" },
      { key: "achievements", titleAr: "الإنجازات", titleEn: "Achievements" },
    ],
  },
  {
    slug: "game-studio",
    category: "games",
    nameAr: "تطبيق ألعاب",
    nameEn: "Gaming App",
    descriptionAr: "تجربة ألعاب تضم البداية والمستويات والنقاط والحساب.",
    descriptionEn: "A gaming experience with start, levels, scoring, and accounts.",
    accentColor: "#7C3AED",
    iconName: "Gamepad2",
    components: ["Start game button", "Scoring system", "Level system", "Account"],
    suggestedStructure: [
      { key: "start", titleAr: "شاشة البداية", titleEn: "Start screen" },
      { key: "levels", titleAr: "اختيار المستوى", titleEn: "Level picker" },
      { key: "game", titleAr: "شاشة اللعبة", titleEn: "Game screen" },
      { key: "score", titleAr: "النقاط", titleEn: "Scores" },
    ],
  },
  {
    slug: "music-player",
    category: "music",
    nameAr: "تطبيق موسيقى",
    nameEn: "Music App",
    descriptionAr: "مشغل موسيقى بالأغاني المقترحة وقوائم التشغيل والألبومات.",
    descriptionEn: "A music player with recommended songs, playlists, and albums.",
    accentColor: "#DB2777",
    iconName: "Music2",
    components: ["Music player", "Playlist", "Song card", "Album grid"],
    suggestedStructure: [
      { key: "discover", titleAr: "الأغاني المقترحة", titleEn: "Discover" },
      { key: "playlists", titleAr: "قوائم التشغيل", titleEn: "Playlists" },
      { key: "albums", titleAr: "الألبومات", titleEn: "Albums" },
      { key: "artists", titleAr: "الفنانون", titleEn: "Artists" },
    ],
  },
  {
    slug: "podcast-hub",
    category: "podcasts",
    nameAr: "تطبيق بودكاست",
    nameEn: "Podcast App",
    descriptionAr: "منصة صوتية للحلقات والقنوات والضيوف والمتابعة.",
    descriptionEn: "An audio hub for episodes, channels, guests, and listening progress.",
    accentColor: "#9333EA",
    iconName: "Mic2",
    components: ["Podcast player", "Episode card", "Episode list", "Channel follow"],
    suggestedStructure: [
      { key: "discover", titleAr: "الحلقات المقترحة", titleEn: "Discover" },
      { key: "continue", titleAr: "إكمال المتابعة", titleEn: "Continue listening" },
      { key: "channels", titleAr: "القنوات", titleEn: "Channels" },
      { key: "guests", titleAr: "الضيوف", titleEn: "Guests" },
    ],
  },
  {
    slug: "movies-shows",
    category: "movies",
    nameAr: "أفلام ومسلسلات",
    nameEn: "Movies & Shows",
    descriptionAr: "مكتبة مشاهدة بالأفلام والمسلسلات والمواسم والممثلين.",
    descriptionEn: "A watch library for movies, shows, seasons, and cast.",
    accentColor: "#EA580C",
    iconName: "Clapperboard",
    components: ["Movie card", "Show card", "Video player", "Watch list"],
    suggestedStructure: [
      { key: "movies", titleAr: "الأفلام", titleEn: "Movies" },
      { key: "shows", titleAr: "المسلسلات", titleEn: "Shows" },
      { key: "watch", titleAr: "صفحة المشاهدة", titleEn: "Watch" },
      { key: "seasons", titleAr: "المواسم", titleEn: "Seasons" },
      { key: "cast", titleAr: "الممثلون", titleEn: "Cast" },
    ],
  },
  {
    slug: "services-booking",
    category: "services",
    nameAr: "تطبيق خدمات",
    nameEn: "Services App",
    descriptionAr: "تجربة حجز وإدارة خدمات وعملاء ودفع مرنة.",
    descriptionEn: "A flexible service, booking, client, and payment experience.",
    accentColor: "#059669",
    iconName: "BriefcaseBusiness",
    components: ["Service card", "Client form", "Client list", "Booking"],
    suggestedStructure: [
      { key: "services", titleAr: "الخدمات", titleEn: "Services" },
      { key: "booking", titleAr: "الحجز", titleEn: "Booking" },
      { key: "clients", titleAr: "العملاء", titleEn: "Clients" },
      { key: "checkout", titleAr: "الدفع", titleEn: "Checkout" },
    ],
  },
  {
    slug: "books-library",
    category: "books",
    nameAr: "تطبيق كتب",
    nameEn: "Books App",
    descriptionAr: "مكتبة كتب رقمية للقراءة والتصنيفات وتفاصيل الكتب والمفضلة والحساب.",
    descriptionEn: "A digital library for reading, categories, book details, favorites, and account access.",
    accentColor: "#A16207",
    iconName: "BookOpen",
    components: ["Book cards", "PDF reader", "Category list", "Search", "Favorites"],
    suggestedStructure: [
      { key: "library", titleAr: "المكتبة", titleEn: "Library" },
      { key: "categories", titleAr: "التصنيفات", titleEn: "Categories" },
      { key: "book", titleAr: "تفاصيل الكتاب", titleEn: "Book details" },
      { key: "reader", titleAr: "القارئ", titleEn: "Reader" },
      { key: "favorites", titleAr: "المفضلة", titleEn: "Favorites" },
      { key: "account", titleAr: "الحساب", titleEn: "Account" },
    ],
  },
];
