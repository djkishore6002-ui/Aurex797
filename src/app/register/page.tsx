import type { Metadata } from 'next';
import Link from 'next/link';
import { Register } from './register-form';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span aria-hidden className="tamil mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-700 text-3xl font-bold text-white">ச</span>
          <h1 className="mt-4 text-2xl font-bold">Create your free account</h1>
          <p className="mt-1 text-sm text-ink-500">
            One garden, every level — from <span className="tamil font-semibold">அ</span> to confident conversation.
          </p>
        </div>
        <Register />
        <p className="mt-5 text-center text-sm text-ink-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
