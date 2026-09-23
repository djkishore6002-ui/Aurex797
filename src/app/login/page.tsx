import type { Metadata } from 'next';
import Link from 'next/link';
import { Login } from './login-form';
import { getDb } from '@/db';

export const metadata: Metadata = { title: 'Log in' };

/** Demo credentials are surfaced only while the development seed data exists. */
function demoAccounts(): { email: string; role: string }[] {
  try {
    const db = getDb();
    const rows = db
      .prepare("SELECT email, role FROM users WHERE email LIKE '%@solai.test' AND is_active = 1 ORDER BY role, email")
      .all() as unknown as { email: string; role: string }[];
    return rows;
  } catch {
    return [];
  }
}

export default function LoginPage() {
  const demos = demoAccounts();
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span aria-hidden className="tamil mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-700 text-3xl font-bold text-white">ச</span>
          <h1 className="mt-4 text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-500">Log in to continue your Tamil journey</p>
        </div>
        {demos.length > 0 && (
          <div className="mb-5 rounded-xl border border-marigold-400/30 bg-marigold-400/10 px-4 py-3 text-xs leading-relaxed text-marigold-200">
            <p className="font-bold">DEVELOPMENT BUILD — demo accounts (passwords: admin1234 / organizer1234 / teacher1234 / learner1234)</p>
            <p className="mt-1">
              {demos.map((d) => (
                <span key={d.email} className="mr-3 inline-block">
                  <b>{d.role.replace('_', ' ')}</b> {d.email}
                </span>
              ))}
            </p>
          </div>
        )}
        <Login />
        <p className="mt-5 text-center text-sm text-ink-500">
          New to Solai?{' '}
          <Link href="/register" className="font-semibold text-brand-700 hover:underline">
            Create a free account
          </Link>
        </p>
      </div>
    </div>
  );
}
