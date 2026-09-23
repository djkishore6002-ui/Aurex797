import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { awardXp } from '@/lib/gamify';
import { notify } from '@/lib/notifications';
import { clamp } from '@/lib/utils';

const schema = z.object({
  lesson_id: z.number().int().positive(),
  position: z.number().min(0),
  duration: z.number().min(0),
  watched: z.number().min(0),
  percent: z.number().min(0).max(100),
  save: z.boolean().optional().default(false),
});

/**
 * Lesson progress (video watch time). A lesson becomes "completed" only when
 * the watched percentage reaches the lesson's required_watch_percent — never
 * just because the page was opened.
 */
export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const body = schema.parse(await readJson(req));
    const db = getDb();

    const lesson = db
      .prepare(
        `SELECT l.*, m.course_id FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE l.id = ?`
      )
      .get(body.lesson_id) as unknown as { id: number; required_watch_percent: number; xp: number; title: string; course_id: number } | undefined;
    if (!lesson) throw new ApiError(404, 'Lesson not found');

    // Anti-cheat: watched time cannot exceed duration, position cannot jump wildly
    const position = clamp(body.position, 0, Math.max(body.duration, body.position));
    const watched = clamp(body.watched, 0, Math.max(body.duration, body.watched));
    const watchedPercent = body.duration > 0 ? Math.min(100, (watched / body.duration) * 100) : 0;
    const percent = clamp(body.percent, 0, 100);

    const wasCompleted = db.prepare('SELECT completed_at FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(user.id, lesson.id) as unknown as { completed_at: string | null } | undefined;

    db.prepare(
      `INSERT INTO lesson_progress (user_id, lesson_id, started_at, last_position, watched_seconds, completion_percentage, updated_at)
       VALUES (?,?,?,?,?,?, datetime('now'))
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET
         last_position = MAX(lesson_progress.last_position, excluded.last_position),
         watched_seconds = MAX(lesson_progress.watched_seconds, excluded.watched_seconds),
         completion_percentage = MAX(lesson_progress.completion_percentage, excluded.completion_percentage),
         updated_at = datetime('now')`
    ).run(user.id, lesson.id, wasCompleted ? null : "datetime('now')", position, watched, percent);

    let completedNow = false;
    if (!wasCompleted?.completed_at && watchedPercent >= lesson.required_watch_percent) {
      db.prepare("UPDATE lesson_progress SET completion_percentage = 100, completed_at = datetime('now') WHERE user_id = ? AND lesson_id = ?").run(user.id, lesson.id);
      awardXp(db, user.id, 'lesson_complete', lesson.xp, 'lesson', lesson.id);
      notify(db, user.id, 'learning', `Lesson complete: ${lesson.title}`, `+${lesson.xp} XP earned. Keep going!`, null);
      completedNow = true;
    }

    return json({ ok: true, completed: completedNow });
  });
}
