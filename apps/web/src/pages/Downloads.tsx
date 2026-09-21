import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getDownloadedLessons, removeDownloadedLesson } from '@/lib/offline';
import { useOffline } from '@/lib/offline';

export default function Downloads() {
  const { online, queued, syncing } = useOffline();
  const [items, setItems] = useState<any[]>(getDownloadedLessons());
  const refresh = () => setItems(getDownloadedLessons());

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">📴 Offline Library</h1>
      <p className="text-stone-500 mt-1">Downloaded lessons available when you're offline.</p>

      <div className={`card p-4 mt-4 flex items-center gap-3 ${online?'bg-green-50 dark:bg-green-900/20':'bg-amber-50 dark:bg-amber-900/20'}`}>
        <div className={`w-3 h-3 rounded-full ${online?'bg-green-500':'bg-amber-500'}`}></div>
        <div className="text-sm flex-1">
          {online ? 'Online — progress will sync automatically.' : `Offline — ${queued} events queued.`}
        </div>
        {syncing && <div className="text-xs text-stone-500">Syncing…</div>}
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 && (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-3">📥</div>
            <div className="font-semibold">No downloads yet</div>
            <div className="text-sm text-stone-500 mt-1">Open a lesson and tap "Download for offline".</div>
            <Link to="/courses" className="btn-primary inline-flex mt-4">Browse courses</Link>
          </div>
        )}
        {items.map((it: any) => (
          <div key={it.lesson.id} className="card p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-400 to-tamil-500 flex items-center justify-center text-2xl">📴</div>
            <div className="flex-1">
              <div className="font-semibold">{it.lesson.title}</div>
              <div className="text-xs text-stone-500">{it.course.title} · Downloaded {new Date(it.downloaded_at).toLocaleString()}</div>
            </div>
            <Link to={`/learn/${it.course.id}/lessons/${it.lesson.id}`} className="btn-secondary">Open</Link>
            <button onClick={() => { removeDownloadedLesson(it.lesson.id); refresh(); }} className="btn-ghost text-red-500">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
