'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Click-to-load YouTube embed with a guaranteed way to watch.
 *
 * Poster + play button first. On click the player mounts (autoplay) through
 * YouTube's IFrame API. Some channels switch off in-page embedding — YouTube
 * then shows "Error 153" and may or may not report it via the API. We handle
 * ALL cases so the user is never stuck on an error screen:
 *
 *  - onError fires            → open the video on YouTube in a new tab
 *  - video never starts
 *    playing within 10 s      → same fallback (catches silent 153s)
 *  - IFrame API itself fails  → plain iframe + visible "Open on YouTube" link
 *
 * The fallback card is worded plainly (no error codes) and always carries a
 * big ▶ button to YouTube.
 */

type YTPlayer = { destroy?: () => void };
type YTNamespace = { Player: new (el: HTMLElement, opts: unknown) => YTPlayer };
declare global {
  interface Window {
    YT?: YTNamespace & { loaded?: number };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  const w = window as Window;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    let settled = false;
    const fail = (msg: string) => {
      if (!settled) {
        settled = true;
        reject(new Error(msg));
      }
    };
    const ok = () => {
      if (!settled) {
        settled = true;
        if (w.YT?.Player) resolve(w.YT);
        else fail('YT namespace incomplete');
      }
    };
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      ok();
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => fail('iframe_api failed to load');
    document.head.appendChild(s);
    window.setTimeout(ok, 8000);
  });
  return apiPromise;
}

type State = 'idle' | 'loading' | 'playing' | 'fallback' | 'raw';

export function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [state, setState] = useState<State>('idle');
  const [opened, setOpened] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function openOnYouTube(): boolean {
    const win = window.open(watchUrl, '_blank', 'noopener,noreferrer');
    setOpened(Boolean(win));
    return Boolean(win);
  }

  function toFallback() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setState('fallback');
    openOnYouTube();
  }

  function start() {
    setState('loading');
    loadYouTubeApi()
      .then((YT) => {
        const el = hostRef.current;
        if (!el) return;
        el.innerHTML = '';
        const mount = document.createElement('div');
        el.appendChild(mount);
        // Safety net: if the video never reaches the PLAYING state
        // (channel blocks embedding → silent error 153), bail out and
        // open it on YouTube.
        timerRef.current = window.setTimeout(toFallback, 10000);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new YT.Player(mount, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1, autoplay: 1 },
          events: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onStateChange: (e: any) => {
              if (e.data === 1) {
                // PLAYING — inline playback is working.
                if (timerRef.current) window.clearTimeout(timerRef.current);
                setState('playing');
              }
            },
            onError: () => toFallback(), // 153/150/101/… — not embeddable
          },
        });
      })
      .catch(() => setState('raw'));
  }

  if (state === 'fallback') {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-brand-400/30 bg-black/40 p-4 text-center">
        <span aria-hidden className="text-3xl">▶</span>
        <p className="tamil text-sm font-semibold leading-relaxed text-ink-100">
          {opened
            ? 'வீடியோ YouTube-இல் திறக்கப்பட்டது'
            : 'வீடியோ இங்கே இயங்கவில்லை — YouTube-இல் பார்க்கவும்'}
        </p>
        <p className="text-[11px] leading-relaxed text-ink-400">
          {opened
            ? 'The video was opened on YouTube in a new tab.'
            : 'This video cannot play inside the page (the channel blocks embedding) — watch it on YouTube.'}
        </p>
        <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="btn-primary px-5 py-2 text-sm">
          ▶ YouTube-இல் பார்க்க <span className="hidden sm:inline">· Watch on YouTube</span>
        </a>
      </div>
    );
  }

  if (state === 'raw') {
    return (
      <div>
        <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-glow-sm">
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </div>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200"
        >
          ▶ Not playing? Open on YouTube
        </a>
      </div>
    );
  }

  if (state === 'loading' || state === 'playing') {
    return (
      <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-glow-sm">
        <div className="aspect-video">
          {state === 'loading' && (
            <div className="grid h-full w-full place-items-center">
              <span className="text-sm text-ink-400">Loading player…</span>
            </div>
          )}
          <div ref={hostRef} className="absolute inset-0" />
        </div>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-1.5 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/80 opacity-0 transition hover:opacity-100"
        >
          ↗ YouTube
        </a>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      className="group relative block w-full overflow-hidden rounded-xl border border-white/10 bg-black/40"
      aria-label={`Play video: ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
        alt={title}
        className="aspect-video w-full object-cover opacity-80 transition duration-300 group-hover:scale-[1.02] group-hover:opacity-100"
      />
      <span className="absolute inset-0 grid place-items-center bg-black/30 transition group-hover:bg-black/20">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 text-2xl text-white shadow-glow-lg transition group-hover:scale-110">
          ▶
        </span>
      </span>
      <span className="absolute bottom-2 left-3 right-3 truncate text-left text-xs font-medium text-white/90">{title}</span>
    </button>
  );
}
