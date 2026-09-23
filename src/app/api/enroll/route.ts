import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const { course_id } = (await readJson(req)) as unknown as { course_id: number };
    z.number().int().positive().parse(course_id);
    const db = getDb();

    const course = db.prepare('SELECT id, title, is_published FROM courses WHERE id = ? AND deleted_at IS NULL').get(course_id) as unknown as { id: number; title: string; is_published: number } | undefined;
    if (!course) throw new ApiError(404, 'Course not found');
    if (!course.is_published) throw new ApiError(400, 'This course is not published yet.');

    const existing = db.prepare('SELECT id, status FROM enrollments WHERE user_id = ? AND course_id = ?').get(user.id, course_id) as unknown as { status: string } | undefined;
    if (existing) {
      if (existing.status === 'active') return json({ ok: true, already: true });
      db.prepare("UPDATE enrollments SET status = 'active', enrolled_at = datetime('now') WHERE user_id = ? AND course_id = ?").run(user.id, course_id);
      return json({ ok: true });
    }

    db.prepare("INSERT INTO enrollments (user_id, course_id, status) VALUES (?,?, 'active')").run(user.id, course_id);
    return json({ ok: true, redirect: `/learn/${course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` }, 201);
  });
}
