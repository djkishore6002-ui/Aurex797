import { cookies } from 'next/headers';
import { isLang, type Lang } from './i18n-data';

export * from './i18n-data';

/**
 * Solai display language — TAMIL FIRST.
 * `ta` is the default: Tamil text leads, English (and transliteration)
 * support it for foreign learners. The choice is kept in a cookie
 * (`solai_lang`) and, for signed-in users, on the profile
 * (`users.display_language`).
 */

/** Current UI language: cookie wins (fresh switch), else default 'ta'. */
export function getLang(): Lang {
  const c = cookies().get('solai_lang')?.value;
  if (isLang(c)) return c;
  return 'ta';
}
