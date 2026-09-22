'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const REACTIONS: { type: string; icon: string; label: string }[] = [
  { type: 'like', icon: '👍', label: 'Like' },
  { type: 'helpful', icon: '💡', label: 'Helpful' },
  { type: 'celebrate', icon: '🎉', label: 'Celebrate' },
];

export function PostActions({ postId, canReact }: { postId: number; canReact: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState('');

  const react = async (type: string) => {
    setBusy(type);
    try {
      await fetch('/api/communities/react', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: postId, type }) });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const commentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy('comment');
    try {
      await fetch('/api/communities/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: postId, body: comment.trim() }) });
      setComment('');
      setShowComment(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const report = async () => {
    setBusy('report');
    try {
      await fetch('/api/communities/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_type: 'post', target_id: postId, reason }) });
      setShowReport(false);
      setReason('');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {canReact &&
        REACTIONS.map((r) => (
          <button key={r.type} onClick={() => react(r.type)} disabled={busy === r.type} className="rounded-full border border-ink-200 px-3 py-1.5 text-xs hover:bg-ink-50" aria-label={`Mark as ${r.label.toLowerCase()}`}>
            {r.icon} {r.label}
          </button>
        ))}
      {canReact && (
        <button onClick={() => setShowComment((s) => !s)} className="rounded-full border border-ink-200 px-3 py-1.5 text-xs hover:bg-ink-50">
          💬 Comment
        </button>
      )}
      <button onClick={() => setShowReport((s) => !s)} className="rounded-full px-3 py-1.5 text-xs text-ink-400 hover:text-red-600">
        ⚑ Report
      </button>

      {showComment && (
        <form onSubmit={commentSubmit} className="mt-2 flex w-full gap-2">
          <input className="input tamil !py-2 text-sm" placeholder="Write a supportive comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button type="submit" disabled={busy === 'comment' || !comment.trim()} className="btn-secondary !py-2 text-xs">
            Send
          </button>
        </form>
      )}

      {showReport && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            report();
          }}
          className="mt-2 flex w-full gap-2"
        >
          <input className="input !py-2 text-sm" placeholder="Why are you reporting this?" value={reason} onChange={(e) => setReason(e.target.value)} required />
          <button type="submit" disabled={busy === 'report' || !reason.trim()} className="btn-danger !py-2 text-xs">
            Report
          </button>
        </form>
      )}
    </div>
  );
}
