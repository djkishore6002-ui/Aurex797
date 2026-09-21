import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function AnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api('/announcements?scope=global').then((d: any) => setItems(d.items)); }, []);
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">📣 Announcements</h1>
      <div className="mt-5 space-y-3">
        {items.map((a: any) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{a.title}</h3>
              <span className="text-xs text-stone-500">{new Date(a.created_at).toLocaleDateString()}</span>
            </div>
            <p className="mt-2 text-stone-700 dark:text-stone-300">{a.body}</p>
            <div className="text-xs text-stone-500 mt-2">by {a.author}</div>
          </div>
        ))}
        {items.length === 0 && <div className="text-stone-500 text-center p-8">No announcements yet.</div>}
      </div>
    </div>
  );
}
