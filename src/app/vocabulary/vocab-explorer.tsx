'use client';

import { useMemo, useState } from 'react';

interface Word {
  id: number;
  tamil: string;
  transliteration: string;
  meaning: string;
  part_of_speech: string | null;
  example_tamil: string | null;
  course_title: string | null;
}

export function VocabExplorer({ words, courses }: { words: Word[]; courses: { id: number; title: string }[] }) {
  const [q, setQ] = useState('');
  const [course, setCourse] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return words.filter((w) => {
      if (term && !w.tamil.toLowerCase().includes(term) && !w.transliteration.toLowerCase().includes(term) && !w.meaning.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [q, words]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Tamil, transliteration or meaning… (e.g. தேநீர் or coffee)" className="input max-w-md" aria-label="Search vocabulary" />
        <select value={course} onChange={(e) => setCourse(e.target.value)} className="input max-w-[220px]" aria-label="Filter by course">
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.title}>
              {c.title}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-400">{filtered.length} of {words.length}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered
          .filter((w) => !course || w.course_title === course)
          .map((w) => (
            <div key={w.id} className="card p-4">
              <div className="flex items-baseline gap-2">
                <p className="tamil text-2xl font-bold text-brand-900">{w.tamil}</p>
                <p className="text-sm italic text-ink-500">/ {w.transliteration} /</p>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-ink-800">
                {w.meaning} {w.part_of_speech && <span className="text-xs font-normal text-ink-400">· {w.part_of_speech}</span>}
              </p>
              {w.example_tamil && (
                <p className="tamil mt-2 rounded-lg bg-ink-50 px-3 py-1.5 text-sm text-ink-700">{w.example_tamil}</p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
