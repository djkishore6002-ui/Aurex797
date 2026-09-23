import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { isLang } from '@/lib/i18n';

const COOKIE = 'solai_lang';
const NATIVE_COOKIE = 'solai_native';

/** Current effective display + AI-native language. */
export async function GET() {
  const store = await cookies();
  const c = store.get(COOKIE)?.value;
  const n = store.get(NATIVE_COOKIE)?.value;
  return NextResponse.json({
    lang: isLang(c) ? c : 'ta',
    native: isLang(n) ? n : 'en',
  });
}

/**
 * Set the display language and/or the AI tutor's native language.
 *  - `lang`   → UI display language (cookie always; users.display_language when signed in)
 *  - `native` → the language the AI tutor explains Tamil in (cookie always;
 *               users.native_language when signed in)
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as unknown as { lang?: unknown; native?: unknown } | null;
    const lang = body?.lang;
    const native = body?.native;
    const store = await cookies();
    const user = getCurrentUser();
    const opts = { maxAge: 60 * 60 * 24 * 365, httpOnly: false, sameSite: 'lax' as const, path: '/' };

    if (lang !== undefined) {
      if (!isLang(lang)) return NextResponse.json({ ok: false, error: 'Unsupported language' }, { status: 400 });
      store.set(COOKIE, lang, opts);
      if (user) {
        getDb().prepare('UPDATE users SET display_language = ?, updated_at = datetime(\'now\') WHERE id = ?').run(lang, user.id);
      }
    }

    if (native !== undefined) {
      if (!isLang(native)) return NextResponse.json({ ok: false, error: 'Unsupported language' }, { status: 400 });
      store.set(NATIVE_COOKIE, native, opts);
      if (user) {
        getDb().prepare('UPDATE users SET native_language = ?, updated_at = datetime(\'now\') WHERE id = ?').run(native, user.id);
      }
    }

    return NextResponse.json({ ok: true, lang: isLang(lang) ? lang : undefined, native: isLang(native) ? native : undefined });
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}
