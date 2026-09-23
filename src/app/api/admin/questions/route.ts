import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notifications';

/**
 * Teacher question management (teacher dashboard / admin).
 * GET:  list questions (filter: status)
 * POST: answer a question (teacher edits/rejects the AI answer),
 *       or resolve / reassign
 */
export async function GET(req: Request) {
  return route(async () => {
    const me = requireRole('super_admin', 'organizer', 'teacher');
    const params = new URL(req.url).searchParams;
    const status = params.get('status') ?? '';
    const db = getDb();
    const questions = db
      .prepare(
        `SELECT lq.*, u.name AS learner_name, t.name AS teacher_name,
        (SELECT body FROM teacher_answers ta WHERE ta.question_id = lq.id ORDER BY ta.created_at DESC LIMIT 1) AS latest_answer,
        (SELECT created_at FROM teacher_answers ta WHERE ta.question_id = lq.id ORDER BY ta.created_at DESC LIMIT 1) AS answer_at
        FROM learner_questions lq
        JOIN users u ON u.id = lq.user_id
        LEFT JOIN users t ON t.id = lq.assigned_teacher_id
        WHERE (? = '' OR lq.status = ?) ORDER BY lq.created_at DESC LIMIT 100`
      )
      .all(status, status);
    return json({ questions });
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const me = requireRole('super_admin', 'organizer', 'teacher');
    const body = (await readJson(req)) as unknown as { question_id: number; action: 'answer' | 'resolve' | 'reopen'; body?: string; ai_answer_used?: boolean; assign_to?: number | null };
    const id = z.number().int().positive().parse(body.question_id);
    const db = getDb();
    const q = db.prepare('SELECT lq.*, u.name AS learner_name FROM learner_questions lq JOIN users u ON u.id = lq.user_id WHERE lq.id = ?').get(id) as unknown as Record<string, unknown> & { id: number; user_id: number; status: string } | undefined;
    if (!q) throw new ApiError(404, 'Question not found');

    if (body.action === 'answer') {
      const answer = z.string().trim().min(5, 'Answer is too short').max(8000).parse(body.body ?? '');
      db.prepare('INSERT INTO teacher_answers (question_id, teacher_id, body, ai_answer_used) VALUES (?,?,?,?)').run(id, me.id, answer, body.ai_answer_used ? 1 : 0);
      db.prepare("UPDATE learner_questions SET status = 'answered', updated_at = datetime('now') WHERE id = ?").run(id);
      notify(db, q.user_id, 'teacher', 'Teacher answered your question', String(q.title), '/ask');
      audit(me, 'TEACHER_ANSWERED_QUESTION', { entity: 'learner_question', entity_id: id });
      return json({ ok: true });
    }
    if (body.action === 'resolve') {
      db.prepare("UPDATE learner_questions SET status = 'resolved', updated_at = datetime('now') WHERE id = ?").run(id);
      audit(me, 'TEACHER_RESOLVED_QUESTION', { entity: 'learner_question', entity_id: id });
      return json({ ok: true });
    }
    if (body.action === 'reopen') {
      db.prepare("UPDATE learner_questions SET status = 'open', updated_at = datetime('now') WHERE id = ?").run(id);
      audit(me, 'TEACHER_REOPENED_QUESTION', { entity: 'learner_question', entity_id: id });
      return json({ ok: true });
    }
    if (body.assign_to !== undefined) {
      db.prepare('UPDATE learner_questions SET assigned_teacher_id = ? WHERE id = ?').run(body.assign_to, id);
      return json({ ok: true });
    }
    throw new ApiError(400, 'Unknown action');
  });
}
