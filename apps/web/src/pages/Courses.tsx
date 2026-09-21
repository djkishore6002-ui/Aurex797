import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';

const LEVELS = ['all','absolute_beginner','beginner','intermediate','advanced'];

export default function Courses() {
  const [params, setParams] = useSearchParams();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const level = params.get('level') || 'all';
  const q = params.get('q') || '';

  useEffect(() => {
    setLoading(true);
    const url = `/courses?${new URLSearchParams({ ...(level!=='all'&&{level}), ...(q&&{q}) }).toString()}`;
    api<{items:any[]}>(url).then(d => setCourses(d.items)).finally(() => setLoading(false));
  }, [level, q]);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">Courses</h1>
      <p className="text-stone-500 mt-1">Self-paced video courses, vocabulary, and quizzes.</p>

      <div className="mt-5 flex flex-wrap gap-3 items-center">
        <input className="input max-w-xs" placeholder="Search courses…" value={q} onChange={e => setParams({ ...Object.fromEntries(params), q: e.target.value })} />
        <div className="flex gap-1 flex-wrap">
          {LEVELS.map(l => (
            <button key={l} onClick={() => setParams({ ...Object.fromEntries(params), level: l==='all'?'':l })}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${level===l ? 'bg-brand-500 text-white' : 'bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-700 dark:text-stone-300'}`}>
              {l.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="mt-8 text-stone-500">Loading…</div> : (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c: any) => (
            <Link to={`/courses/${c.id}`} key={c.id} className="card overflow-hidden hover:shadow-lg transition group">
              <div className="aspect-video bg-gradient-to-br from-brand-200 via-orange-100 to-tamil-200 dark:from-brand-900/40 dark:to-tamil-900/40 flex items-center justify-center text-6xl group-hover:scale-105 transition">📚</div>
              <div className="p-5">
                <div className="font-tamil text-brand-700 dark:text-brand-300 text-sm">{c.title_ta}</div>
                <div className="font-bold text-lg mt-0.5">{c.title}</div>
                <p className="text-sm text-stone-500 mt-2 line-clamp-2">{c.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="badge bg-stone-100 dark:bg-slate-800 capitalize">{c.level.replace('_',' ')}</span>
                  <span className="text-stone-500">{c.enrollment_count} learners · {Math.floor(c.duration_minutes/60)}h</span>
                </div>
              </div>
            </Link>
          ))}
          {courses.length === 0 && <div className="col-span-full text-stone-500 text-center p-8">No courses found.</div>}
        </div>
      )}
    </div>
  );
}
