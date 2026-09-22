'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  requireText?: string; // e.g. "DELETE" — user must type it
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', requireText, onConfirm, onClose }: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) {
      setTyped('');
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  if (!open) return null;
  const blocked = !!requireText && typed !== requireText;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-ink-950">{title}</h3>
            <p className="mt-1 text-sm text-ink-600">{body}</p>
            {requireText && (
              <div className="mt-3">
                <label className="label" htmlFor="confirm-type">
                  Type <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs font-bold">{requireText}</code> to confirm
                </label>
                <input id="confirm-type" ref={inputRef} value={typed} onChange={(e) => setTyped(e.target.value)} className="input" placeholder={requireText} autoComplete="off" />
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={blocked} className="btn-danger">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
