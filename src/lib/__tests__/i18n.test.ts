import { describe, expect, it } from 'vitest';
import { LANGS, NATIVE_LANG_OPTIONS, isLang, bi, t } from '@/lib/i18n-data';

describe('language registry', () => {
  it('lists 14 languages with Tamil first (Tamil-first platform)', () => {
    expect(LANGS.length).toBe(14);
    expect(LANGS[0]!.code).toBe('ta');
  });

  it('includes the world\'s 10 most-spoken languages', () => {
    const codes = new Set<string>(LANGS.map((l) => l.code));
    for (const c of ['en', 'zh', 'hi', 'es', 'fr', 'ar', 'bn', 'ru', 'pt', 'id']) expect(codes.has(c)).toBe(true);
  });

  it('validates language codes', () => {
    expect(isLang('ta')).toBe(true);
    expect(isLang('zh')).toBe(true);
    expect(isLang('xx')).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });
});

describe('bi (bilingual display)', () => {
  it('Tamil leads for ta and Indic languages', () => {
    expect(bi('கோவில்', 'Temple', 'ta')).toEqual({ main: 'கோவில்', sub: 'Temple' });
    expect(bi('கோவில்', 'Temple', 'hi')).toEqual({ main: 'கோவில்', sub: 'Temple' });
  });

  it('English leads for en', () => {
    expect(bi('கோவில்', 'Temple', 'en')).toEqual({ main: 'Temple', sub: 'கோவில்' });
  });
});

describe('t (chrome translations)', () => {
  it('returns the translation for a known key + language', () => {
    expect(t('nav_courses', 'ta')).toBe('வகுப்புகள்');
    expect(t('nav_courses', 'en')).toBe('Courses');
    expect(t('nav_courses', 'zh')).toBe('课程');
    expect(t('nav_culture', 'es')).toBe('Cultura');
    expect(t('sign_in', 'ar')).toBe('تسجيل الدخول');
    expect(t('free', 'id')).toBe('Gratis');
  });

  it('falls back to English, then the key itself', () => {
    expect(t('no_such_key', 'ta')).toBe('no_such_key');
  });

  it('covers all 14 languages for the main nav keys', () => {
    for (const { code } of LANGS) {
      for (const key of ['nav_courses', 'nav_culture', 'home', 'learn', 'free', 'language']) {
        const v = t(key, code);
        expect(v).not.toBe(key); // no untranslated key
      }
    }
  });
});

describe('NATIVE_LANG_OPTIONS (register / profile)', () => {
  it('offers the world\'s 10 languages plus Indian regionals + Tamil', () => {
    const codes = new Set<string>(NATIVE_LANG_OPTIONS.map(([c]) => c));
    expect(codes.size).toBe(14);
    for (const c of ['en', 'zh', 'hi', 'es', 'fr', 'ar', 'bn', 'ru', 'pt', 'id', 'te', 'ml', 'kn', 'ta']) {
      expect(codes.has(c)).toBe(true);
    }
  });

  it('every option code is a valid display language', () => {
    for (const [c] of NATIVE_LANG_OPTIONS) expect(isLang(c)).toBe(true);
  });
});
