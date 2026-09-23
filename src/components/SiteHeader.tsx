import Link from 'next/link';
import { cookies } from 'next/headers';
import { getDb } from '@/db';
import { getNav, type SiteSettings } from '@/lib/cms';
import { getCurrentUser } from '@/lib/auth';
import { getLang, bi, t, isLang } from '@/lib/i18n';
import { NotificationBell } from '@/components/NotificationBell';
import { SearchButton } from '@/components/SearchButton';
import { UserMenu } from '@/components/UserMenu';
import { LangSwitch } from '@/components/LangSwitch';

/** Map a nav href to its bilingual label (Tamil-first). */
const NAV_LABELS: Record<string, { ta: string; en: string }> = {
  '/learn': { ta: 'வகுப்புகள்', en: 'Courses' },
  '/workshops': { ta: 'பட்டறைகள்', en: 'Workshops' },
  '/vocabulary': { ta: 'வார்த்தைகள்', en: 'Vocabulary' },
  '/practice': { ta: 'பழகல்', en: 'Practice' },
  '/resources': { ta: 'வளங்கள்', en: 'Resources' },
  '/culture': { ta: 'கலாசாரம்', en: 'Culture' },
  '/community': { ta: 'சமூகம்', en: 'Community' },
  '/faq': { ta: 'பொது கேள்விகள்', en: 'FAQ' },
  '/dashboard': { ta: 'முகப்பு', en: 'Home' },
};

function navLabel(href: string, label: string, lang: ReturnType<typeof getLang>) {
  const m = NAV_LABELS[href];
  if (!m) return { main: label, sub: null };
  return bi(m.ta, m.en, lang);
}

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const db = getDb();
  const nav = getNav(db, 'header');
  const user = getCurrentUser();
  const lang = getLang();
  // AI-tutor native language: profile when signed in, else the guest cookie.
  // (Static snapshot build: no cookies, profile check already returns null.)
  const nativeCookie = process.env.SOLAI_STATIC === '1' ? undefined : cookies().get('solai_native')?.value;
  const native = user?.native_language ?? (isLang(nativeCookie) ? nativeCookie : null);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060913]/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center gap-3">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5" aria-label={`${settings.site_name} home`}>
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-cyan-500 text-lg font-bold text-white shadow-glow-sm">
            ச
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-base font-extrabold tracking-tight text-ink-950">{settings.site_name}</span>
            <span className="text-[11px] font-medium text-brand-300/80">தமிழ் கற்றல் தோட்டம் · Tamil Learning Garden</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-0.5 lg:flex">
          {nav.map((n) => {
            const l = navLabel(n.href, n.label, lang);
            return (
              <Link
                key={n.id}
                href={n.href}
                className="group rounded-lg px-3 py-2 text-sm font-medium text-ink-400 transition-colors hover:bg-white/5 hover:text-ink-950"
              >
                <span className="block leading-tight">
                  {l.main}
                  {l.sub && (
                    <span className="block text-[10px] font-normal text-ink-500 group-hover:text-brand-300">{l.sub}</span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <LangSwitch current={lang} native={user?.native_language ?? null} />
          <SearchButton />
          {user && <NotificationBell />}
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="hidden text-sm font-medium text-ink-300 xl:inline">Vanakkam, {user.name.split(' ')[0]} 👋</span>
              <UserMenu user={{ id: user.id, name: user.name, role: user.role }} />
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="btn-ghost">
                {t('sign_in', lang)}
              </Link>
              <Link href="/register" className="btn-primary">
                {t('sign_up', lang)}
              </Link>
            </div>
          )}
          <UserMenu user={user ? { id: user.id, name: user.name, role: user.role } : null} mobile />
        </div>
      </div>
      {/* Secondary mobile nav row */}
      <nav aria-label="Secondary" className="flex items-center gap-1 overflow-x-auto border-t border-white/5 px-3 py-1.5 lg:hidden">
        {nav.map((n) => (
          <Link key={n.id} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink-400 hover:bg-white/5 hover:text-ink-950">
            {navLabel(n.href, n.label, lang).main}
          </Link>
        ))}
        {!user && (
          <>
            <Link href="/login" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-300">
              Log in
            </Link>
            <Link href="/register" className="whitespace-nowrap rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white">
              Start free
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
