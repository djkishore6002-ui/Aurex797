'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ResolveButton({ questionId }: { questionId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch('/api/questions/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question_id: questionId }) });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="btn-secondary mt-4 !py-1.5 text-xs"
    >
      {busy ? 'Resolving…' : '✓ Mark as resolved'}
    </button>
  );
}
