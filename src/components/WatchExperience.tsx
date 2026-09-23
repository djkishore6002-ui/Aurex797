'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';

export interface WatchResource {
  id: number;
  title: string;
  titleTamil: string | null;
  description: string | null;
  descriptionTamil: string | null;
  language: string;
  provider: string;
  url: string;
  youtubeId: string;
  isLiveClass: boolean;
}

interface CurriculumItem {
  id: number;
  title: string;
  title_tamil: string | null;
}

const WATCHED_KEY = 'solai.watched.v1';

function loadWatched(): number[] {
  try {
    const raw = window.localStorage.getItem(WATCHED_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is number => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

/**
 * LMS-grade watch screen: a focused, player-first lesson page with the full
 * batch curriculum beside it, progress tracking and prev/next navigation —
 * the "watch a lecture" experience, modelled on Frappe LMS.
 */
export function WatchExperience({
  resource,
  curriculum,
  prev,
  next,
  currentIndex,
}: {
  resource: WatchResource;
  curriculum: CurriculumItem[];
  prev: CurriculumItem | null;
  next: CurriculumItem | null;
  currentIndex: number;
}) {
  const [watched, setWatched] = useState<number[]>([]);
  useEffect(() => {
    setWatched(loadWatched());
  }, []);

  const markWatched = useCallback(() => {
    setWatched((w) => {
      if (w.includes(resource.id)) return w;
      const nw = [...w, resource.id];
      try {
        window.localStorage.setItem(WATCHED_KEY, JSON.stringify(nw));
      } catch {
        /* storage unavailable */
      }
      return nw;
    });
  }, [resource.id]);

  const seriesWatched = watched.filter((id) => curriculum.some((c) => c.id === id)).length;
  const pct = curriculum.length ? Math.round((seriesWatched / curriculum.length) * 100) : 0;
  const isWatched = watched.includes(resource.id);
  const langLabel = resource.language === 'ta' ? 'தமிழ்' : resource.language === 'en' ? 'English' : resource.language;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060913]/85 backdrop-blur-xl">
        <div className="container-page flex items-center gap-3 py-3">
          <Link
            href="/resources"
            className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
            aria-label="Back to resource library"
          >
            ← Library
          </Link>
          <div className="min-w-0 flex-1">
            <p className="tamil truncate text-sm font-bold text-ink-950">
              {resource.isLiveClass ? 'Kaviyarasi ECE · A Batch' : 'Video lessons'}
            </p>
            <p className="truncate text-[11px] text-ink-500">
              Lecture {currentIndex + 1} of {curriculum.length} · {seriesWatched} watched · {pct}%
            </p>
          </div>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary hidden shrink-0 px-3 py-1.5 text-xs sm:inline-flex"
          >
            ↗ YouTube
          </a>
        </div>
        {/* Series progress */}
        <div className="h-0.5 w-full bg-white/10" aria-hidden>
          <div
            className="h-full bg-gradient-to-r from-brand-500 via-brand-400 to-cyan-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </header>

      <div className="container-page grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_330px]">
        <main className="min-w-0">
          {/* Player — glow-framed, the hero of the page */}
          <div className="animate-fade-up rounded-2xl bg-gradient-to-br from-brand-500/40 via-white/10 to-cyan-400/40 p-px shadow-glow-lg">
            <div className="overflow-hidden rounded-2xl bg-[#0d1326]">
              <YouTubeEmbed videoId={resource.youtubeId} title={resource.title} onPlaying={markWatched} />
            </div>
          </div>

          {/* Title block */}
          <div className="animate-fade-up mt-6 [animation-delay:80ms]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge border border-red-400/30 bg-red-400/10 text-red-200">▶ YouTube</span>
              <span className="badge border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">{langLabel}</span>
              {resource.isLiveClass && (
                <span className="badge border border-brand-400/30 bg-brand-500/15 text-brand-200">🎥 Live teaching</span>
              )}
              {isWatched && (
                <span className="badge border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">✓ Watched</span>
              )}
            </div>
            <h1 className="tamil mt-3 text-2xl font-bold leading-snug text-ink-950 sm:text-3xl">
              {resource.titleTamil || resource.title}
            </h1>
            {resource.titleTamil && <p className="mt-1 text-sm text-ink-400">{resource.title}</p>}
            {(resource.descriptionTamil || resource.description) && (
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-300">
                {resource.descriptionTamil || resource.description}
              </p>
            )}
          </div>

          {/* Prev / next — the LMS continue-learning flow */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link href={`/watch/${prev.id}`} className="card group p-4 transition hover:border-brand-400/40">
                <p className="text-xs font-semibold text-ink-500 group-hover:text-brand-300">← Previous lecture</p>
                <p className="tamil mt-1 truncate text-sm font-semibold text-ink-950">
                  {watched.includes(prev.id) ? '✓ ' : ''}
                  {prev.title_tamil || prev.title}
                </p>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/watch/${next.id}`}
                className="card group p-4 text-right transition hover:border-cyan-400/40"
                aria-label="Next lecture"
              >
                <p className="text-xs font-semibold text-ink-500 group-hover:text-cyan-300">Next lecture →</p>
                <p className="tamil mt-1 truncate text-sm font-semibold text-ink-950">{next.title_tamil || next.title}</p>
              </Link>
            ) : (
              <span />
            )}
          </div>

          {/* Keep-learning nudge when the series is done */}
          {!next && (
            <div className="card mt-3 flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="tamil text-sm font-bold text-ink-950">இந்த batch முடிந்தது 🎉</p>
                <p className="text-xs text-ink-400">You&apos;re at the last lecture of this batch.</p>
              </div>
              <Link href="/resources" className="btn-primary">
                Explore more resources →
              </Link>
            </div>
          )}
        </main>

        {/* Curriculum sidebar */}
        <aside aria-label="Batch curriculum" className="animate-fade-up [animation-delay:140ms]">
          <div className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-hidden p-0">
            <div className="border-b border-white/10 px-4 py-3">
              <h2 className="tamil text-sm font-bold text-ink-950">
                {resource.isLiveClass ? 'Batch curriculum · வகுப்பு பட்டியல்' : 'All video lessons'}
              </h2>
              <p className="text-[11px] text-ink-500">
                {curriculum.length} lectures · {pct}% watched
              </p>
            </div>
            <ol className="max-h-[calc(100vh-11rem)] space-y-1 overflow-y-auto p-2">
              {curriculum.map((c, i) => {
                const active = c.id === resource.id;
                const done = watched.includes(c.id);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/watch/${c.id}`}
                      aria-current={active ? 'true' : undefined}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                        active
                          ? 'bg-gradient-to-r from-brand-600/30 to-cyan-500/15 ring-1 ring-brand-400/40'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                          done
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : active
                              ? 'bg-brand-500/30 text-brand-200'
                              : 'bg-white/5 text-ink-500'
                        }`}
                      >
                        {done ? '✓' : i + 1}
                      </span>
                      <span
                        className={`tamil min-w-0 truncate text-xs ${
                          active ? 'font-bold text-ink-950' : done ? 'text-ink-300' : 'text-ink-400'
                        }`}
                      >
                        {c.title_tamil || c.title}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            {next && (
              <div className="border-t border-white/10 p-3">
                <Link href={`/watch/${next.id}`} className="btn-primary w-full justify-center text-xs">
                  ▶ Next lecture — {next.title_tamil || next.title}
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
