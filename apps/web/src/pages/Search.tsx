import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [r, setR] = useState<any>(null);
  useEffect(() => { if (q) api(`/courses/search/all?q=${encodeURIComponent(q)}`).then(setR); }, [q]);
  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">Search results for "{q}"</h1>
      {!r && <div className="mt-4 text-stone-500">Searching…</div>}
      {r && (
        <div className="grid md:grid-cols-2 gap-6 mt-5">
          <Section title="Courses" items={r.courses} icon="📚" render={(c: any) => (
            <Link to={`/courses/${c.id}`} className="block p-3 rounded-lg hover:bg-stone-50 dark:hover:bg-slate-800">
              <div className="font-semibold">{c.title}</div>
              <div className="text-xs text-stone-500">{c.level} · {c.category}</div>
            </Link>
          )}/>
          <Section title="Lessons" items={r.lessons} icon="🎬" render={(l: any) => (
            <Link to={`/learn/${l.course_id}/lessons/${l.id}`} className="block p-3 rounded-lg hover:bg-stone-50 dark:hover:bg-slate-800">
              <div className="font-semibold">{l.title}</div>
              <div className="text-xs text-stone-500 capitalize">{l.type}</div>
            </Link>
          )}/>
          <Section title="Workshops" items={r.workshops} icon="🎓" render={(w: any) => (
            <Link to={`/workshops/${w.id}`} className="block p-3 rounded-lg hover:bg-stone-50 dark:hover:bg-slate-800">
              <div className="font-semibold">{w.title}</div>
              <div className="text-xs text-stone-500 line-clamp-1">{w.description}</div>
            </Link>
          )}/>
          <Section title="Vocabulary" items={r.vocab} icon="📖" render={(v: any) => (
            <div className="block p-3 rounded-lg">
              <div className="flex items-baseline gap-3"><span className="font-tamil text-xl text-brand-700">{v.tamil}</span><span className="italic text-sm text-stone-500">{v.transliteration}</span></div>
              <div className="text-sm">{v.meaning}</div>
            </div>
          )}/>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, icon, render }: any) {
  return (
    <div className="card p-4">
      <h3 className="font-bold mb-2">{icon} {title} <span className="text-stone-400 text-sm font-normal">({items.length})</span></h3>
      {items.length === 0 ? <div className="text-sm text-stone-500 p-2">No results.</div> : <div className="divide-y divide-stone-100 dark:divide-slate-800">{items.map(render)}</div>}
    </div>
  );
}
