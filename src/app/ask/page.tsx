import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { timeAgo } from '@/lib/utils';
import { Badge, EmptyState, PageHead } from '@/components/ui';
import { redirect } from 'next/navigation';
import { AskForm } from './ask-form';
import { ResolveButton } from '@/components/ResolveButton';

export const metadata: Metadata = { title: 'Ask a teacher' };

export default function AskPage() {
  const user = getCurrentUser();
  if (!user) redirect('/login');
  const db = getDb();

  const questions = db
    .prepare(
      `SELECT lq.*, u.name AS teacher_name,
        (SELECT body FROM teacher_answers ta WHERE ta.question_id = lq.id ORDER BY ta.created_at DESC LIMIT 1) AS latest_answer,
        (SELECT created_at FROM teacher_answers ta WHERE ta.question_id = lq.id ORDER BY ta.created_at DESC LIMIT 1) AS answer_at
       FROM learner_questions lq LEFT JOIN users u ON u.id = lq.assigned_teacher_id
       WHERE lq.user_id = ? ORDER BY lq.created_at DESC LIMIT 20`
    )
    .all(user.id) as unknown as {
    id: number;
    title: string;
    body: string;
    status: string;
    ai_answer: string | null;
    created_at: string;
    teacher_name: string | null;
    latest_answer: string | null;
    answer_at: string | null;
  }[];

  return (
    <div className="container-page max-w-3xl py-10">
      <PageHead
        title="Ask a teacher"
        subtitle="Submit a question with text, an image or audio. The AI tutor gives a preliminary answer instantly, then a real teacher reviews and replies — you get notified."
      />

      <AskForm />

      <h2 className="mt-10 mb-4 text-lg font-bold text-ink-950">Your questions</h2>
      {questions.length === 0 ? (
        <EmptyState icon="🙋" title="No questions yet" body="Your first question is a few keystrokes away." />
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <article key={q.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-ink-950">{q.title}</h3>
                <Badge tone={q.status === 'resolved' ? 'success' : q.status === 'answered' ? 'info' : 'warning'}>
                  {q.status === 'resolved' ? '✓ Resolved' : q.status === 'answered' ? 'Teacher answered' : 'Awaiting teacher'}
                </Badge>
                <span className="ml-auto text-xs text-ink-400">{timeAgo(q.created_at)}</span>
              </div>
              <p className="tamil mt-2 text-sm leading-relaxed text-ink-700">{q.body}</p>

              {q.ai_answer && (
                <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-400">🤖 AI preliminary answer {q.teacher_name && q.status !== 'answered' ? '(pending teacher review)' : ''}</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-700">{q.ai_answer}</p>
                </div>
              )}

              {q.latest_answer && (
                <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-700">🧑‍🏫 {q.teacher_name ?? 'Teacher'} answered {q.answer_at ? timeAgo(q.answer_at) : ''}</p>
                  <p className="tamil mt-1.5 whitespace-pre-wrap text-sm text-ink-800">{q.latest_answer}</p>
                </div>
              )}

              {q.status !== 'resolved' && <ResolveButton questionId={q.id} />}
            </article>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-2xl bg-brand-50 p-5 text-sm text-brand-900">
        <b>Tip:</b> the floating <Link href="/dashboard" className="underline">AI Tamil Tutor</Link> answers instantly from the platform content — use it for grammar and words, and reserve teacher questions for things the AI can’t fully cover.
      </div>
    </div>
  );
}
