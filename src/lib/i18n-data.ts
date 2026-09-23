
/**
 * Pure language data & helpers — safe for client components (no next/headers).
 * Solai language preference — TAMIL FIRST.
 *
 * `ta` is the default display language: Tamil text leads, English (and
 * transliteration) support it for foreign learners. Visitors and signed-in
 * users can switch the display language — the choice is kept in a cookie
 * (`solai_lang`) and, for signed-in users, on the profile
 * (`users.display_language`).
 *
 * We welcome learners of the world's 10 most-spoken languages (plus the
 * Indian regional languages) — the AI tutor explains in their native
 * language while always keeping Tamil script + English visible.
 */
export const LANGS = [
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'en', native: 'English', english: 'English' },
  { code: 'zh', native: '中文', english: 'Chinese (Mandarin)' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'es', native: 'Español', english: 'Spanish' },
  { code: 'fr', native: 'Français', english: 'French' },
  { code: 'ar', native: 'العربية', english: 'Arabic' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'ru', native: 'Русский', english: 'Russian' },
  { code: 'pt', native: 'Português', english: 'Portuguese' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada' },
] as const;

export type Lang = (typeof LANGS)[number]['code'];

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && LANGS.some((l) => l.code === v);
}

/**
 * Options for "your language" (register / profile) — the learner's native
 * language, which the AI tutor uses for explanations. Covers the world's 10
 * most-spoken languages plus the Indian regional languages and Tamil.
 */
export const NATIVE_LANG_OPTIONS: [Lang, string][] = [
  ['en', 'English'],
  ['zh', '中文 · Chinese'],
  ['hi', 'हिन्दी · Hindi'],
  ['es', 'Español · Spanish'],
  ['fr', 'Français · French'],
  ['ar', 'العربية · Arabic'],
  ['bn', 'বাংলা · Bengali'],
  ['ru', 'Русский · Russian'],
  ['pt', 'Português · Portuguese'],
  ['id', 'Bahasa Indonesia · Indonesian'],
  ['te', 'తెలుగు · Telugu'],
  ['ml', 'മലയാളം · Malayalam'],
  ['kn', 'ಕನ್ನಡ · Kannada'],
  ['ta', 'தமிழ் · Tamil (I speak Tamil)'],
];

/**
 * Display languages offered by the header switcher: **Tamil** (default,
 * Tamil-first) and **English** (English-first for foreign learners).
 * The other 12 languages are NOT display languages — they are the
 * learner's *native* language options (registration / profile), which the
 * AI tutor uses to explain Tamil in the learner's own language.
 */
export const DISPLAY_LANGS = LANGS.filter((l) => l.code === 'ta' || l.code === 'en');

/**
 * Bilingual display pair. In `ta` (and other Indic settings) Tamil leads;
 * in `en` English leads with Tamil as support.
 */
export function bi(ta: string, en: string, lang: Lang): { main: string; sub: string } {
  if (lang === 'en') return { main: en, sub: ta };
  return { main: ta, sub: en };
}

/* ───────────────────────── UI chrome dictionary ─────────────────────────
   Tamil-first, with translations for the main nav + common actions so
   learners of every supported language can navigate. Missing entries
   fall back to English, then to Tamil. */

