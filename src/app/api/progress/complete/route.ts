import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { awardXp } from '@/lib/gamify';
import { notify } from '@/lib/notifications';

/** Explicit completion for reading-only lessons (video lessons complete via watch tracking). */
export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const { lesson_id } = (await readJson(req)) as unknown as { lesson_id: number };
    z.number().int().positive().parse(lesson_id);
    const db = getDb();

    const lesson = db
      .prepare('SELECT l.*, m.course_id FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE l.id = ?')
      .get(lesson_id) as unknown as { id: number; title: string; xp: number; video_url: string | null; course_id: number } | undefined;
    if (!lesson) throw new ApiError(404, 'Lesson not found');

    if (lesson.video_url) {
      // For video lessons require the watch-tracking threshold to have been met
      const p = db.prepare('SELECT completion_percentage FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(user.id, lesson.id) as unknown as { completion_percentage: number } | undefined;
      if (!p || p.completion_percentage < 90) {
        throw new ApiError(400, 'Watch at least 90% of the video before marking it complete.');
      }
    }

    const exists = db.prepare('SELECT completed_at FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(user.id, lesson.id) as unknown as { completed_at: string | null } | undefined;
    if (exists?.completed_at) return json({ ok: true, already: true });

    db.prepare(
      `INSERT INTO lesson_progress (user_id, lesson_id, started_at, last_position, watched_seconds, completion_percentage, completed_at)
       VALUES (?,?, datetime('now'), 0, 0, 100, datetime('now'))
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET completion_percentage = 100, completed_at = datetime('now')`
    ).run(user.id, lesson.id);

    awardXp(db, user.id, 'lesson_complete', lesson.xp, 'lesson', lesson.id);
    notify(db, user.id, 'learning', `Lesson complete: ${lesson.title}`, `+${lesson.xp} XP earned. Keep going!`);
    return json({ ok: true });
  });
}
