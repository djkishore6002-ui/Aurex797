/** Shared metadata for culture categories (icons, bilingual labels, accents). */
export const CATEGORY_META: Record<string, { icon: string; label_ta: string; label_en: string; accent: string }> = {
  temple: { icon: '🛕', label_ta: 'கோவில்', label_en: 'Temples', accent: 'from-brand-500/30 to-cyan-500/20' },
  heritage: { icon: '🏰', label_ta: 'கோட்டை & நினைவுகள்', label_en: 'Forts & Heritage', accent: 'from-brand-500/30 to-cyan-500/20' },
  inscription: { icon: '🪨', label_ta: 'கல்வெட்டு', label_en: 'Inscriptions', accent: 'from-marigold-400/25 to-brand-500/20' },
  food: { icon: '🍲', label_ta: 'உணவு', label_en: 'Food', accent: 'from-marigold-400/25 to-red-400/15' },
  festival: { icon: '🎉', label_ta: 'திருவிழா', label_en: 'Festivals', accent: 'from-marigold-400/25 to-brand-500/20' },
  dance: { icon: '🎭', label_ta: 'நாடகம்', label_en: 'Dance', accent: 'from-brand-500/30 to-marigold-400/20' },
  music: { icon: '🎵', label_ta: 'இசை', label_en: 'Music', accent: 'from-cyan-500/25 to-brand-500/20' },
  dress: { icon: '👗', label_ta: 'அலங்காரம்', label_en: 'Traditional Dress', accent: 'from-marigold-400/25 to-cyan-500/20' },
  region: { icon: '🗣️', label_ta: 'பகுதி மொழி', label_en: 'Regional Tamil', accent: 'from-brand-500/30 to-cyan-500/20' },
  object: { icon: '🏺', label_ta: 'பொருள்', label_en: 'Museum Objects', accent: 'from-marigold-400/25 to-brand-500/20' },
  craft: { icon: '🖌️', label_ta: 'கைவினை', label_en: 'Crafts', accent: 'from-cyan-500/25 to-marigold-400/20' },
};

export const CATEGORY_ICON: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_META).map(([k, v]) => [k, v.icon])
);
