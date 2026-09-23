'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

export function EnrollButton({ courseId, enrolled }: { courseId: number; enrolled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (enrolled) {
    return (
      <button disabled className="btn border border-brand-500/40 bg-brand-500/20 text-white">
        <CheckCircle2 className="h-4 w-4" /> Enrolled
      </button>
    );
  }

  return (
    <div>
      {error && <p role="alert" className="mb-2 text-right text-xs font-medium text-red-200">{error}</p>}
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch('/api/enroll', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ course_id: courseId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Enrollment failed');
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Enrollment failed');
            setBusy(false);
          }
        }}
        className="btn bg-marigold-400 font-bold text-brand-950 hover:bg-marigold-300"
      >
        {busy ? 'Enrolling…' : 'Enroll now — free'}
      </button>
      {!enrolled && !busy && <p className="mt-1.5 text-right text-[11px] text-brand-300">
        <Link href="/login" className="underline">Log in</Link> to save your progress
      </p>}
    </div>
  );
}
