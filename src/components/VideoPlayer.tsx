'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize, Minimize, Play, Volume2, VolumeX } from 'lucide-react';

// Single-video pages: track last-seen position for watched-time deltas.
const posRef = { current: 0 };

interface Chapter {
  title: string;
  seconds: number;
}

interface VideoPlayerProps {
  src: string;
  lessonId: number;
  initialPosition?: number;
  chapters?: Chapter[];
  requiredWatchPercent?: number;
  onProgress?: (pos: number, duration: number, watched: number, percent: number, save: boolean) => void;
  onTime?: (t: number) => void;
}

/**
 * Educational video player:
 * resume from last position, seek, volume, fullscreen, playback speed,
 * chapters, transcript sync, and real (throttled) progress reporting to the
 * server — a lesson is never "complete" just for opening the page.
 */
export function VideoPlayer({ src, lessonId, initialPosition = 0, chapters = [], requiredWatchPercent = 90, onProgress, onTime }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef(0);
  const watchedRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);

  // Resume: seek to initialPosition once metadata is available
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      setDuration(v.duration || 0);
      if (initialPosition > 0 && initialPosition < (v.duration || Infinity) - 2) {
        v.currentTime = initialPosition;
      }
    };
    v.addEventListener('loadedmetadata', onMeta);
    return () => v.removeEventListener('loadedmetadata', onMeta);
  }, [initialPosition]);

  // Throttled server-side progress (every 10s + on pause)
  const report = useCallback(
    (save: boolean) => {
      const v = videoRef.current;
      if (!v || !onProgress) return;
      const percent = v.duration > 0 ? Math.min(100, Math.round((v.currentTime / v.duration) * requiredWatchPercent)) : 0;
      onProgress(v.currentTime, v.duration, watchedRef.current, percent, save);
    },
    [onProgress, requiredWatchPercent]
  );

  useEffect(() => {
    const iv = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) return;
      const now = Date.now();
      if (now - lastSavedRef.current > 10_000) {
        lastSavedRef.current = now;
        report(false);
      }
    }, 5_000);
    return () => clearInterval(iv);
  }, [report]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(t, v.duration || t));
    setPos(v.currentTime);
    onTime?.(v.currentTime);
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };

  return (
    <div ref={shellRef} className="video-shell overflow-hidden rounded-2xl bg-ink-950 shadow-lg">
      <div className="relative">
        <video
          ref={videoRef}
          src={src}
          className="aspect-video w-full"
          playsInline
          preload="metadata"
          onClick={togglePlay}
          onPlay={() => {
            setPlaying(true);
            lastSavedRef.current = Date.now();
          }}
          onPause={() => {
            setPlaying(false);
            report(true);
          }}
          onEnded={() => {
            setPlaying(false);
            report(true);
          }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onTimeUpdate={() => {
            const v = videoRef.current;
            if (!v) return;
            const delta = Math.max(0, v.currentTime - (posRef.current ?? 0));
            if (v.paused === false) watchedRef.current += delta;
            posRef.current = v.currentTime;
            setPos(v.currentTime);
            onTime?.(v.currentTime);
          }}
          onVolumeChange={() => {
            const v = videoRef.current;
            if (!v) return;
            setVolume(v.volume);
            setMuted(v.muted);
          }}
          onRateChange={() => {
            const v = videoRef.current;
            if (v) setSpeed(v.playbackRate);
          }}
        />
        {buffering && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-ink-950/30">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          </div>
        )}
        {!playing && (
          <button
            onClick={togglePlay}
            aria-label="Play video"
            className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-white/90 text-ink-950 shadow-xl transition-transform hover:scale-105"
          >
            <Play className="ml-1 h-7 w-7" fill="currentColor" />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-2 px-4 py-3">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.5}
          value={pos}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          className="w-full accent-marigold-400"
        />
        <div className="flex flex-wrap items-center gap-3 text-white">
          <button onClick={togglePlay} className="rounded-lg p-2 hover:bg-white/15" aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? (
              <span className="grid h-4 w-4 grid-cols-2 gap-0.5">
                <span className="h-full w-1.5 bg-current" />
                <span className="h-full w-1.5 bg-current" />
              </span>
            ) : (
              <Play className="h-4 w-4" fill="currentColor" />
            )}
          </button>
          <span className="text-xs tabular-nums text-white/80">
            {fmt(pos)} / {fmt(duration)}
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted; }} className="rounded-lg p-1.5 hover:bg-white/15" aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = videoRef.current;
                if (!v) return;
                v.volume = Number(e.target.value);
                v.muted = Number(e.target.value) === 0;
              }}
              aria-label="Volume"
              className="w-20 accent-marigold-400"
            />
          </div>
          <label className="flex items-center gap-1 text-xs text-white/80">
            <span className="sr-only">Playback speed</span>
            <select
              value={speed}
              onChange={(e) => {
                const v = videoRef.current;
                if (v) v.playbackRate = Number(e.target.value);
                setSpeed(Number(e.target.value));
              }}
              className="rounded-md border border-white/20 bg-transparent px-1.5 py-1 text-xs text-white [&>option]:text-ink-950"
              aria-label="Playback speed"
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </label>
          <span className="ml-auto hidden text-[11px] text-white/50 sm:inline">
            {requiredWatchPercent}% watched marks the video complete
          </span>
          <button
            onClick={() => {
              const el = shellRef.current;
              if (!el) return;
              if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
              else el.requestFullscreen().catch(() => undefined);
            }}
            className="rounded-lg p-1.5 hover:bg-white/15"
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
        {chapters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1" role="list" aria-label="Chapters">
            {chapters.map((c) => (
              <button
                key={c.seconds}
                onClick={() => seek(c.seconds)}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 hover:bg-white/20"
                role="listitem"
              >
                {c.title} · {fmt(c.seconds)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
