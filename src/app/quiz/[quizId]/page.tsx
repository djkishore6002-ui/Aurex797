import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDb } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { PageHead, Badge } from '@/components/ui';
import { QuizEngine } from '@/components/QuizEngine';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { quizId: string } }): Promise<Metadata> {
  const db = getDb();
  const q = db.prepare('SELECT title FROM quizzes WHERE id = ?').get(params.quizId) as unknown as { title: string } | undefined;
  return { title: q?.title ?? 'Quiz not found' };
}

export default function QuizPage({ params }: { params: { quizId: string } }) {
  const db = getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND is_published = 1').get(Number(params.quizId)) as unknown as {
    id: number;
    title: string;
    description: string | null;
    pass_score: number;
  } | undefined;
  if (!quiz) notFound();

  const questions = db
    .prepare('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order')
    .all(quiz.id) as unknown as { id: number; type: string; prompt: string; prompt_data: string; explanation: string | null }[];
  if (questions.length === 0) notFound();

  const user = getCurrentUser();
  const best = user ? (db.prepare('SELECT MAX(score) AS best, MAX(passed) AS passed FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?').get(user.id, quiz.id) as unknown as { best: number | null; passed: number | null }) : { best: null, passed: null };
  const attempts = user ? ((db.prepare('SELECT COUNT(*) AS c FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?').get(user.id, quiz.id) as unknown as { c: number }).c) : 0;

  return (
    <div className="container-page max-w-3xl py-10">
      <PageHead
        title={quiz.title}
        subtitle={quiz.description}
        actions={
          <div className="flex gap-2">
            <Badge tone="warning">{quiz.pass_score}% to pass</Badge>
            {best != null && <Badge tone={best.passed ? 'success' : 'default'}>{attempts} attempt{attempts === 1 ? '' : 's'} · best {best.best}</Badge>}
          </div>
        }
      />
      <QuizEngine quizId={quiz.id} questions={questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, data: safeJson(q.prompt_data), explanation: q.explanation }))} passScore={quiz.pass_score} />
    </div>
  );
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
