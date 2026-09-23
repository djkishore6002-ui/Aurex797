'use client';

import { useCallback } from 'react';
import { VideoPlayer } from './VideoPlayer';

interface LessonVideoProps {
  src: string;
  lessonId: number;
  initialPosition?: number;
  chapters?: { title: string; seconds: number }[];
  requiredWatchPercent?: number;
}

/**
 * Client wrapper around the video player that owns the progress-reporting
 * callback (server components can't pass event handlers to client props).
 * Progress is persisted to the server every 10s and on pause.
 */
export function LessonVideo({ src, lessonId, initialPosition = 0, chapters = [], requiredWatchPercent = 90 }: LessonVideoProps) {
  const onProgress = useCallback(
    (pos: number, duration: number, watched: number, percent: number) => {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId, position: pos, duration, watched, percent, save: true }),
      }).catch(() => undefined);
    },
    [lessonId]
  );

  return <VideoPlayer src={src} lessonId={lessonId} initialPosition={initialPosition} chapters={chapters} requiredWatchPercent={requiredWatchPercent} onProgress={onProgress} />;
}
