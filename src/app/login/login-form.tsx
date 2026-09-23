'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login failed');
      router.push(data.redirect ?? '/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-6" aria-label="Log in">
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="input pr-11"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-400 hover:text-ink-700" aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot" className="font-medium text-brand-700 hover:underline">
          Forgot password?
        </Link>
      </div>
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  );
}
