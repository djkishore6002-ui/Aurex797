'use client';

import { useEffect } from 'react';
import type { TutorContext } from './AiTutor';

/**
 * Mount inside lesson / workshop / vocabulary / scenario pages.
 * Pushes the current page context to the floating AI tutor, and clears it
 * when the page unmounts — giving context-aware AI with zero layout changes.
 */
export function TutorContextBridge({ context }: { context: TutorContext }) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('solai:tutor-context', { detail: context }));
    return () => {
      window.dispatchEvent(new CustomEvent('solai:tutor-context', { detail: null }));
    };
  }, [context.type, context.id, context.label]);
  return null;
}
