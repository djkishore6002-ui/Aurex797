'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui';

interface Word {
  id: number;
  tamil: string;
  transliteration: string;
  meaning: string;
  part_of_speech: string | null;
  example_tamil: string | null;
  example_meaning: string | null;
  course_id: number | null;
  is_published: number;
  course_title: string | null;
}

export function VocabularyAdmin({ words, courses }: { words: Word[]; courses: { id: number; title: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ tamil: '', transliteration: '', meaning: '', course_id: '' });
  const [error, setError] = useState<string | null>(null);

  const refresh = () => router.refresh();
  const api = async (method: string, payload?: unknown) => {
    const res = await fetch('/api/admin/vocabulary', { method, headers: { 'Content-Type': 'application/json' }, body: payload ? JSON.stringify(payload) : undefined });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? 'Request failed');
    return d;
  };

  const filtered = words.filter((w) => !q || w.tamil.includes(q) || w.transliteration.toLowerCase().includes(q.toLowerCase()) || w.meaning.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="input w-72" placeholder="Search words…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search vocabulary" />
        <button onClick={() => setShowNew(true)} className="btn-primary ml-auto"><Plus className="h-4 w-4" /> Add word</button>
        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50 text-left text-xs text-ink-400">
              <th className="px-4 py-3">Tamil</th>
              <th className="px-4 py-3">Transliteration</th>
              <th className="px-4 py-3">Meaning</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => (
              <tr key={w.id} className="border-b border-ink-50 last:border-b-0">
                <td className="tamil px-4 py-3 text-lg font-semibold text-brand-900">{w.tamil}</td>
                <td className="px-4 py-3 italic text-ink-600">{w.transliteration}</td>
                <td className="px-4 py-3">{w.meaning}</td>
                <td className="px-4 py-3 text-xs text-ink-500">{w.course_title ?? '—'}</td>
                <td className="px-4 py-3"><Badge tone={w.is_published ? 'success' : 'default'}>{w.is_published ? 'published' : 'draft'}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={async () => {
                      try {
                        await api('PUT', { vocabulary_id: w.id, is_published: w.is_published ? 0 : 1 });
                        refresh();
                      } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    {w.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete “${w.tamil}”?`)) return;
                      try {
                        await api('DELETE', { vocabulary_id: w.id });
                        refresh();
                      } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
                    }}
                    className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-400">No words found.</td></tr>}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api('POST', { ...form, course_id: form.course_id ? Number(form.course_id) : null });
                setShowNew(false);
                setForm({ tamil: '', transliteration: '', meaning: '', course_id: '' });
                refresh();
              } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
            }}
          >
            <h3 className="font-bold">Add word</h3>
            <div className="mt-4 space-y-3">
              <input className="input tamil text-xl" placeholder="தமிழ் (Tamil script)" required value={form.tamil} onChange={(e) => setForm((f) => ({ ...f, tamil: e.target.value }))} />
              <input className="input" placeholder="Transliteration" required value={form.transliteration} onChange={(e) => setForm((f) => ({ ...f, transliteration: e.target.value }))} />
              <input className="input" placeholder="Meaning" required value={form.meaning} onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))} />
              <select className="input" value={form.course_id} onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value }))}>
                <option value="">— no course —</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Add word</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
