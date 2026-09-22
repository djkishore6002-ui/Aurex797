import Link from 'next/link';
import { getDb } from '@/db';
import { getSettings, getHomepageSections, getBanners } from '@/lib/cms';
import { fmtDate } from '@/lib/utils';
import { Badge } from '@/components/ui';
import { DIFFICULTY_LABEL } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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
        <div className="bg-brand-900 px-4 py-2.5 text-center text-sm text-white">
          <Link href={banners[0].link_url ?? '#'} className="font-semibold underline decoration-marigold-400 underline-offset-4">
            {banners[0].title}
          </Link>
          {banners[0].body && <span className="ml-2 hidden text-brand-200 sm:inline">{banners[0].body}</span>}
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="container-page relative py-20 sm:py-28">
          <p className="tamil mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm">
            {settings.tagline}
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">{settings.hero_title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-brand-100">{settings.hero_subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={settings.hero_cta_href} className="btn bg-marigold-400 px-6 py-3 text-base font-bold text-brand-950 hover:bg-marigold-300">
              {settings.hero_cta_label}
            </Link>
            <Link href="/workshops" className="btn border border-white/30 bg-white/10 px-6 py-3 text-base font-semibold text-white hover:bg-white/20">
              See live workshops
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-200">
            <span>📚 6 structured levels</span>
            <span>🤖 AI Tamil Tutor</span>
            <span>🎤 Live workshops + 90% certificates</span>
            <span>🌏 5 explanation languages</span>
          </div>
        </div>
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
                <div key={s.id} className="-mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(items as { label: string; value: string }[]).map((it, i) => (
                    <div key={i} className="card rounded-2xl p-5 text-center shadow-md">
                      <p className="text-2xl font-extrabold text-brand-800">{it.value}</p>
                      <p className="mt-1 text-sm text-ink-500">{it.label}</p>
                    </div>
                  ))}
                </div>
              );
            case 'features':
              return (
                <div key={s.id} className="py-16">
                  <div className="mb-10 max-w-2xl">
                    <h2 className="text-3xl font-bold tracking-tight text-ink-950">{s.title}</h2>
                    <p className="mt-2 text-ink-500">{s.subtitle}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {(items as { icon: string; title: string; text: string }[]).map((it, i) => (
                      <div key={i} className="card p-6 transition-shadow hover:shadow-md">
                        <span aria-hidden className="text-3xl">{it.icon}</span>
                        <h3 className="mt-3 font-bold text-ink-950">{it.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{it.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            case 'levels':
              return (
                <div key={s.id} className="bg-white py-16">
                  <div className="container-page">
                    <div className="mb-10 max-w-2xl">
                      <h2 className="text-3xl font-bold tracking-tight text-ink-950">{s.title}</h2>
                      <p className="mt-2 text-ink-500">{s.subtitle}</p>
                    </div>
                    <ol className="space-y-3">
                      {(items as { tag: string; title: string; text: string }[]).map((it, i) => (
                        <li key={i} className="card flex flex-col gap-1 border-l-4 border-l-brand-600 p-5 sm:flex-row sm:items-center sm:gap-5">
                          <Badge tone="success">{it.tag}</Badge>
                          <p className="font-bold text-ink-950">{it.title}</p>
                          <p className="text-sm text-ink-500 sm:ml-auto sm:text-right">{it.text}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              );
            case 'quote': {
              const q = body as { text?: string; attribution?: string };
              return (
                <blockquote key={s.id} className="mx-auto my-16 max-w-3xl rounded-3xl bg-marigold-50 p-10 text-center">
                  <p className="tamil text-xl leading-relaxed text-ink-800 sm:text-2xl">“{q.text}”</p>
                  <footer className="mt-4 text-sm font-semibold text-marigold-800">— {q.attribution}</footer>
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
              <h2 className="text-2xl font-bold tracking-tight">Start with a course</h2>
              <Link href="/learn" className="text-sm font-semibold text-brand-700 hover:underline">
                All courses →
              </Link>
            </div>
            <div className="space-y-4">
              {courses.map((c) => (
                <Link key={c.slug} href={`/learn/${c.slug}`} className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-md">
                  <span aria-hidden className="tamil grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-800">
                    {c.title.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink-950">{c.title}</p>
                    <p className="truncate text-sm text-ink-500">{c.subtitle}</p>
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
              <h2 className="text-2xl font-bold tracking-tight">Upcoming live workshops</h2>
              <Link href="/workshops" className="text-sm font-semibold text-brand-700 hover:underline">
                All workshops →
              </Link>
            </div>
            <div className="space-y-4">
              {workshops.length === 0 && <p className="card p-6 text-sm text-ink-500">No upcoming workshops — check back soon!</p>}
              {workshops.map((w) => (
                <Link key={w.slug} href={`/workshops/${w.slug}`} className="card block p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-ink-950">{w.title}</p>
                    <Badge tone={w.price_cents > 0 ? 'warning' : 'success'}>{w.price_cents > 0 ? `₹${w.price_cents / 100}` : 'Free'}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
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
        <div className="rounded-3xl bg-brand-800 px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold tracking-tight">Your first வணக்கம் is one lesson away</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Create a free account, open Level 1, and meet the Tamil alphabet today. The AI tutor is already waiting.
          </p>
          <Link href="/register" className="btn mt-7 bg-marigold-400 px-8 py-3.5 text-base font-bold text-brand-950 hover:bg-marigold-300">
            Create free account
          </Link>
        </div>
      </section>
    </div>
  );
}
