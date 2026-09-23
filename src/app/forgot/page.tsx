import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Reset password' };

export default function ForgotPage() {
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="mt-1 text-sm text-ink-500">
            We will show a reset code here. (In production this is emailed — the mail provider is configured in settings.)
          </p>
        </div>
        <ForgotForm />
        <p className="mt-5 text-center text-sm text-ink-500">
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            ← Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}

import { ForgotForm } from './forgot-form';
