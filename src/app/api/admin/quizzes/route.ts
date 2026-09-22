import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { audit } from '@/lib/audit';

const QUESTIONS = z.array(
  z.object({
    id: z.number().int().nullable().optional(),
    type: z.enum(['mcq', 'multi', 'truefalse', 'fillblank', 'match', 'translation', 'ordering', 'listening']),
    prompt: z.string().trim().min(3).max(500),
    data: z.record(z.any()).default({}),
    explanation: z.string().max(500).optional().nullable(),
  })
);

export async function GET(req: Request) {
  return route(async () => {
    requireRole('super_admin');
    const db = getDb();
    const courseId = new URL(req.url).searchParams.get('course_id');
    const quizzes = db
      .prepare(
        `SELECT q.*, (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count
         FROM quizzes q ${courseId ? 'WHERE q.course_id = ?' : ''} ORDER BY q.id`
      )
      .all(...(courseId ? [Number(courseId)] : []));
    return json({ quizzes });
  });
}

/** Create or replace a quiz (with its full question set) in one transactional call. */
export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { quiz_id?: number; course_id?: number; lesson_id?: number | null; title: string; description?: string | null; pass_score?: number; questions: z.infer<typeof QUESTIONS>; is_published?: number };
    const questions = QUESTIONS.parse(body.questions);
    const title = z.string().trim().min(3).max(200).parse(body.title);
    const db = getDb();
    const pass = z.number().min(1).max(100).parse(body.pass_score ?? 70);

    let quizId = body.quiz_id ? z.number().int().positive().parse(body.quiz_id) : null;
    if (quizId) {
      if (!db.prepare('SELECT id FROM quizzes WHERE id = ?').get(quizId)) throw new ApiError(404, 'Quiz not found');
      db.prepare('UPDATE quizzes SET title = ?, description = ?, pass_score = ?, is_published = ? WHERE id = ?').run(
        title, body.description ?? null, pass, body.is_published ? 1 : 0, quizId
      );
      db.prepare('DELETE FROM quiz_questions WHERE quiz_id = ?').run(quizId);
    } else {
      const res = db
        .prepare('INSERT INTO quizzes (course_id, lesson_id, title, description, pass_score, is_published, created_by) VALUES (?,?,?,?,?,?,?)')
        .run(body.course_id ?? null, body.lesson_id ?? null, title, body.description ?? null, pass, body.is_published ? 1 : 0, admin.id);
      quizId = Number(res.lastInsertRowid);
    }

    const insQ = db.prepare('INSERT INTO quiz_questions (quiz_id, type, prompt, prompt_data, explanation, points, sort_order) VALUES (?,?,?,?,?,1,?)');
    questions.forEach((q, i) => insQ.run(quizId!, q.type, q.prompt, JSON.stringify(q.data), q.explanation ?? null, i + 1));

    audit(admin, 'ADMIN_SAVED_QUIZ', { entity: 'quiz', entity_id: quizId, next: { title, questions: questions.length } });
    return json({ ok: true, id: quizId });
  });
}

export async function DELETE(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const { quiz_id } = (await readJson(req)) as unknown as { quiz_id: number };
    const id = z.number().int().positive().parse(quiz_id);
    const db = getDb();
    const quiz = db.prepare('SELECT id, title FROM quizzes WHERE id = ?').get(id) as unknown as { id: number; title: string } | undefined;
    if (!quiz) throw new ApiError(404, 'Quiz not found');
    db.prepare('DELETE FROM quizzes WHERE id = ?').run(id);
    audit(admin, 'ADMIN_DELETED_QUIZ', { entity: 'quiz', entity_id: id, prev: { title: quiz.title } });
    return json({ ok: true });
  });
}
