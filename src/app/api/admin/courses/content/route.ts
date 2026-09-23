import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, json, route } from '@/lib/api';

export async function GET(req: Request) {
  return route(async () => {
    requireRole('super_admin');
    const courseId = Number(new URL(req.url).searchParams.get('course_id') ?? 0);
    if (!courseId) throw new ApiError(400, 'course_id required');
    const db = getDb();
    const course = db
      .prepare('SELECT c.*, i.name AS instructor_name, o.name AS organizer_name FROM courses c LEFT JOIN users i ON i.id = c.instructor_id LEFT JOIN users o ON o.id = c.organizer_id WHERE c.id = ? AND c.deleted_at IS NULL')
      .get(courseId) as unknown as Record<string, unknown> | undefined;
    if (!course) throw new ApiError(404, 'Course not found');
    const modules = db
      .prepare('SELECT * FROM course_modules WHERE course_id = ? ORDER BY sort_order')
      .all(courseId) as unknown as { id: number; title: string; description: string | null; sort_order: number; is_published: number }[];
    const lessons = db.prepare('SELECT * FROM lessons WHERE module_id IN (SELECT id FROM course_modules WHERE course_id = ?) ORDER BY sort_order').all(courseId) as unknown as Record<string, unknown>[];
    const quizzes = db.prepare('SELECT id, title, description, pass_score, is_published FROM quizzes WHERE course_id = ?').all(courseId);

    const data = {
      ...course,
      modulesData: modules.map((m) => ({ ...m, lessons: lessons.filter((l) => (l as { module_id: number }).module_id === m.id) })),
      quizzes,
    };
    return json(data);
  });
}
