import Link from 'next/link';
import { getDb } from '@/db';
import { getSettings, getHomepageSections, getBanners } from '@/lib/cms';
import { fmtDate } from '@/lib/utils';
import { Badge } from '@/components/ui';
import { DIFFICULTY_LABEL } from '@/lib/utils';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

const HERO_STATS = [
  { icon: '📚', label: 'Structured levels' },
  { icon: '🤖', label: 'AI Tamil Tutor' },
  { icon: '🎤', label: 'Workshops + certificates' },
  { icon: '🌏', label: '14 learner languages' },
  { icon: '🎓', label: 'Free NPTEL · YT · Alison resources' },
  { icon: '🛕', label: '3D culture & heritage explorer' },
];

/** The world's most-spoken languages — Solai welcomes learners of all of them. */
const WORLD_LANGS = [
  { native: 'English', flag: '🇬🇧' },
  { native: '中文', flag: '🇨🇳' },
  { native: 'हिन्दी', flag: '🇮🇳' },
  { native: 'Español', flag: '🇪🇸' },
  { native: 'Français', flag: '🇫🇷' },
  { native: 'العربية', flag: '🕌' },
  { native: 'বাংলা', flag: '🇧🇩' },
  { native: 'Русский', flag: '🇷🇺' },
  { native: 'Português', flag: '🇧🇷' },
  { native: 'Bahasa Indonesia', flag: '🇮🇩' },
];

