'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Badge } from './ui';

interface Result {
  type: string;
  title: string;
  subtitle: string | null;
  href: string;
  extra: string | null;
}

export function SearchButton() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setCounts({});
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) {
            setResults(d.results ?? []);
            setCounts(d.counts ?? {});
          }
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, type]);

  const TYPES = [
    { key: '', label: 'All' },
    { key: 'course', label: 'Courses' },
    { key: 'lesson', label: 'Lessons' },
    { key: 'workshop', label: 'Workshops' },
    { key: 'vocabulary', label: 'Words' },
    { key: 'faq', label: 'FAQ' },
    { key: 'community', label: 'Communities' },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-ink-500 hover:bg-ink-100 sm:px-3"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
        <span className="hidden text-sm md:inline">Search…</span>
        <kbd className="hidden rounded border border-ink-200 px-1.5 text-[10px] text-ink-400 lg:inline">/</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink-950/40 p-4 pt-[12vh]" role="dialog" aria-label="Search" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-ink-100 px-4">
              <Search className="h-5 w-5 text-ink-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Courses, lessons, words, workshops, FAQs…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-400"
                aria-label="Search query"
              />
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100" aria-label="Close search">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 border-b border-ink-100 px-4 py-2.5">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${type === t.key ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {loading && (
                <div className="space-y-2 p-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-ink-100" />
                  ))}
                </div>
              )}
              {!loading && q && results.length === 0 && <p className="p-8 text-center text-sm text-ink-500">No results for “{q}”. Try a Tamil word like தேநீர் 🙏</p>}
              {!loading && q && results.length > 0 && (
                <ul>
                  {results.map((r, i) => (
                    <li key={i}>
                      <Link href={r.href} onClick={() => setOpen(false)} className="flex items-start gap-3 border-b border-ink-50 px-4 py-3 hover:bg-ink-50">
                        <Badge tone="default">{r.type}</Badge>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-900">{r.title}</p>
                          {r.subtitle && <p className="line-clamp-1 text-xs text-ink-500">{r.subtitle}</p>}
                        </div>
                        {r.extra && <span className="shrink-0 text-[11px] text-ink-400">{r.extra}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {!q && (
                <p className="p-6 text-sm text-ink-400">
                  Search across courses, lessons, workshops, vocabulary, FAQs and communities. Try <button className="font-semibold text-brand-700" onClick={() => setQ('theenir')}>theenir</button> or{' '}
                  <button className="font-semibold text-brand-700" onClick={() => setQ('bus')}>bus</button>.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
