import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from './api';
import { useAuth } from './auth';

const OfflineCtx = createContext<{ online: boolean; queued: number; syncing: boolean; enqueue: (ev: any) => void }>({
  online: true, queued: 0, syncing: false, enqueue: () => {},
});

const DB_KEY = 'aurex_offline_queue_v1';
const STORE_KEY = 'aurex_offline_content_v1';

function loadQueue(): any[] {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch { return []; }
}
function saveQueue(q: any[]) { localStorage.setItem(DB_KEY, JSON.stringify(q)); }

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [queued, setQueued] = useState(loadQueue().length);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const goOnline = () => { setOnline(true); sync(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  const enqueue = useCallback((ev: any) => {
    const q = loadQueue();
    q.push(ev);
    saveQueue(q);
    setQueued(q.length);
    if (navigator.onLine) sync();
  }, []);

  const sync = useCallback(async () => {
    if (!user) return;
    const q = loadQueue();
    if (!q.length) return;
    setSyncing(true);
    try {
      const batch = q.slice(0, 50);
      await api('/sync', { method: 'POST', json: { events: batch } });
      const remaining = loadQueue().slice(batch.length);
      saveQueue(remaining);
      setQueued(remaining.length);
      if (remaining.length) sync();
    } catch {
      // keep queue for retry
    } finally {
      setSyncing(false);
    }
  }, [user]);

  useEffect(() => { if (user && navigator.onLine) sync(); }, [user, sync]);

  return <OfflineCtx.Provider value={{ online, queued, syncing, enqueue }}>{children}</OfflineCtx.Provider>;
}

export function useOffline() { return useContext(OfflineCtx); }

export function downloadLesson(lesson: any, course: any) {
  const key = `lesson_${lesson.id}`;
  const store = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  store[key] = { lesson, course, downloaded_at: new Date().toISOString() };
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}
export function getDownloadedLessons() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    return Object.values(s);
  } catch { return []; }
}
export function removeDownloadedLesson(id: string) {
  const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  delete s[`lesson_${id}`];
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
}
