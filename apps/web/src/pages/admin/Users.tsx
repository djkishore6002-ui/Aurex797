import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function AdminUsers() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'organizer' as 'organizer'|'admin' });
  const load = () => api('/admin/users').then((d: any) => setItems(d.items));
  useEffect(() => { load(); }, []);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api('/admin/users', { method: 'POST', json: form }); setShowForm(false); setForm({email:'',password:'',name:'',role:'organizer'}); load(); }
    catch (err: any) { alert(err.message); }
  };
  const ban = async (id: string, banned: boolean) => {
    await api(`/admin/users/${id}/${banned?'unban':'ban'}`, { method: 'POST' }); load();
  };
  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Users</h1>
        <button onClick={()=>setShowForm(s=>!s)} className="btn-primary">{showForm?'Cancel':'+ Create organizer'}</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="card p-5 mt-5 grid md:grid-cols-4 gap-3">
          <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
          <input className="input" placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
          <input className="input" placeholder="Password (min 6)" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={6}/>
          <select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value as any})}>
            <option value="organizer">Organizer</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn-primary md:col-span-4">Create</button>
        </form>
      )}
      <div className="card mt-5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 dark:bg-slate-900 text-left">
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Created</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {items.map((u: any) => (
              <tr key={u.id} className="border-t border-stone-100 dark:border-slate-800">
                <td className="p-3 font-semibold">{u.name}</td>
                <td className="p-3 text-stone-500">{u.email}</td>
                <td className="p-3"><span className="badge bg-stone-100 dark:bg-slate-800 capitalize">{u.role}</span></td>
                <td className="p-3 text-stone-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  {u.role !== 'admin' && <button onClick={()=>ban(u.id, !!u.banned)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${u.banned?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{u.banned?'Unban':'Suspend'}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
