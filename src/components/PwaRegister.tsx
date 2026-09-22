'use client';

import { useEffect } from 'react';

/** Registers the service worker (PWA + offline app shell) on the client. */
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline support unavailable — app still works online */
      });
    }
  }, []);
  return null;
}
