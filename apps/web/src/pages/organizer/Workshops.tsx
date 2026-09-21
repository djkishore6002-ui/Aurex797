import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

export default function OrganizerWorkshops() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{title:string;description:string;meeting_url:string;capacity:number|string;start_time:string;duration_minutes:number|string;}>({ title: '', description: '', meeting_url: 'https://meet.google.com/', capacity: 50, start_time: '', duration_minutes: 60 });
  const load = () => api('/workshops').then((d: any) => setItems(d.items));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.start_time) return alert('Start time required');
    try {
      await api('/workshops', { method: 'POST', json: { ...form, capacity: Number(form.capacity), duration_minutes: Number(form.duration_minutes) } });
      setShowForm(false); setForm({ title:'',description:'',meeting_url:'https://meet.google.com/',capacity:50,start_time:'',duration_minutes:60 });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const issueCerts = async (id: string) => {
    const r = await api(`/workshops/${id}/certificates/generate`, { method: 'POST' });
    alert(`Issued ${r.issued} certificate(s).`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Workshops</h1>
        <button onClick={()=>setShowForm(s=>!s)} className="btn-primary">{showForm?'Cancel':'+ New workshop'}</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card p-6 mt-5 space-y-3 animate-fade-in">
          <div><label className="label">Title</label><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/></div>
          <div><label className="label">Description</label><textarea className="input h-24 resize-none" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required/></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="label">Meeting URL (Google Meet / Zoom)</label><input className="input" value={form.meeting_url} onChange={e=>setForm({...form,meeting_url:e.target.value})} required/></div>
            <div><label className="label">Start time</label><input className="input" type="datetime-local" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})} required/></div>
            <div><label className="label">Capacity</label><input className="input" type="number" min={1} value={form.capacity} onChange={e=>setForm({...form,capacity:parseInt(e.target.value)||50})}/></div>
            <div><label className="label">Duration (minutes)</label><input className="input" type="number" min={15} value={form.duration_minutes} onChange={e=>setForm({...form,duration_minutes:parseInt(e.target.value)||60})}/></div>
          </div>
          <button className="btn-primary">Publish workshop</button>
        </form>
      )}

      <div className="mt-5 grid md:grid-cols-2 gap-4">
        {items.map((w: any) => (
          <div key={w.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold">{w.title}</div>
                <div className="text-xs text-stone-500 mt-1">by {w.instructor_name} · {w.registered}/{w.capacity}</div>
              </div>
              <span className="badge bg-green-100 text-green-700">{w.is_paid?`$${w.price}`:'Free'}</span>
            </div>
            <p className="text-sm text-stone-500 mt-2 line-clamp-2">{w.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/workshops/${w.id}`} className="btn-secondary text-sm">View</Link>
              <Link to={`/organizer/workshops/${w.id}/attendance`} className="btn-secondary text-sm">Attendance</Link>
              <button onClick={()=>issueCerts(w.id)} className="btn-primary text-sm">Issue certificates</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