export default function HomePage() {
  const db = getDb();
  const settings = getSettings();
  const sections = getHomepageSections(db);
  const banners = getBanners(db);

  const courses = db
    .prepare(
      `SELECT c.slug, c.title, c.subtitle, c.difficulty, c.level_tag, c.price_cents,
        (SELECT COUNT(*) FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = c.id AND l.is_published = 1) AS lesson_count
       FROM courses c WHERE c.is_published = 1 AND c.deleted_at IS NULL ORDER BY c.sort_order LIMIT 3`
    )
    .all() as unknown as { slug: string; title: string; subtitle: string | null; difficulty: string; level_tag: string | null; price_cents: number; lesson_count: number }[];

  const workshops = db
    .prepare(
      `SELECT w.slug, w.title, w.starts_at, w.price_cents, w.capacity,
        (SELECT COUNT(*) FROM workshop_registrations r WHERE r.workshop_id = w.id AND r.status IN ('CONFIRMED','PAID')) AS seats
       FROM workshops w WHERE w.is_published = 1 AND w.deleted_at IS NULL AND w.starts_at > datetime('now') ORDER BY w.starts_at LIMIT 3`
    )
    .all() as unknown as { slug: string; title: string; starts_at: string; price_cents: number; capacity: number; seats: number }[];

  return (
    <div>
      {/* Banner */}
      {banners.length > 0 && (
        <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-950 px-4 py-2.5 text-center text-sm text-white">
          <Link href={banners[0].link_url ?? '#'} className="font-semibold underline decoration-marigold-400 underline-offset-4">
            {banners[0].title}
          </Link>
          {banners[0].body && <span className="ml-2 hidden text-brand-200 sm:inline">{banners[0].body}</span>}
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* aurora orbs */}
        <div aria-hidden className="orb -top-40 -left-32 h-[28rem] w-[28rem] bg-brand-600/30 animate-drift" />
        <div aria-hidden className="orb -top-24 right-[-10rem] h-[26rem] w-[26rem] bg-cyan-400/15 animate-float" />
        <div aria-hidden className="orb top-64 left-1/3 h-72 w-72 bg-fuchsia-500/10 animate-drift [animation-delay:4s]" />
        <div aria-hidden className="hero-grid pointer-events-none absolute inset-0" />

        <div className="container-page relative py-20 sm:py-28">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-200 backdrop-blur">
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
            </span>
            <span className="tamil">{settings.tagline}</span>
          </p>
          {/* Tamil-first greeting line */}
          <p aria-hidden className="tamil mb-3 text-2xl font-bold text-marigold-300/90 sm:text-3xl">
            வணக்கம்! தமிழ் கற்போம்.
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-gradient-soft sm:text-5xl lg:text-6xl">
            {settings.hero_title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-400 sm:text-xl">{settings.hero_subtitle}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={settings.hero_cta_href} className="btn-primary px-7 py-3.5 text-base">
              {settings.hero_cta_label}
              <span aria-hidden className="text-lg leading-none">→</span>
            </Link>
            <Link href="/workshops" className="btn-secondary px-7 py-3.5 text-base">
              See live workshops
            </Link>
            <Link href="/resources" className="btn-secondary px-7 py-3.5 text-base">
              🎓 Free resources
            </Link>
            <Link href="/culture" className="btn-secondary px-7 py-3.5 text-base">
              🛕 Tamil culture
            </Link>
          </div>

          {/* Learners of the world's languages are welcome */}
          <div className="mt-10 max-w-3xl">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-500">
              Learn Tamil from your language · உங்கள் மொழியிலிருந்து தமிழ் கற்றுக்கொள்ளுங்கள்
            </p>
            <div className="flex flex-wrap gap-1.5">
              {WORLD_LANGS.map((l) => (
                <span key={l.native} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-brand-400/40 hover:text-ink-100">
                  <span aria-hidden className="mr-1">{l.flag}</span>
                  {l.native}
                </span>
              ))}
              <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-200">
                + Telugu · Malayalam · Kannada
              </span>
            </div>
            <p className="mt-2 text-[11px] text-ink-500">
              The AI tutor explains in your language — always with Tamil script, transliteration and English.
            </p>
          </div>

          <div className="mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
            {HERO_STATS.map((s) => (
              <div key={s.label} className="glass px-4 py-3 text-xs font-medium text-ink-300 transition-colors hover:border-brand-400/40 sm:text-[13px]">
                <span aria-hidden className="mr-1.5">{s.icon}</span>
                {s.label}
              </div>
            ))}
          </div>
        </div>
        {/* bottom fade into page */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#060913]" />
      </section>

      {/* CMS-driven sections */}
      <section className="container-page">
        {sections.map((s) => {
          let body: Record<string, unknown> = {};
          try {
            body = JSON.parse(s.body_json);
          } catch {
            body = {};
          }
          const items = (body.items ?? []) as unknown as Record<string, string>[];
          switch (s.type) {
            case 'stats':
              return (
                <div key={s.id} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(items as { label: string; value: string }[]).map((it, i) => (
                    <div key={i} className="card rounded-2xl p-5 text-center transition-colors hover:border-brand-400/40">
                      <p className="text-gradient text-2xl font-extrabold sm:text-3xl">{it.value}</p>
                      <p className="mt-1.5 text-sm text-ink-400">{it.label}</p>
                    </div>
                  ))}
                </div>
              );
            case 'features':
              return (
                <div key={s.id} className="py-16">
                  <div className="mb-10 max-w-2xl">
                    <h2 className="text-3xl font-bold tracking-tight text-ink-950">{s.title}</h2>
                    <p className="mt-2 text-ink-400">{s.subtitle}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {(items as { icon: string; title: string; text: string }[]).map((it, i) => (
                      <div key={i} className="card group p-6 transition-all hover:-translate-y-0.5 hover:border-brand-400/40 hover:shadow-glow-sm">
                        <span aria-hidden className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand-500/25 to-cyan-400/15 text-2xl ring-1 ring-white/10">
                          {it.icon}
                        </span>
                        <h3 className="mt-4 font-bold text-ink-950">{it.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{it.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            case 'levels':
              return (
                <div key={s.id} className="py-16">
                  <div className="mb-10 max-w-2xl">
                    <h2 className="text-3xl font-bold tracking-tight text-ink-950">{s.title}</h2>
                    <p className="mt-2 text-ink-400">{s.subtitle}</p>
                  </div>
                  <ol className="space-y-3">
                    {(items as { tag: string; title: string; text: string }[]).map((it, i) => (
                      <li key={i} className="card flex flex-col gap-1 border-l-2 border-l-brand-500 p-5 transition-colors hover:border-brand-400/60 sm:flex-row sm:items-center sm:gap-5">
                        <Badge tone="success">{it.tag}</Badge>
                        <p className="font-bold text-ink-950">{it.title}</p>
                        <p className="text-sm text-ink-400 sm:ml-auto sm:text-right">{it.text}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            case 'quote': {
              const q = body as { text?: string; attribution?: string };
              return (
                <blockquote key={s.id} className="my-16 rounded-3xl border border-marigold-400/20 bg-gradient-to-br from-marigold-400/10 via-transparent to-brand-500/10 p-10 text-center backdrop-blur">
                  <p className="tamil text-xl leading-relaxed text-ink-800 sm:text-2xl">“{q.text}”</p>
                  <footer className="mt-4 text-sm font-semibold text-marigold-300">— {q.attribution}</footer>
                </blockquote>
              );
            }
            default:
              return null;
          }
        })}
      </section>

      {/* Featured courses + workshops */}
      <section className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-5 flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-ink-950">Start with a course</h2>
              <Link href="/learn" className="text-sm font-semibold text-brand-400 hover:underline">
                All courses →
              </Link>
            </div>
            <div className="space-y-4">
              {courses.map((c) => (
                <Link key={c.slug} href={`/learn/${c.slug}`} className="card group flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-brand-400/40 hover:shadow-glow-sm">
                  <span aria-hidden className="tamil grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white shadow-glow-sm">
                    {c.title.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink-950 group-hover:text-white">{c.title}</p>
                    <p className="truncate text-sm text-ink-400">{c.subtitle}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone="success">{c.level_tag ?? DIFFICULTY_LABEL[c.difficulty]}</Badge>
                      <Badge>{c.lesson_count} lessons</Badge>
                      <Badge tone={c.price_cents > 0 ? 'warning' : 'default'}>{c.price_cents > 0 ? `₹${c.price_cents / 100}` : 'Free'}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-5 flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-ink-950">Upcoming live workshops</h2>
              <Link href="/workshops" className="text-sm font-semibold text-brand-400 hover:underline">
                All workshops →
              </Link>
            </div>
            <div className="space-y-4">
              {workshops.length === 0 && <p className="card p-6 text-sm text-ink-400">No upcoming workshops — check back soon!</p>}
              {workshops.map((w) => (
                <Link key={w.slug} href={`/workshops/${w.slug}`} className="card block p-5 transition-all hover:-translate-y-0.5 hover:border-brand-400/40 hover:shadow-glow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-ink-950">{w.title}</p>
                    <Badge tone={w.price_cents > 0 ? 'warning' : 'success'}>{w.price_cents > 0 ? `₹${w.price_cents / 100}` : 'Free'}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-400">
                    {fmtDate(w.starts_at)} · {w.seats}/{w.capacity} seats filled
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-brand-400/25 bg-gradient-to-br from-brand-950 via-[#171033] to-[#0a1225] px-8 py-14 text-center">
          <div aria-hidden className="orb -top-24 left-1/4 h-64 w-64 bg-brand-500/40 animate-float" />
          <div aria-hidden className="orb -bottom-28 right-1/5 h-64 w-64 bg-cyan-400/20 animate-drift" />
          <div className="relative">
            <h2 className="text-gradient-soft text-3xl font-bold tracking-tight">Your first வணக்கம் is one lesson away</h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-300">
              Create a free account, open Level 1, and meet the Tamil alphabet today. The AI tutor is already waiting.
            </p>
            <Link href="/register" className="btn mt-7 bg-gradient-to-r from-marigold-300 to-marigold-400 px-9 py-3.5 text-base font-bold text-[#1a1005] shadow-[0_12px_36px_-10px_rgba(251,191,36,0.6)] hover:brightness-110">
              Create free account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
