'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Click-to-load YouTube embed with graceful fallback.
 *
 * Shows a poster + play button first and mounts the player only on click
 * (keeps pages fast). The player is created through YouTube's IFrame API so
 * we can catch play-block errors — most importantly **error 153** ("cannot
 * be played in an iframe", the channel disabled embeds) — and swap in a clean
 * "Watch on YouTube ↗" card instead of a broken player.
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
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (w.YT?.Player) resolve(w.YT);
      else reject(new Error('YT namespace incomplete'));
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => reject(new Error('iframe_api failed to load'));
    document.head.appendChild(s);
    // Safety: if the script never fires the callback, fail fast.
    window.setTimeout(() => {
      if (w.YT?.Player) resolve(w.YT);
    }, 4000);
  });
  return apiPromise;
}

type State = 'idle' | 'loading' | 'playing' | 'blocked' | 'raw';

export function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [state, setState] = useState<State>('idle');
  const hostRef = useRef<HTMLDivElement>(null);
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  useEffect(() => {
    return () => {
      // player cleanup happens inside start(); nothing persistent to tear down here
    };
  }, []);

  function start() {
    setState('loading');
    loadYouTubeApi()
      .then((YT) => {
        const el = hostRef.current;
        if (!el) return;
        el.innerHTML = '';
        const mount = document.createElement('div');
        el.appendChild(mount);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new YT.Player(mount, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: () => setState('playing'),
            onError: () => setState('blocked'), // 153/150/100/101/… → not embeddable
          },
        });
      })
      .catch(() => setState('raw')); // API unavailable (offline etc.) → plain iframe
  }

  if (state === 'blocked') {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-amber-400/25 bg-black/40 p-4 text-center">
        <span aria-hidden className="text-3xl">📺</span>
        <p className="text-xs leading-relaxed text-amber-200/90">
          This video can't be embedded — the channel has switched off in-page
          playback (YouTube error 153).
        </p>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary px-5 py-2 text-sm"
        >
          ▶ Watch on YouTube
        </a>
      </div>
    );
  }

  if (state === 'raw') {
    return (
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
