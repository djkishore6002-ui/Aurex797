import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await login(email, password); nav('/'); }
    catch (e: any) { setErr(e.message || 'Login failed'); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen hero-grad flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-md shadow-xl animate-fade-in">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-tamil-600 flex items-center justify-center text-white font-tamil font-bold text-xl">த</div>
          <div className="font-extrabold text-xl">Aurex</div>
        </div>
        <h1 className="text-2xl font-extrabold">Welcome back</h1>
        <p className="text-stone-500 text-sm mt-1">Log in to continue learning Tamil.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required /></div>
          <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required minLength={6} /></div>
          {err && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 rounded-lg">{err}</div>}
          <button disabled={busy} className="btn-primary w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="mt-4 text-sm text-stone-500 text-center">New here? <Link to="/register" className="text-brand-600 font-semibold">Create an account</Link></div>
        <div className="mt-6 text-xs text-stone-500 bg-stone-50 dark:bg-slate-900 p-3 rounded-lg">
          <div className="font-semibold mb-1">Demo accounts:</div>
          <div>admin@aurex.local / admin123</div>
          <div>organizer@aurex.local / organizer123</div>
          <div>learner@aurex.local / learner123</div>
        </div>
      </div>
    </div>
  );
}
