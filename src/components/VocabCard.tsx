'use client';

import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';

export function VocabCardClient({
  vocabId,
  tamil,
  translit,
  meaning,
  example,
  exampleMeaning,
  userId,
}: {
  vocabId: number;
  tamil: string;
  translit: string;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
  userId: number;
}) {
  const [known, setKnown] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/vocabulary/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabulary_id: vocabId, status: known ? 'learning' : 'known' }),
      });
      if (res.ok) setKnown(!known);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`card p-4 ${known ? 'border-brand-300 bg-brand-50/50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="tamil text-xl font-bold text-brand-900">{tamil}</p>
          <p className="text-sm italic text-ink-500">/ {translit} /</p>
          <p className="mt-1 text-sm font-semibold text-ink-800">{meaning}</p>
          {example && (
            <p className="tamil mt-2 rounded-lg bg-ink-50 px-3 py-1.5 text-sm text-ink-700">
              {example}
              {exampleMeaning && <span className="ml-1.5 text-xs text-ink-400">— {exampleMeaning}</span>}
            </p>
          )}
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          className={`shrink-0 rounded-full p-2 transition-colors ${known ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400 hover:bg-brand-100 hover:text-brand-700'}`}
          aria-label={known ? 'Mark as still learning' : 'Mark as learned'}
          title={known ? 'Learned — click to unmark' : 'Mark as learned (+XP)'}
        >
          <BadgeCheck className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
