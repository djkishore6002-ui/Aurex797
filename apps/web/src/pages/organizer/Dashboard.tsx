import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

export default function OrganizerDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  useEffect(() => {
    api('/organizer/stats').then(setStats);
    api('/questions?status=pending').then((d: any) => setQuestions(d.items));
  }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">Organizer Dashboard</h1>
      <p className="text-stone-500 mt-1">Manage your courses, workshops, and learners.</p>

      <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat icon="📚" label="Courses" value={stats?.courses ?? 0} />
        <Stat icon="🎓" label="Workshops" value={stats?.workshops ?? 0} />
        <Stat icon="👥" label="Learners" value={stats?.learners ?? 0} />
        <Stat icon="❓" label="Pending Qs" value={stats?.pending_questions ?? 0} />
        <Stat icon="🏅" label="Certificates" value={stats?.certificates ?? 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <Link to="/organizer/courses/new" className="card p-6 hover:shadow-md transition bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-slate-900">
          <div className="text-3xl">📚</div>
          <div className="font-bold mt-2 text-lg">+ Create course</div>
          <div className="text-sm text-stone-500">Add modules, lessons, video, vocab, quizzes.</div>
        </Link>
        <Link to="/organizer/workshops" className="card p-6 hover:shadow-md transition bg-gradient-to-br from-tamil-50 to-white dark:from-tamil-900/20 dark:to-slate-900">
          <div className="text-3xl">🎓</div>
          <div className="font-bold mt-2 text-lg">+ Schedule workshop</div>
          <div className="text-sm text-stone-500">Live classes with attendance tracking and certificates.</div>
        </Link>
        <Link to="/organizer/announcements" className="card p-6 hover:shadow-md transition bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-900">
          <div className="text-3xl">📣</div>
          <div className="font-bold mt-2 text-lg">Announcements</div>
          <div className="text-sm text-stone-500">Broadcast messages to all enrolled learners.</div>
        </Link>
      </div>

      <div className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Pending questions</h3>
          <Link to="/organizer/questions" className="text-sm text-brand-600 font-semibold">View all →</Link>
        </div>
        <div className="mt-3 space-y-2">
          {questions.length === 0 && <div className="text-sm text-stone-500">No pending questions. 🎉</div>}
          {questions.slice(0,5).map((q: any) => (
            <Link to="/organizer/questions" key={q.id} className="block p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-slate-800">
              <div className="text-xs text-stone-500">{q.asker_name}</div>
              <div className="text-sm">{q.body}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: any) {
  return (
    <div className="card p-4">
      <div className="text-2xl">{icon}</div>
      <div className="text-xs text-stone-500 mt-1">{label}</div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}
