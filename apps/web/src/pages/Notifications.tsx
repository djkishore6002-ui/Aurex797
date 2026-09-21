import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function Notifications() {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const d = await api<any>('/notifications/mine');
    setItems(d.items);
  };
  useEffect(() => { load(); }, []);
  const markAll = async () => { await api('/notifications/read-all', { method: 'POST' }); load(); };
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">🔔 Notifications</h1>
        <button onClick={markAll} className="btn-secondary text-sm">Mark all read</button>
      </div>
      <div className="mt-5 card divide-y divide-stone-100 dark:divide-slate-800">
        {items.length === 0 && <div className="p-8 text-center text-stone-500">No notifications yet.</div>}
        {items.map((n: any) => (
          <div key={n.id} className={`p-4 flex items-start gap-3 ${!n.read?'bg-brand-50/50 dark:bg-brand-500/5':''}`}>
            <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center text-lg">🔔</div>
            <div className="flex-1">
              <div className="font-semibold">{n.title}</div>
              <div className="text-sm text-stone-600 dark:text-stone-300">{n.body}</div>
              <div className="text-xs text-stone-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-2"></span>}
          </div>
        ))}
      </div>
    </div>
  );
}
