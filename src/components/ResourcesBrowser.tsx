'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';

export interface ResourceRow {
  id: number;
  title: string;
  title_tamil: string | null;
  type: string;
  provider: string;
  url: string;
  youtube_id: string | null;
  description: string | null;
  description_tamil: string | null;
  language: string;
  level: string | null;
}

const TYPES = [
  { key: 'all', label: 'All', ta: 'அனைத்தும்' },
  { key: 'video', label: 'Videos', ta: 'வீடியோ' },
  { key: 'live_class', label: '🎥 Live teaching', ta: 'நேரடி வகுப்பு' },
  { key: 'playlist', label: 'Playlists', ta: 'பட்டியல்' },
  { key: 'course', label: 'Courses', ta: 'வகுப்புகள்' },
  { key: 'note', label: 'Notes', ta: 'குறிப்புகள்' },
  { key: 'guide', label: 'Guides', ta: 'மூலங்கள்' },
  { key: 'book', label: 'Books', ta: 'நூல்கள்' },
  { key: 'article', label: 'Articles', ta: 'எழுத்துக்கள்' },
] as const;

const PROVIDERS = [
  { key: 'all', label: 'All providers' },
  { key: 'youtube', label: '▶ YouTube' },
  { key: 'npel', label: '🎓 NPTEL' },
  { key: 'alison', label: '📗 Alison' },
  { key: 'other', label: '🌐 Other' },
] as const;

const LEVELS = [
  { key: 'all', label: 'Any level' },
  { key: 'beginner', label: ' Beginner' },
  { key: 'intermediate', label: '🌿 Intermediate' },
  { key: 'advanced', label: '🌳 Advanced' },
] as const;

const TYPE_ICON: Record<string, string> = { video: '🎬', live_class: '🎥', playlist: '📼', course: '🎓', note: '📝', book: '📕', guide: '🧭', article: '📰' };
const PROVIDER_STYLE: Record<string, string> = {
  youtube: 'border-red-400/30 bg-red-400/10 text-red-200',
  npel: 'border-brand-400/30 bg-brand-500/15 text-brand-200',
  alison: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  website: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  other: 'border-white/10 bg-white/5 text-ink-300',
};
const PROVIDER_NAME: Record<string, string> = { youtube: 'YouTube', npel: 'NPTEL', alison: 'Alison', website: 'Web', other: 'External' };

export function ResourcesBrowser({ resources }: { resources: ResourceRow[] }) {
  const [type, setType] = useState<string>('all');
  const [provider, setProvider] = useState<string>('all');
  const [level, setLevel] = useState<string>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (type !== 'all' && r.type !== type) return false;
      if (provider !== 'all' && r.provider !== provider) return false;
      if (level !== 'all' && r.level !== level) return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay = `${r.title} ${r.title_tamil ?? ''} ${r.description ?? ''} ${r.url}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [resources, type, provider, level, q]);

  const videos = filtered.filter((r) => r.youtube_id);
  const externals = filtered.filter((r) => !r.youtube_id);

  return (
    <div>
      {/* Filter bar */}
      <div className="card mb-8 space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {TYPES.map((tp) => (
            <button
              key={tp.key}
              type="button"
              onClick={() => setType(tp.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                type === tp.key
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow-sm'
                  : 'border border-white/10 bg-white/5 text-ink-400 hover:text-ink-100'
              }`}
            >
              {tp.label}
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
          {LEVELS.map((lv) => (
            <button
              key={lv.key}
              type="button"
              onClick={() => setLevel(lv.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                level === lv.key
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-glow-sm'
                  : 'border border-white/10 bg-white/5 text-ink-400 hover:text-ink-100'
              }`}
            >
              {lv.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {PROVIDERS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setProvider(p.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  provider === p.key ? 'bg-white/15 text-ink-950' : 'border border-white/10 bg-white/5 text-ink-400 hover:text-ink-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search resources…"
            aria-label="Search resources"
            className="ml-auto w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-ink-100 placeholder:text-ink-500 focus:border-brand-400/50 focus:outline-none sm:w-56"
          />
        </div>
      </div>

      {/* Embedded videos */}
      {videos.length > 0 && (
        <section aria-label="Video resources" className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink-950">
            <span aria-hidden>🎬</span> Watch · பார்க்க
            <span className="text-sm font-normal text-ink-500">({videos.length})</span>
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {videos.map((r) => (
              <article key={r.id} className="card p-4">
                <YouTubeEmbed videoId={r.youtube_id!} title={r.title} />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/watch/${r.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-400/30 bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-200 transition hover:bg-brand-500/25"
                  >
                    ⛶ Watch mode
                  </Link>
                  <span className={`badge ${PROVIDER_STYLE[r.provider] ?? PROVIDER_STYLE.other}`}>{PROVIDER_NAME[r.provider] ?? r.provider}</span>
                  {r.level && (
                    <span className="badge border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 capitalize">{r.level}</span>
                  )}
                  <span className="badge border border-white/10 bg-white/5 text-ink-400">{r.language === 'ta' ? 'தமிழ்' : r.language === 'en' ? 'English' : r.language}</span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-ink-950">
                  {r.title_tamil || r.title}
                  {r.title_tamil && <span className="ml-2 text-sm font-normal text-ink-500">{r.title}</span>}
                </h3>
                {r.description_tamil && <p className="mt-1 text-sm text-ink-400">{r.description_tamil}</p>}
                {r.description && <p className="mt-0.5 text-xs text-ink-500">{r.description}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Notes / books / guides / courses / playlists */}
      <section aria-label="Notes, books, guides and courses">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink-950">
          <span aria-hidden>📚</span> Read & Study · படிக்க
          <span className="text-sm font-normal text-ink-500">({externals.length})</span>
        </h2>
        {externals.length === 0 ? (
          <div className="card p-10 text-center text-sm text-ink-500">No resources match these filters.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {externals.map((r) => (
              <article key={r.id} className="card group flex flex-col p-5 transition hover:border-brand-400/30">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-xl">
                    {TYPE_ICON[r.type] ?? '📄'}
                  </span>
                  <span className={`badge ${PROVIDER_STYLE[r.provider] ?? PROVIDER_STYLE.other}`}>{PROVIDER_NAME[r.provider] ?? r.provider}</span>
                </div>
                <h3 className="text-base font-semibold leading-snug text-ink-950">{r.title_tamil || r.title}</h3>
                {r.title_tamil && <p className="mt-0.5 text-xs font-medium text-brand-300">{r.title}</p>}
                {r.description && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink-500">{r.description}</p>}
                {r.description_tamil && <p className="mt-1 line-clamp-2 text-xs text-ink-400">{r.description_tamil}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.level && (
                    <span className="badge border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 capitalize">{r.level}</span>
                  )}
                  <span className="badge border border-white/10 bg-white/5 text-ink-400">{r.language === 'ta' ? 'தமிழ்' : r.language === 'en' ? 'English' : r.language}</span>
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary mt-4 w-full text-center"
                >
                  Open in {PROVIDER_NAME[r.provider] ?? 'new tab'} ↗
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