const DICT: Record<string, Partial<Record<Lang, string>>> = {
  nav_courses: {
    ta: 'வகுப்புகள்', en: 'Courses', hi: 'कोर्स', te: 'వర్గాలు', ml: 'ക്ലാസുകൾ', kn: 'ಕೋರ್ಸ್‌ಗಳು',
    zh: '课程', es: 'Cursos', fr: 'Cours', ar: 'الدورات', bn: 'কোর্স', ru: 'Курсы', pt: 'Cursos', id: 'Kurs',
  },
  nav_workshops: {
    ta: 'பட்டறைகள்', en: 'Workshops', hi: 'वर्कशॉप', te: 'వర్క్‌షాప్', ml: 'വർക്ക്‌ഷോപ്പുകൾ', kn: 'ವರ್ಕ್‌ಶಾಪ್',
    zh: '工作坊', es: 'Talleres', fr: 'Ateliers', ar: 'ورش العمل', bn: 'ওয়ার্কশপ', ru: 'Воркшопы', pt: 'Oficinas', id: 'Lokakarya',
  },
  nav_vocabulary: {
    ta: 'வார்த்தைகள்', en: 'Vocabulary', hi: 'शब्दकोश', te: 'పదజాలం', ml: 'പദാവലി', kn: 'ಪದಕೋಶ',
    zh: '词汇', es: 'Vocabulario', fr: 'Vocabulaire', ar: 'المفردات', bn: 'শব্দভাণ্ডার', ru: 'Словарь', pt: 'Vocabulário', id: 'Kosakata',
  },
  nav_practice: {
    ta: 'பழகல்', en: 'Practice', hi: 'अभ्यास', te: 'అభ్యసన', ml: 'അഭ്യാസം', kn: 'ಅಭ್ಯಾಸ',
    zh: '练习', es: 'Práctica', fr: 'Pratique', ar: 'الممارسة', bn: 'অনুশীলন', ru: 'Практика', pt: 'Prática', id: 'Latihan',
  },
  nav_resources: {
    ta: 'வளங்கள்', en: 'Resources', hi: 'संसाधन', te: 'వనరులు', ml: 'വിഭവങ്ങൾ', kn: 'ಸಂಪನ್ಮೂಲ',
    zh: '资源', es: 'Recursos', fr: 'Ressources', ar: 'الموارد', bn: 'সম্পদ', ru: 'Ресурсы', pt: 'Recursos', id: 'Sumber',
  },
  nav_culture: {
    ta: 'கலாசாரம்', en: 'Culture', hi: 'संस्कृति', te: 'సంస్కృతి', ml: 'സാംസ്കാരികം', kn: 'ಸಂಸ್ಕೃತಿ',
    zh: '文化', es: 'Cultura', fr: 'Culture', ar: 'الثقافة', bn: 'সংস্কৃতি', ru: 'Культура', pt: 'Cultura', id: 'Budaya',
  },
  nav_community: {
    ta: 'சமூகம்', en: 'Community', hi: 'सामुदायिक', te: 'కమ్యూనిటీ', ml: 'കമ്മ്യൂണിറ്റി', kn: 'ಸಮುದಾಯ',
    zh: '社区', es: 'Comunidad', fr: 'Communauté', ar: 'المجتمع', bn: 'কমিউনিটি', ru: 'Сообщество', pt: 'Comunidade', id: 'Komunitas',
  },
  nav_faq: { ta: 'பொது கேள்விகள்', en: 'FAQ', hi: 'FAQ', te: 'FAQ', ml: 'FAQ', kn: 'FAQ', zh: '常见问题', es: 'Preguntas', fr: 'FAQ', ar: 'الأسئلة الشائعة', bn: 'প্রশ্নোত্তর', ru: 'FAQ', pt: 'Dúvidas', id: 'FAQ' },
  home: {
    ta: 'முகப்பு', en: 'Home', hi: 'मुखपृष्ठ', te: 'హోమ్', ml: 'ഹോം', kn: 'ಮುಖಪುಟ',
    zh: '首页', es: 'Inicio', fr: 'Accueil', ar: 'الرئيسية', bn: 'হোম', ru: 'Главная', pt: 'Início', id: 'Beranda',
  },
  dashboard: {
    ta: 'பயிற்சி பலகை', en: 'Dashboard', hi: 'डैशबोर्ड', te: 'డాష్‌బోర్డ్', ml: 'ഡാഷ്‌ബോർഡ്', kn: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    zh: '仪表板', es: 'Panel', fr: 'Tableau de bord', ar: 'لوحة التحكم', bn: 'ড্যাশবোর্ড', ru: 'Панель', pt: 'Painel', id: 'Dasbor',
  },
  sign_in: {
    ta: 'உள்நுழைய', en: 'Sign in', hi: 'साइन इन', te: 'సైన్ ఇన్', ml: 'സൈൻ ഇൻ', kn: 'ಸೈನ್ ಇನ್',
    zh: '登录', es: 'Iniciar sesión', fr: 'Se connecter', ar: 'تسجيل الدخول', bn: 'লগইন', ru: 'Войти', pt: 'Entrar', id: 'Masuk',
  },
  sign_up: {
    ta: 'பதிவு', en: 'Sign up', hi: 'साइन अप', te: 'సైన్ అప్', ml: 'സൈൻ അപ്പ്', kn: 'ಸೈನ್ ಅಪ್',
    zh: '注册', es: 'Crear cuenta', fr: "S'inscrire", ar: 'إنشاء حساب', bn: 'সাইন আপ', ru: 'Регистрация', pt: 'Criar conta', id: 'Daftar',
  },
  logout: {
    ta: 'வெளியேறு', en: 'Log out', hi: 'लॉग आउट', te: 'లాగ్‌అవుట్', ml: 'ലോഗ്‌ഔട്ട്', kn: 'ಲಾಗ್‌ಔಟ್',
    zh: '退出登录', es: 'Cerrar sesión', fr: 'Se déconnecter', ar: 'تسجيل الخروج', bn: 'লগআউট', ru: 'Выйти', pt: 'Sair', id: 'Keluar',
  },
  learn: {
    ta: 'படி', en: 'Learn', hi: 'सीखें', te: 'అభ్యసించండి', ml: 'കല', kn: 'ಕಲಿಯಿರಿ',
    zh: '学习', es: 'Aprender', fr: 'Apprendre', ar: 'تعلّم', bn: 'শিখুন', ru: 'Учиться', pt: 'Aprender', id: 'Belajar',
  },
  search: {
    ta: 'தேடு', en: 'Search', hi: 'खोजें', te: 'శోధించండి', ml: 'തിരയൽ', kn: 'ಹುಡುಕಿ',
    zh: '搜索', es: 'Buscar', fr: 'Rechercher', ar: 'بحث', bn: 'খুঁজুন', ru: 'Поиск', pt: 'Buscar', id: 'Cari',
  },
  start: {
    ta: 'தொடங்கு', en: 'Start', hi: 'शुरू करें', te: 'ప్రారంభించండి', ml: 'തുടങ്ങുക', kn: 'ಪ್ರಾರಂಭಿಸಿ',
    zh: '开始', es: 'Comenzar', fr: 'Commencer', ar: 'ابدأ', bn: 'শুরু করুন', ru: 'Начать', pt: 'Começar', id: 'Mulai',
  },
  watch: {
    ta: 'பார்', en: 'Watch', hi: 'देखें', te: 'చూడండి', ml: 'കാണുക', kn: 'ನೋಡಿ',
    zh: '观看', es: 'Ver', fr: 'Regarder', ar: 'شاهد', bn: 'দেখুন', ru: 'Смотреть', pt: 'Assistir', id: 'Tonton',
  },
  free: {
    ta: 'இலவசம்', en: 'Free', hi: 'मुफ़्त', te: 'ఉచిత', ml: 'ഫ്രീ', kn: 'ಮುಕ್ತ',
    zh: '免费', es: 'Gratis', fr: 'Gratuit', ar: 'مجاني', bn: 'ফ্রি', ru: 'Бесплатно', pt: 'Grátis', id: 'Gratis',
  },
  language: {
    ta: 'மொழி', en: 'Language', hi: 'भाषा', te: 'భాష', ml: 'ഭാഷ', kn: 'ಭಾಷೆ',
    zh: '语言', es: 'Idioma', fr: 'Langue', ar: 'اللغة', bn: 'ভাষা', ru: 'Язык', pt: 'Idioma', id: 'Bahasa',
  },
};

export function t(key: string, lang: Lang): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en ?? entry.ta ?? key;
}
