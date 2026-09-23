import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const body = (await readJson(req)) as unknown as { lesson_id: number; note: string };
    z.number().int().positive().parse(body.lesson_id);
    const note = z.string().trim().min(1, 'Note is empty').max(2000).parse(body.note);
    const db = getDb();

    const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(body.lesson_id);
    if (!lesson) throw new ApiError(404, 'Lesson not found');

    const res = db.prepare('INSERT INTO lesson_notes (user_id, lesson_id, note) VALUES (?,?,?)').run(user.id, body.lesson_id, note);
    const row = db.prepare('SELECT id, note, position_seconds, created_at FROM lesson_notes WHERE id = ?').get(Number(res.lastInsertRowid));
    return json({ ok: true, note: row }, 201);
  });
}

export async function GET(req: Request) {
  return route(async () => {
    const user = requireUser();
    const lessonId = Number(new URL(req.url).searchParams.get('lesson_id') ?? 0);
    if (!Number.isInteger(lessonId) || lessonId <= 0) throw new ApiError(400, 'lesson_id required');
    const db = getDb();
    const notes = db
      .prepare('SELECT id, note, position_seconds, created_at FROM lesson_notes WHERE user_id = ? AND lesson_id = ? ORDER BY created_at DESC')
      .all(user.id, lessonId);
    return json({ notes });
  });
}
