import { getDb } from '@/db';
import { PageHead } from '@/components/ui';
import { timeAgo } from '@/lib/utils';
import { QuestionsBoard } from './questions-board';

export const dynamic = 'force-dynamic';

export default function AdminQuestionsPage() {
  const db = getDb();
  const stats = db
    .prepare(
      `SELECT COUNT(*) total,
        SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) open_n,
        SUM(CASE WHEN status='answered' THEN 1 ELSE 0 END) answered_n,
        SUM(CASE WHEN ai_answer IS NOT NULL THEN 1 ELSE 0 END) ai_n,
        (SELECT COUNT(*) FROM teacher_answers) teacher_n
       FROM learner_questions`
    )
    .get() as unknown as { total: number; open_n: number | null; answered_n: number | null; ai_n: number | null; teacher_n: number | null };

  const questions = db
    .prepare(
      `SELECT lq.*, u.name AS learner_name, t.name AS teacher_name,
        (SELECT body FROM teacher_answers ta WHERE ta.question_id = lq.id ORDER BY ta.created_at DESC LIMIT 1) AS latest_answer,
        (SELECT created_at FROM teacher_answers ta WHERE ta.question_id = lq.id ORDER BY ta.created_at DESC LIMIT 1) AS answer_at
       FROM learner_questions lq
       JOIN users u ON u.id = lq.user_id
       LEFT JOIN users t ON t.id = lq.assigned_teacher_id
       ORDER BY CASE lq.status WHEN 'open' THEN 0 ELSE 1 END, lq.created_at DESC LIMIT 100`
    )
    .all() as unknown as Record<string, unknown>[];

  return (
    <div>
      <PageHead
        title="Learner questions"
        subtitle="AI gives a preliminary answer; a teacher reviews, edits or rejects it, then replies — the learner is notified."
        actions={
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-ink-100 px-3 py-1.5 font-semibold text-ink-700">{stats.total} total</span>
            <span className="rounded-full bg-marigold-100 px-3 py-1.5 font-semibold text-marigold-800">{stats.open_n ?? 0} open</span>
            <span className="rounded-full bg-sky-100 px-3 py-1.5 font-semibold text-sky-800">{stats.ai_n ?? 0} AI-answered</span>
            <span className="rounded-full bg-brand-100 px-3 py-1.5 font-semibold text-brand-800">{stats.teacher_n ?? 0} teacher replies</span>
          </div>
        }
      />
      <QuestionsBoard
        questions={questions.map((q) => ({
          id: q.id as number,
          title: q.title as string,
          body: q.body as string,
          status: q.status as string,
          learner: q.learner_name as string,
          teacher: (q.teacher_name as string | null),
          ai_answer: (q.ai_answer as string | null),
          latest_answer: (q.latest_answer as string | null),
          answer_at: (q.answer_at as string | null) ? timeAgo(q.answer_at as string) : null,
          created_at: timeAgo(q.created_at as string),
        }))}
      />
    </div>
  );
}
