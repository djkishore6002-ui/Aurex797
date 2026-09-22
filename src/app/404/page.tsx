import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center justify-center py-24 text-center">
      <p className="tamil text-6xl font-bold text-brand-800" aria-hidden>தேடல்</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">
        This page has wandered off the learning path. The page you are looking for does not exist (or is unpublished).
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-secondary">Home</Link>
        <Link href="/learn" className="btn-primary">Browse courses</Link>
      </div>
    </div>
  );
}
