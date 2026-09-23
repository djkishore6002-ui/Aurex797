
/**
 * Pure language data & helpers — safe for client components (no next/headers).
 * Solai language preference — TAMIL FIRST.
 *
 * `ta` is the default display language: Tamil text leads, English (and
 * transliteration) support it for foreign learners. Visitors and signed-in
 * users can switch the display language — the choice is kept in a cookie
 * (`solai_lang`) and, for signed-in users, on the profile
 * (`users.display_language`).
 */
export const LANGS = [
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'en', native: 'English', english: 'English' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada' },
] as const;

export type Lang = (typeof LANGS)[number]['code'];

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && LANGS.some((l) => l.code === v);
}

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
   foreign learners from hi/te/ml/kn backgrounds can navigate. Missing
   entries fall back to English, then to Tamil. */

const DICT: Record<string, Partial<Record<Lang, string>>> = {
  nav_courses: { ta: 'வகுப்புகள்', en: 'Courses', hi: 'कोर्स', te: 'వర్గాలు', ml: 'ക്ലാസുകൾ', kn: 'ಕೋರ್ಸ್‌ಗಳು' },
  nav_workshops: { ta: 'பட்டறைகள்', en: 'Workshops', hi: 'वर्कशॉप', te: 'వర్క్‌షాప్', ml: 'വർക്ക്‌ഷോപ്പുകൾ', kn: 'ವರ್ಕ್‌ಶಾಪ್' },
  nav_vocabulary: { ta: 'வார்த்தைகள்', en: 'Vocabulary', hi: 'शब्दकोश', te: 'పదజాలం', ml: 'പദാവലി', kn: 'ಪದಕೋಶ' },
  nav_practice: { ta: 'பழகல்', en: 'Practice', hi: 'अभ्यास', te: 'అభ్యసన', ml: 'അभ്യാസം', kn: 'ಅಭ್ಯಾಸ' },
  nav_resources: { ta: 'வளங்கள்', en: 'Resources', hi: 'संसाधन', te: 'వనరులు', ml: 'വിഭവങ്ങൾ', kn: 'ಸಂಪನ್ಮೂಲ' },
  nav_culture: { ta: 'கலாசாரம்', en: 'Culture', hi: 'संस्कृति', te: 'సంస్కృతి', ml: 'സാംസ്കാരികം', kn: 'ಸಂಸ್ಕೃತಿ' },
  nav_community: { ta: 'சமூகம்', en: 'Community', hi: 'सामुदायिक', te: 'కమ్యూనిటీ', ml: 'കമ്മ്യൂണിറ്റി', kn: 'ಸಮುದಾಯ' },
  nav_faq: { ta: 'பொது கேள்விகள்', en: 'FAQ', hi: 'FAQ', te: 'FAQ', ml: 'FAQ', kn: 'FAQ' },
  home: { ta: 'முகப்பு', en: 'Home', hi: 'मुखपृष्ठ', te: 'హోమ్', ml: 'ഹോം', kn: 'ಮುಖಪುಟ' },
  dashboard: { ta: 'பயிற்சி பலகை', en: 'Dashboard', hi: 'डैशबोर्ड', te: 'డాష్‌బోర్డ్', ml: 'ഡാഷ്‌ബോർഡ്', kn: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್' },
  sign_in: { ta: 'உள்நுழைய', en: 'Sign in', hi: 'साइन इन', te: 'సైన్ ఇన్', ml: 'സൈൻ ഇൻ', kn: 'ಸೈನ್ ಇನ್' },
  sign_up: { ta: 'பதிவு', en: 'Sign up', hi: 'साइन अप', te: 'సైన్ అప్', ml: 'സൈൻ അപ്പ്', kn: 'ಸೈನ್ ಅಪ್' },
  logout: { ta: 'வெளியேறு', en: 'Log out', hi: 'लॉग आउट', te: 'లాగ్‌అవుట్', ml: 'ലോഗ്‌ഔട്ട്', kn: 'ಲಾಗ್‌ಔಟ್' },
  learn: { ta: 'படி', en: 'Learn', hi: 'सीखें', te: 'అభ్యసించండి', ml: 'കല', kn: 'ಕಲಿಯಿರಿ' },
  search: { ta: 'தேடு', en: 'Search', hi: 'खोजें', te: 'శోధించండి', ml: 'തിരയൽ', kn: 'ಹುಡುಕಿ' },
  start: { ta: 'தொடங்கு', en: 'Start', hi: 'शुरू करें', te: 'ప్రారంభించండి', ml: 'തുടങ്ങുക', kn: 'ಪ್ರಾರಂಭಿಸಿ' },
  watch: { ta: 'பார்', en: 'Watch', hi: 'देखें', te: 'చూడండి', ml: 'കാണുക', kn: 'ನೋಡಿ' },
  free: { ta: 'இலவசம்', en: 'Free', hi: 'मुफ़्त', te: 'ఉచిత', ml: 'ഫ്രീ', kn: 'ಮುಕ್ತ' },
  language: { ta: 'மொழி', en: 'Language', hi: 'भाषा', te: 'భాష', ml: 'ഭാഷ', kn: 'ಭಾಷೆ' },
};

export function t(key: string, lang: Lang): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en ?? entry.ta ?? key;
}
