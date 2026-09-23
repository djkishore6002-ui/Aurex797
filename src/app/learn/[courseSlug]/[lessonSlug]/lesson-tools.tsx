'use client';

import { useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';

export function LessonTools({ lessonId, hasVideo }: { lessonId: number; hasVideo: boolean }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<{ id: number; note: string }[]>([]);
  const [showNotes, setShowNotes] = useState(false);

  const markComplete = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/progress/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not mark complete');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark complete');
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId, note: note.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotes((n) => [...n, data.note]);
        setNote('');
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full sm:w-auto">
      {error && <p role="alert" className="mb-2 text-xs font-medium text-red-600">{error}</p>}
      {done ? (
        <span className="inline-flex items-center gap-2 rounded-xl bg-brand-100 px-4 py-2.5 text-sm font-bold text-brand-800">
          <CheckCircle2 className="h-4 w-4" /> Lesson complete! +XP earned
        </span>
      ) : (
        <button onClick={markComplete} disabled={busy} className="btn-primary">
          {busy ? 'Saving…' : hasVideo ? 'Mark complete (video ≥90% watched)' : 'Mark lesson complete'}
        </button>
      )}

      <div className="mt-3">
        <button onClick={() => setShowNotes((s) => !s)} className="btn-ghost !py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Notes {notes.length > 0 && `(${notes.length})`}
        </button>
        {showNotes && (
          <div className="mt-2 w-full max-w-sm space-y-2 rounded-xl border border-ink-200 bg-white p-3">
            {notes.map((n) => (
              <p key={n.id} className="rounded-lg bg-ink-50 px-3 py-1.5 text-sm text-ink-700">{n.note}</p>
            ))}
            <div className="flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} placeholder="Add a note…" className="input !py-1.5 text-sm" />
              <button onClick={addNote} className="btn-secondary !py-1.5 text-xs">Add</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
