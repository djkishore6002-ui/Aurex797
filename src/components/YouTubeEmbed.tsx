'use client';

import { useState } from 'react';

/**
 * Click-to-load YouTube embed. Shows a poster + play button first, mounts
 * the iframe only on first click — keeps pages fast, plays fully client-side.
 */
export function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
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

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-glow-lg">
      <div className="aspect-video w-full">
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
