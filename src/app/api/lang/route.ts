import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { isLang, type Lang } from '@/lib/i18n';

const COOKIE = 'solai_lang';

/** Current effective language (cookie, else Tamil-first default). */
export async function GET() {
  const store = await cookies();
  const c = store.get(COOKIE)?.value;
  return NextResponse.json({ lang: isLang(c) ? c : 'ta' });
}

/** Set the display language. Persists in a cookie (all users) and, when
 *  signed in, on the profile (users.display_language). */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as unknown as { lang?: unknown } | null;
    const lang = body?.lang;
    if (!isLang(lang)) return NextResponse.json({ ok: false, error: 'Unsupported language' }, { status: 400 });
    const store = await cookies();
    store.set(COOKIE, lang, { maxAge: 60 * 60 * 24 * 365, httpOnly: false, sameSite: 'lax', path: '/' });
    const user = getCurrentUser();
    if (user) {
      getDb().prepare('UPDATE users SET display_language = ?, updated_at = datetime(\'now\') WHERE id = ?').run(lang, user.id);
    }
    return NextResponse.json({ ok: true, lang });
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}
