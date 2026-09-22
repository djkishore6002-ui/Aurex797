'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Question {
  id: number;
  type: string;
  prompt: string;
  data: Record<string, unknown>;
  explanation: string | null;
}

/**
 * Client quiz engine. Answers are submitted to the server which re-scores
 * everything — the client only renders.
 */
export function QuizEngine({ quizId, questions, passScore }: { quizId: number; questions: Question[]; passScore: number }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; max_score: number; percent: number; passed: boolean; review: { id: number; correct: boolean; expected: unknown }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(Date.now());

  const setAnswer = (id: number, value: unknown) => setAnswers((a) => ({ ...a, [String(id)]: value }));
  const answeredCount = Object.keys(answers).length;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      // Normalize ordering answers to arrays of item text (server compares text)
      const normalized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(answers)) {
        const q = questions.find((x) => String(x.id) === k);
        if (q?.type === 'ordering' && Array.isArray(v)) {
          const items = ((q.data.items as string[]) ?? []);
          normalized[k] = (v as number[]).map((i) => items[i]).filter(Boolean);
        } else {
          normalized[k] = v;
        }
      }
      const res = await fetch('/api/quizzes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quizId, answers: normalized, duration_seconds: Math.round((Date.now() - startedAt) / 1000) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Submission failed');
      setResult({ score: data.score, max_score: data.max_score, percent: data.percent, passed: data.passed, review: data.review });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
    setError(null);
  };

  if (result) {
    const reviewMap = new Map(result.review.map((r) => [r.id, r]));
    return (
      <div className="card p-6">
        <div className={`rounded-2xl p-6 text-center ${result.passed ? 'bg-brand-50' : 'bg-marigold-50'}`}>
          <p className="text-4xl" aria-hidden>{result.passed ? '🎉' : '💪'}</p>
          <h2 className="mt-2 text-2xl font-bold">{result.passed ? 'Quiz passed!' : 'Keep practicing!'}</h2>
          <p className="mt-1 text-ink-600">
            You scored <b>{result.score}/{result.max_score}</b> ({result.percent}%) — {passScore}% needed to pass.
          </p>
          {result.passed && <p className="mt-2 text-sm font-semibold text-brand-800">+50 XP added to your account.</p>}
        </div>

        <h3 className="mt-6 mb-3 font-bold text-ink-900">Review</h3>
        <ol className="space-y-3">
          {questions.map((q, i) => {
            const r = reviewMap.get(q.id);
            return (
              <li key={q.id} className={`rounded-xl border p-4 ${r?.correct ? 'border-brand-200 bg-brand-50/50' : 'border-red-200 bg-red-50/50'}`}>
                <p className="text-sm font-semibold text-ink-900">
                  {i + 1}. {q.prompt} {r?.correct ? '✓' : '✕'}
                </p>
                {!r?.correct && r?.expected != null && (
                  <p className="tamil mt-1.5 text-sm text-ink-700">
                    Expected: {JSON.stringify(r.expected).replace(/"/g, '')}
                  </p>
                )}
                {q.explanation && <p className="mt-1.5 text-xs text-ink-500">{q.explanation}</p>}
              </li>
            );
          })}
        </ol>
        <div className="mt-6 flex gap-3">
          <button onClick={reset} className="btn-secondary">
            Try again
          </button>
          <Link href="/dashboard" className="btn-primary">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-6 p-6">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
      {questions.map((q, i) => (
        <fieldset key={q.id} className="rounded-xl border border-ink-100 p-4">
          <legend className="px-2 text-sm font-bold text-ink-900">
            {i + 1}. {q.prompt}
          </legend>
          <QuestionInput question={q} value={answers[String(q.id)]} onChange={(v) => setAnswer(q.id, v)} />
          {q.explanation && <p className="mt-2 text-xs text-ink-400">Tip: {q.explanation}</p>}
        </fieldset>
      ))}
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{answeredCount}/{questions.length} answered</p>
        <button onClick={submit} disabled={busy || answeredCount < questions.length} className="btn-primary">
          {busy ? 'Scoring…' : 'Submit answers'}
        </button>
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange }: { question: Question; value: unknown; onChange: (v: unknown) => void }) {
  const d = question.data;
  switch (question.type) {
    case 'mcq': {
      const options = (d.options as string[]) ?? [];
      return (
        <div className="space-y-2">
          {options.map((o, i) => (
            <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${value === i ? 'border-brand-500 bg-brand-50 font-semibold' : 'border-ink-200 hover:bg-ink-50'}`}>
              <input type="radio" name={`q-${question.id}`} checked={value === i} onChange={() => onChange(i)} className="accent-brand-700" />
              <span className="tamil">{o}</span>
            </label>
          ))}
        </div>
      );
    }
    case 'multi': {
      const options = (d.options as string[]) ?? [];
      const chosen = Array.isArray(value) ? (value as number[]) : [];
      return (
        <div className="space-y-2">
          {options.map((o, i) => (
            <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${chosen.includes(i) ? 'border-brand-500 bg-brand-50 font-semibold' : 'border-ink-200 hover:bg-ink-50'}`}>
              <input
                type="checkbox"
                checked={chosen.includes(i)}
                onChange={(e) => onChange(e.target.checked ? [...chosen, i] : chosen.filter((c) => c !== i))}
                className="accent-brand-700"
              />
              <span className="tamil">{o}</span>
            </label>
          ))}
          <p className="text-xs text-ink-400">Select all that apply.</p>
        </div>
      );
    }
    case 'truefalse':
      return (
        <div className="flex gap-3">
          {[true, false].map((v) => (
            <button key={String(v)} onClick={() => onChange(v)} className={`btn ${value === v ? 'bg-brand-700 text-white' : 'border border-ink-300 bg-white text-ink-700 hover:bg-ink-50'}`}>
              {v ? 'True ✓' : 'False ✕'}
            </button>
          ))}
        </div>
      );
    case 'fillblank':
      return <input className="input tamil" placeholder="Type the missing word…" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
    case 'translation':
      return (
        <div>
          <input className="input tamil" placeholder="Type the Tamil translation…" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
          {Array.isArray(d.hints) && (
            <p className="mt-1.5 text-xs text-ink-400">
              Hints: {(d.hints as string[]).join(' · ')}
            </p>
          )}
        </div>
      );
    case 'ordering': {
      const items = (d.items as string[]) ?? [];
      const order = Array.isArray(value) ? (value as number[]) : [];
      const remaining = items.map((_, i) => i).filter((i) => !order.includes(i));
      return (
        <div className="space-y-2">
          {order.length > 0 && (
            <ol className="space-y-1.5">
              {order.map((itemIdx, pos) => (
                <li key={itemIdx} className="tamil flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">{pos + 1}</span>
                  {items[itemIdx]}
                </li>
              ))}
            </ol>
          )}
          <p className="text-xs font-semibold text-ink-500">Tap in the correct order:</p>
          <div className="flex flex-wrap gap-2">
            {remaining.map((i) => (
              <button key={i} onClick={() => onChange([...order, i])} className="tamil rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm hover:bg-ink-50">
                {items[i]}
              </button>
            ))}
            {order.length > 0 && (
              <button onClick={() => onChange(order.slice(0, -1))} className="rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                Undo last
              </button>
            )}
          </div>
        </div>
      );
    }
    case 'match': {
      const pairs = (d.pairs as [string, string][]) ?? [];
      const left = pairs.map((p) => p[0]);
      const ua = (value as Record<string, string>) ?? {};
      const [key, val] = (d.answer as [string, string]) ?? [left[0], ''];
      void key;
      void val;
      return (
        <div className="space-y-2">
          {left.map((l, li) => (
            <div key={li} className="flex items-center gap-2">
              <span className="tamil w-1/2 text-sm font-semibold">{l}</span>
              <span className="text-ink-400">→</span>
              <select className="input !w-1/2 !py-1.5 text-sm" value={ua[l] ?? ''} onChange={(e) => onChange({ ...ua, [l]: e.target.value })} aria-label={`Match for ${l}`}>
                <option value="">—</option>
                {pairs.map((p, pi) => (
                  <option key={pi} value={p[1]}>
                    {p[1]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }
    case 'listening': {
      const options = (d.options as string[]) ?? [];
      return (
        <div className="space-y-3">
          {d.audio ? <audio src={String(d.audio)} controls className="w-full" /> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((o, i) => (
              <label key={i} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${value === i ? 'border-brand-500 bg-brand-50 font-semibold' : 'border-ink-200 hover:bg-ink-50'}`}>
                <input type="radio" name={`ql-${question.id}`} checked={value === i} onChange={() => onChange(i)} className="accent-brand-700" />
                {o}
              </label>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
