import { getDb } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { PageHead } from '@/components/ui';
import { timeAgo } from '@/lib/utils';
import { QuestionsBoard } from '@/app/admin/questions/questions-board';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export default function OrganizerQuestionsPage() {
  const user = getCurrentUser()!;
  const db = getDb();
  const questions = db
    .prepare(
      `SELECT lq.*, u.name AS learner_name, t.name AS teacher_name,
        (SELECT body FROM teacher_answers ta WHERE ta.question_id = lq.id ORDER BY ta.created_at DESC LIMIT 1) AS latest_answer,
        (SELECT created_at FROM teacher_answers ta WHERE ta.question_id = lq.id ORDER BY ta.created_at DESC LIMIT 1) AS answer_at
       FROM learner_questions lq
       JOIN users u ON u.id = lq.user_id
       LEFT JOIN users t ON t.id = lq.assigned_teacher_id
       WHERE lq.assigned_teacher_id = ? OR lq.assigned_teacher_id IS NULL
       ORDER BY CASE lq.status WHEN 'open' THEN 0 ELSE 1 END, lq.created_at DESC LIMIT 100`
    )
    .all(user.id) as unknown as Record<string, unknown>[];

  return (
    <div>
      <PageHead title="Learner questions" subtitle="Review the AI preliminary answer, edit or replace it, then post the official answer — the learner is notified instantly." />
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
