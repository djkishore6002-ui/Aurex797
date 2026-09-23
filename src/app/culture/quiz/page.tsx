import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { PageHead, Badge } from '@/components/ui';
import { QuizEngine } from '@/components/QuizEngine';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export const metadata: Metadata = {
  title: 'Culture Quiz · கலாசார வினாடி-வினா',
  description: 'A gamified 10-question quiz on Tamil temples, food, festivals, dance, inscriptions and regions.',
};

export default function CultureQuizPage() {
  const db = getDb();
  const quiz = db
    .prepare("SELECT * FROM quizzes WHERE title LIKE 'Culture Quiz%' AND is_published = 1 ORDER BY id DESC LIMIT 1")
    .get() as unknown as { id: number; title: string; description: string | null; pass_score: number } | undefined;
  if (!quiz) notFound();

  const questions = db
    .prepare('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order')
    .all(quiz.id) as unknown as { id: number; type: string; prompt: string; prompt_data: string; explanation: string | null }[];
  if (questions.length === 0) notFound();

  const user = getCurrentUser();
  const best = user
    ? (db.prepare('SELECT MAX(score) AS best, MAX(passed) AS passed FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?').get(user.id, quiz.id) as unknown as { best: number | null; passed: number | null })
    : { best: null, passed: null };
  const attempts = user ? (db.prepare('SELECT COUNT(*) AS c FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?').get(user.id, quiz.id) as unknown as { c: number }).c : 0;

  return (
    <div className="container-page max-w-3xl py-10">
      <PageHead
        title={quiz.title}
        subtitle={quiz.description}
        actions={
          <div className="flex gap-2">
            <Badge tone="warning">{quiz.pass_score}% to pass</Badge>
            {best != null && (
              <Badge tone={best.passed ? 'success' : 'default'}>
                {attempts} attempt{attempts === 1 ? '' : 's'} · best {best.best}
              </Badge>
            )}
            {!user && <Badge tone="info">Sign in to save your score</Badge>}
          </div>
        }
      />
      <QuizEngine
        quizId={quiz.id}
        questions={questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, data: safeJson(q.prompt_data), explanation: q.explanation }))}
        passScore={quiz.pass_score}
      />
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4">
        <p className="text-sm text-ink-400">
          Beat your best? <Link href="/culture/heritage" className="font-semibold text-brand-300 hover:underline">Explore the monuments again →</Link>
        </p>
        <Link href="/culture" className="btn-ghost text-xs">← Back to culture</Link>
      </div>
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
