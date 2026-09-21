import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function OrganizerAnnouncements() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', body: '', scope: 'global', scope_id: '', notify_users: true });
  const [busy, setBusy] = useState(false);
  const load = () => api('/announcements?scope=global').then((d: any) => setItems(d.items));
  useEffect(() => { load(); }, []);
  const post = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api('/announcements', { method: 'POST', json: form }); setForm({title:'',body:'',scope:'global',scope_id:'',notify_users:true}); load(); }
    catch (err: any) { alert(err.message); }
    setBusy(false);
  };
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">Announcements</h1>
      <form onSubmit={post} className="card p-5 mt-5 space-y-3">
        <input className="input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/>
        <textarea className="input h-24 resize-none" placeholder="Announcement body..." value={form.body} onChange={e=>setForm({...form,body:e.target.value})} required/>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.notify_users} onChange={e=>setForm({...form,notify_users:e.target.checked})}/> Notify users</label>
        </div>
        <button disabled={busy} className="btn-primary">{busy?'Sending…':'Post announcement'}</button>
      </form>
      <div className="mt-5 space-y-3">
        {items.map((a: any) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-center justify-between">
              <div className="font-bold">{a.title}</div>
              <div className="text-xs text-stone-500">{new Date(a.created_at).toLocaleDateString()}</div>
            </div>
            <p className="mt-2 text-stone-700 dark:text-stone-300">{a.body}</p>
            <div className="text-xs text-stone-500 mt-2">by {a.author}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
