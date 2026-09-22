'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, ErrorBanner } from '@/components/ui';
import { MarkdownLite } from '@/components/Markdown';

interface Q {
  id: number;
  title: string;
  body: string;
  status: string;
  learner: string;
  teacher: string | null;
  ai_answer: string | null;
  latest_answer: string | null;
  answer_at: string | null;
  created_at: string;
}

export function QuestionsBoard({ questions }: { questions: Q[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const answer = async (q: Q) => {
    if (!draft.trim()) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question_id: q.id, action: 'answer', body: draft, ai_answer_used: useAi }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Failed');
      setDraft('');
      setOpenId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const act = async (q: Q, action: 'resolve' | 'reopen') => {
    try {
      await fetch('/api/admin/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question_id: q.id, action }) });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="space-y-3">
      {error && <ErrorBanner error={error} />}
      {questions.map((q) => (
        <div key={q.id} className="card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-ink-950">{q.title}</h3>
            <Badge tone={q.status === 'open' ? 'warning' : q.status === 'answered' ? 'info' : 'success'}>{q.status}</Badge>
            <span className="ml-auto text-xs text-ink-400">{q.learner} · {q.created_at}</span>
          </div>
          <p className="tamil mt-2 text-sm leading-relaxed text-ink-700">{q.body}</p>

          {q.ai_answer && (
            <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/60 p-4">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">🤖 AI preliminary answer</p>
              <MarkdownLite text={q.ai_answer} />
            </div>
          )}
          {q.latest_answer && (
            <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">🧑‍🏫 Teacher reply {q.answer_at && `· ${q.answer_at}`}</p>
              <p className="tamil whitespace-pre-wrap text-sm text-ink-800">{q.latest_answer}</p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => { setOpenId(openId === q.id ? null : q.id); setDraft(q.ai_answer ?? ''); setUseAi(true); }} className="btn-secondary !py-1.5 text-xs">
              {openId === q.id ? 'Close' : 'Review & answer'}
            </button>
            {q.status !== 'resolved' && <button onClick={() => act(q, 'resolve')} className="text-xs font-semibold text-brand-700 hover:underline">✓ Resolve</button>}
            {q.status === 'resolved' && <button onClick={() => act(q, 'reopen')} className="text-xs font-semibold text-ink-500 hover:underline">Reopen</button>}
          </div>

          {openId === q.id && (
            <div className="mt-3 space-y-2 rounded-xl border border-ink-200 p-4">
              <label className="flex items-center gap-2 text-xs text-ink-600">
                <input type="checkbox" className="h-3.5 w-3.5 accent-brand-700" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
                Build on the AI answer (mark it as used)
              </label>
              <textarea className="input min-h-[90px] tamil" placeholder="Write the official answer (edit the AI draft freely — you are the source of truth)." value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="flex justify-end">
                <button onClick={() => answer(q)} disabled={!draft.trim()} className="btn-primary !py-2 text-xs">Post answer & notify learner</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {questions.length === 0 && <p className="card p-8 text-center text-sm text-ink-500">No questions — all quiet in the garden. 🌿</p>}
    </div>
  );
}
