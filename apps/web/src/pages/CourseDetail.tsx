import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '@/lib/api';

export default function CourseDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const d = await api<{ course: any; modules: any[]; instructor: any }>(`/courses/${id}`);
        setData(d);
        const e = await api<{ items: any[] }>('/courses/my/enrollments');
        setEnrolled(e.items.some((i: any) => i.course_id === id));
      } catch (e: any) { setErr(e.message); }
    })();
  }, [id]);

  const enroll = async () => {
    setBusy(true);
    try { await api(`/courses/${id}/enroll`, { method: 'POST' }); setEnrolled(true); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  if (!data) return <div className="p-8 text-center text-stone-500">Loading…</div>;
  const { course, modules, instructor } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <Link to="/courses" className="text-sm text-stone-500 hover:text-brand-600">← Courses</Link>
      <div className="mt-4 card overflow-hidden">
        <div className="aspect-[3/1] bg-gradient-to-br from-brand-400 via-orange-400 to-tamil-500 relative flex items-end p-6">
          <div className="text-white">
            <div className="font-tamil text-2xl mb-1 drop-shadow">{course.title_ta}</div>
            <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow-lg">{course.title}</h1>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-3 items-start justify-between">
            <div>
              <span className="badge bg-brand-50 text-brand-700 capitalize">{course.level.replace('_',' ')}</span>
              <span className="badge bg-stone-100 dark:bg-slate-800 ml-2">{course.category}</span>
              <span className="badge bg-stone-100 dark:bg-slate-800 ml-2">⏱ {Math.floor(course.duration_minutes/60)}h {course.duration_minutes%60}m</span>
              <span className="badge bg-stone-100 dark:bg-slate-800 ml-2">👥 {course.enrollment_count}</span>
            </div>
            {enrolled
              ? <span className="badge bg-green-100 text-green-700">✓ Enrolled</span>
              : <button onClick={enroll} disabled={busy} className="btn-primary">{busy?'Enrolling…':'Enroll — Free'}</button>}
          </div>
          <p className="mt-4 text-stone-700 dark:text-stone-300">{course.description}</p>
          {instructor && (
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-tamil-500 flex items-center justify-center text-white font-semibold">{instructor.name[0]}</div>
              <div>
                <div className="text-xs text-stone-500">Instructor</div>
                <div className="font-semibold">{instructor.name}</div>
              </div>
            </div>
          )}
          {err && <div className="mt-3 text-red-600 text-sm">{err}</div>}
        </div>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Curriculum</h2>
      <div className="space-y-3">
        {modules.map((m: any, mi: number) => (
          <div key={m.id} className="card p-5">
            <div className="font-bold text-lg">Module {mi+1}: {m.title}</div>
            <div className="mt-3 divide-y divide-stone-100 dark:divide-slate-800">
              {m.lessons.map((l: any, li: number) => (
                <Link key={l.id} to={enrolled ? `/learn/${course.id}/lessons/${l.id}` : '#'}
                      onClick={e => !enrolled && e.preventDefault()}
                      className={`py-3 flex items-center gap-3 ${enrolled?'hover:bg-stone-50 dark:hover:bg-slate-800':'opacity-70 cursor-not-allowed'} -mx-2 px-2 rounded-lg transition`}>
                  <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 flex items-center justify-center text-sm font-bold">{li+1}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{l.title}</div>
                    {l.title_ta && <div className="font-tamil text-sm text-brand-700 dark:text-brand-300">{l.title_ta}</div>}
                  </div>
                  <span className="text-xs text-stone-500 capitalize badge bg-stone-100 dark:bg-slate-800">{l.type}</span>
                  <span className="text-xs text-stone-500">{Math.floor(l.duration_seconds/60)}m</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
