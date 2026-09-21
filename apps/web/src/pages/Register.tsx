import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await register(form.name, form.email, form.password, 'learner'); nav('/welcome'); }
    catch (e: any) { setErr(e.message || 'Registration failed'); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen hero-grad flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-md shadow-xl animate-fade-in">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-tamil-600 flex items-center justify-center text-white font-tamil font-bold text-xl">த</div>
          <div className="font-extrabold text-xl">Aurex</div>
        </div>
        <h1 className="text-2xl font-extrabold">Create your account</h1>
        <p className="text-stone-500 text-sm mt-1">Start learning Tamil in under a minute.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div><label className="label">Full name</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="Your name" /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required placeholder="you@example.com" /></div>
          <div><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={6} placeholder="At least 6 characters" /></div>
          {err && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{err}</div>}
          <button disabled={busy} className="btn-primary w-full">{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <div className="mt-4 text-sm text-stone-500 text-center">Have an account? <Link to="/login" className="text-brand-600 font-semibold">Log in</Link></div>
      </div>
    </div>
  );
}
