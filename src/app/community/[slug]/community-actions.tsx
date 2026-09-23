'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CommunityActions({ communityId, isMember }: { communityId: number; isMember: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/communities/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ community_id: communityId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not join');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join');
      setBusy(false);
    }
  };

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/communities/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ community_id: communityId, title, body }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not post');
      setTitle('');
      setBody('');
      setShowNew(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {!isMember ? (
        <button onClick={join} disabled={busy} className="btn-primary">
          {busy ? 'Joining…' : 'Join community'}
        </button>
      ) : (
        <button onClick={() => setShowNew((s) => !s)} className="btn-primary">
          {showNew ? 'Close' : '+ New post'}
        </button>
      )}
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
      {showNew && isMember && (
        <form onSubmit={post} className="card w-full space-y-3 p-4 text-left">
          <input className="input" placeholder="Title (in Tamil or English)" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
          <textarea className="input min-h-[90px] tamil" placeholder="Write your post… (Tamil script welcome!)" value={body} onChange={(e) => setBody(e.target.value)} required minLength={3} />
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
