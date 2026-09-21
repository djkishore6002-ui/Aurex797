import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [continueLearn, setContinueLearn] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, c, w, e, cont, n] = await Promise.all([
          api('/courses/stats/me'),
          api('/courses?per_page=6'),
          api('/workshops'),
          api('/courses/my/enrollments'),
          api('/courses/continue/learning'),
          api('/notifications/mine'),
        ]);
        setStats(s); setCourses(c.items); setWorkshops(w.items); setEnrollments(e.items); setContinueLearn(cont.items); setNotifs(n.items);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-8 text-center text-stone-500">Loading your dashboard…</div>;

  const levelLabels: Record<string, string> = { absolute_beginner: 'Absolute Beginner', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <section className="hero-grad rounded-3xl p-6 md:p-10 border border-brand-100 dark:border-brand-900/30">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div>
            <div className="text-sm text-stone-600 dark:text-stone-300">வணக்கம்{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</div>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-1">Let's learn Tamil today.</h1>
            <div className="text-sm text-stone-500 mt-2">Level: {levelLabels[profile?.level || 'beginner']} · Goal: {profile?.learning_goal || '—'}</div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/ai" className="btn-primary">🤖 Ask AI Tutor</Link>
            <Link to="/speaking" className="btn-secondary">🎤 Practice speaking</Link>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon="🔥" label="Day streak" value={stats?.streak ?? 0}/>
          <Stat icon="⭐" label="XP" value={stats?.xp ?? 0}/>
          <Stat icon="📖" label="Words" value={stats?.wordsLearned ?? 0}/>
          <Stat icon="✅" label="Lessons done" value={stats?.lessonsCompleted ?? 0}/>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-stone-500 mb-1">
            <span>Daily goal</span><span>{profile?.daily_goal_minutes} min</span>
          </div>
          <div className="progress-track h-3"><div className="progress-fill" style={{ width: `${Math.min(100, ((stats?.lessonsCompleted*5)/Math.max(profile?.daily_goal_minutes||15,1))*100)}%` }}></div></div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Continue learning</h2>
          <Link to="/courses" className="text-sm text-brand-600 font-semibold">All courses →</Link>
        </div>
        {continueLearn.length === 0 && !enrollments.length ? (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-3">📚</div>
            <div className="font-semibold">Pick your first course</div>
            <div className="text-sm text-stone-500 mb-4">Start with "Tamil from Zero" — 10 short lessons.</div>
            <Link to="/courses" className="btn-primary inline-flex">Browse courses</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {continueLearn.map(l => (
              <Link to={`/learn/${l.course_id}/lessons/${l.lesson_id}`} key={l.id} className="card overflow-hidden hover:shadow-md transition group">
                <div className="aspect-video bg-gradient-to-br from-brand-400 to-tamil-600 relative flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition">▶</div>
                  <div className="absolute bottom-2 left-2 right-2 progress-track bg-white/30">
                    <div className="progress-fill" style={{ width: `${l.completion_percent}%` }}></div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-stone-500">{l.course_title}</div>
                  <div className="font-semibold mt-0.5">{l.title}</div>
                  <div className="text-xs text-stone-500 mt-2">{l.completion_percent}% complete</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold mb-4">Recommended courses</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c: any) => (
            <Link to={`/courses/${c.id}`} key={c.id} className="card overflow-hidden hover:shadow-md transition">
              <div className="aspect-video bg-gradient-to-br from-brand-100 to-tamil-100 dark:from-brand-900/40 dark:to-tamil-900/40 flex items-center justify-center text-5xl">📚</div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-tamil text-sm text-brand-700 dark:text-brand-300">{c.title_ta}</div>
                    <div className="font-semibold">{c.title}</div>
                  </div>
                  <span className="badge bg-stone-100 dark:bg-slate-800 capitalize whitespace-nowrap">{c.level.replace('_',' ')}</span>
                </div>
                <p className="text-sm text-stone-500 mt-2 line-clamp-2">{c.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-stone-500">
                  <span>{Math.floor(c.duration_minutes/60)}h {c.duration_minutes%60}m</span>
                  <span>· {c.enrollment_count} learners</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Upcoming workshops</h2>
          <Link to="/workshops" className="text-sm text-brand-600 font-semibold">All workshops →</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {workshops.slice(0,3).map((w: any) => (
            <Link to={`/workshops/${w.id}`} key={w.id} className="card p-5 hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-2xl">🎓</div>
                <div className="flex-1">
                  <div className="font-semibold">{w.title}</div>
                  <div className="text-xs text-stone-500 mt-1">by {w.instructor_name}</div>
                  <div className="mt-3 text-xs">
                    <span className="badge bg-green-100 text-green-700">Free</span>
                    <span className="ml-2 text-stone-500">{w.registered}/{w.capacity} registered</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 grid lg:grid-cols-2 gap-4">
        <Link to="/ai" className="card p-6 hover:shadow-md transition bg-gradient-to-br from-tamil-50 to-white dark:from-tamil-900/20 dark:to-slate-900">
          <div className="text-3xl">🤖</div>
          <div className="font-bold mt-2 text-lg">AI Tamil Tutor</div>
          <p className="text-sm text-stone-500 mt-1">Ask how to say something, practice a conversation, or get grammar help. Bring your own OpenRouter key for unlimited chat.</p>
          <div className="mt-3 text-brand-600 font-semibold text-sm">Start chatting →</div>
        </Link>
        <Link to="/certificates" className="card p-6 hover:shadow-md transition bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-900">
          <div className="text-3xl">🏅</div>
          <div className="font-bold mt-2 text-lg">Certificates</div>
          <p className="text-sm text-stone-500 mt-1">Attend 90%+ of a workshop to earn a verifiable certificate with QR code anyone can verify.</p>
          <div className="mt-3 text-amber-700 dark:text-amber-400 font-semibold text-sm">View certificates →</div>
        </Link>
      </section>

      {notifs.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent notifications</h2>
            <Link to="/notifications" className="text-sm text-brand-600 font-semibold">View all →</Link>
          </div>
          <div className="card divide-y divide-stone-100 dark:divide-slate-800">
            {notifs.slice(0,5).map((n: any) => (
              <div key={n.id} className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center">🔔</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="text-sm text-stone-500">{n.body}</div>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500"></span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <div className="bg-white/80 dark:bg-slate-900/60 rounded-2xl p-4 border border-white dark:border-slate-800 backdrop-blur">
      <div className="text-sm text-stone-500 flex items-center gap-1">{icon} {label}</div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
    </div>
  );
}
