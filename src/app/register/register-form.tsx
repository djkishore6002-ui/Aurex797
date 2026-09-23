'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NATIVE_LANG_OPTIONS as LANGS } from '@/lib/i18n-data';

export function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', native_language: 'en', learning_goal: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-6" aria-label="Create account">
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="label" htmlFor="name">
          Full name
        </label>
        <input id="name" required minLength={2} className="input" placeholder="Priya Nair" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input id="password" type="password" autoComplete="new-password" required minLength={8} className="input" placeholder="At least 8 characters" value={form.password} onChange={(e) => set('password', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="lang">
            Your language <span className="font-normal text-ink-400">(we explain in it)</span>
          </label>
          <select id="lang" className="input" value={form.native_language} onChange={(e) => set('native_language', e.target.value)}>
            {LANGS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="goal">
            Learning goal <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <input id="goal" className="input" placeholder="e.g. speak with family" value={form.learning_goal} onChange={(e) => set('learning_goal', e.target.value)} />
        </div>
      </div>
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-center text-xs text-ink-400">
        By joining you agree to the{' '}
        <a href="/terms" className="underline">
          Terms
        </a>{' '}
        and{' '}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
