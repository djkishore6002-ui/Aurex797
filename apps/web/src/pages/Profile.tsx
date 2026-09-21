import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Profile() {
  const { user, profile, refresh, logout } = useAuth();
  const [form, setForm] = useState<any>({ name: user?.name || '', bio: profile?.bio || '', daily_goal_minutes: profile?.daily_goal_minutes || 15 });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  useEffect(() => {
    setForm({ name: user?.name || '', bio: profile?.bio || '', daily_goal_minutes: profile?.daily_goal_minutes || 15 });
    api('/courses/stats/me').then(setStats);
    api('/courses/my/enrollments').then((d: any) => setEnrollments(d.items));
  }, [user, profile]);

  const save = async () => {
    setSaving(true);
    try { await api('/auth/me', { method: 'PATCH', json: form }); await refresh(); }
    catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-tamil-600 flex items-center justify-center text-white font-bold text-2xl">{user?.name[0]}</div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold">{user?.name}</h1>
            <div className="text-sm text-stone-500">{user?.email} · <span className="capitalize">{user?.role}</span></div>
          </div>
          <button onClick={()=>{ logout(); location.href='/login'; }} className="btn-secondary">Logout</button>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="XP" value={stats?.xp ?? 0} />
          <Stat label="Streak 🔥" value={`${stats?.streak ?? 0}d`} />
          <Stat label="Lessons" value={stats?.lessonsCompleted ?? 0} />
          <Stat label="Words" value={stats?.wordsLearned ?? 0} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-5">
        <div className="card p-6">
          <h2 className="font-bold text-lg">Edit profile</h2>
          <div className="mt-4 space-y-3">
            <div><label className="label">Name</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div><label className="label">Daily goal (minutes)</label><input className="input" type="number" min={5} max={240} value={form.daily_goal_minutes} onChange={e=>setForm({...form,daily_goal_minutes:parseInt(e.target.value)||15})}/></div>
            <div><label className="label">Bio</label><textarea className="input h-24 resize-none" value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></div>
            <button onClick={save} disabled={saving} className="btn-primary">{saving?'Saving…':'Save changes'}</button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-lg">Quick links</h2>
          <div className="mt-3 grid gap-2">
            <Link to="/certificates" className="btn-secondary justify-between">🏅 My certificates <span>→</span></Link>
            <Link to="/downloads" className="btn-secondary justify-between">📴 Offline downloads <span>→</span></Link>
            <Link to="/ai/settings" className="btn-secondary justify-between">⚙️ AI settings <span>→</span></Link>
            <Link to="/speaking" className="btn-secondary justify-between">🎤 Speaking practice <span>→</span></Link>
            <Link to="/announcements" className="btn-secondary justify-between">📣 Announcements <span>→</span></Link>
          </div>
        </div>
      </div>

      <div className="card p-6 mt-5">
        <h2 className="font-bold text-lg">My courses</h2>
        <div className="mt-3 space-y-2">
          {enrollments.length === 0 && <div className="text-sm text-stone-500">Not enrolled in any courses yet. <Link to="/courses" className="text-brand-600 font-semibold">Browse courses →</Link></div>}
          {enrollments.map((e: any) => (
            <Link key={e.id} to={`/courses/${e.course_id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-slate-800">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-400 to-tamil-500 flex items-center justify-center text-xl">📚</div>
              <div className="flex-1">
                <div className="font-semibold">{e.title}</div>
                <div className="text-xs text-stone-500">{e.progress_percent}% complete</div>
              </div>
              <div className="w-24 progress-track"><div className="progress-fill" style={{width:`${e.progress_percent}%`}}></div></div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({label, value}: any) {
  return (
    <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-900 text-center">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}
