'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { MarkdownLite } from '@/components/Markdown';

interface Phrase {
  tamil: string;
  translit: string;
  meaning: string;
}

interface Turn {
  role: 'ai' | 'user';
  content: string;
  feedback?: { score: number; notes: string } | null;
}

export function ScenarioPlayer({
  scenarioId,
  title,
  situationTamil,
  situationTranslit,
  situationMeaning,
  starterPrompt,
  phrases,
}: {
  scenarioId: number;
  title: string;
  situationTamil: string;
  situationTranslit: string;
  situationMeaning: string;
  starterPrompt: string;
  phrases: Phrase[];
}) {
  const [turns, setTurns] = useState<Turn[]>([{ role: 'ai', content: starterPrompt }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns, busy]);

  const send = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || busy) return;
      setInput('');
      setError(null);
      setTurns((t) => [...t, { role: 'user', content: msg }]);
      setBusy(true);
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: `[Scenario: ${title}] I am practicing the "${title}" scenario. My response in Tamil/English: "${msg}". Continue the conversation AS THE OTHER PERSON (in Tamil with transliteration + English meaning), then give one short line of feedback: what was good, what to fix, and a phrase I could use next. Be encouraging. If my sentence is grammatically off, show the corrected version.`,
            context: { type: 'scenario', id: scenarioId, label: title, text: `${situationMeaning}\nPhrases: ${phrases.map((p) => `${p.tamil} = ${p.meaning}`).join('; ')}` },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
        // Split trailing feedback marker if present (tutor returns prose)
        setTurns((t) => [...t, { role: 'ai', content: data.answer }]);
        if (data.answer.toLowerCase().includes('scenario complete')) setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setBusy(false);
      }
    },
    [input, busy, title, scenarioId, situationMeaning, phrases]
  );

  return (
    <div className="card overflow-hidden">
      {/* Situation banner */}
      <div className="bg-gradient-to-r from-brand-800 to-brand-700 px-5 py-4 text-white">
        <p className="text-xs uppercase tracking-wide text-brand-200">The situation</p>
        <p className="tamil mt-1 text-xl font-bold">{situationTamil}</p>
        <p className="text-sm text-brand-100">
          {situationTranslit} — {situationMeaning}
        </p>
      </div>

      <div ref={listRef} className="max-h-[46vh] min-h-[240px] space-y-3 overflow-y-auto bg-ink-50/50 p-4">
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${t.role === 'user' ? 'rounded-2xl rounded-tr-sm bg-brand-700 p-3 text-sm text-white' : 'rounded-2xl rounded-tl-sm bg-white p-3.5 text-sm shadow-sm'}`}>
              {t.role === 'ai' ? <MarkdownLite text={t.content} /> : <p className="whitespace-pre-wrap">{t.content}</p>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600 [animation-delay:300ms]" />
            </div>
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-ink-100 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {phrases.slice(0, 4).map((p) => (
            <button key={p.tamil} onClick={() => send(p.tamil)} className="tamil rounded-full border border-brand-300 bg-white px-3 py-1 text-xs font-medium text-brand-800 hover:bg-brand-50">
              {p.tamil}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2"
        >
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={done ? 'Well done! Start a new line…' : 'Reply in Tamil (or English) — type or tap a phrase'} className="input" aria-label="Your reply" />
          <button type="submit" disabled={busy || !input.trim()} className="btn-primary shrink-0" aria-label="Send reply">
            <Send className="h-4 w-4" />
          </button>
        </form>
        {done && (
          <button onClick={() => setTurns([{ role: 'ai', content: starterPrompt }])} className="btn-secondary mt-3 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> Restart scenario
          </button>
        )}
      </div>
    </div>
  );
}
