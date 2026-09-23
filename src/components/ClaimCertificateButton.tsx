'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ClaimCertificateButton({ kind, id }: { kind: 'course' | 'workshop'; id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {done ? (
        <span className="rounded-xl bg-brand-100 px-4 py-2.5 text-sm font-bold text-brand-800">
          🎓 Issued! <a href={`/verify/${done}`} className="underline">{done}</a>
        </span>
      ) : (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch('/api/certificates/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(kind === 'course' ? { type: 'course', course_id: id } : { type: 'workshop', workshop_id: id }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error ?? 'Could not issue certificate');
              setDone(data.certificate_id);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not issue certificate');
            } finally {
              setBusy(false);
            }
          }}
          className="btn-primary"
        >
          {busy ? 'Issuing…' : 'Claim certificate'}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
