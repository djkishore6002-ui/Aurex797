/*
 * Solai PWA service worker.
 * Strategy:
 *  - App shell (page navigations): network-first with cache fallback (offline start page)
 *  - Static assets (js/css/images): stale-while-revalidate
 *  - API + live content: network only (never serve stale data for auth/progress)
 * Offline-first learning content (downloads) is handled separately via IndexedDB
 * on the client — this SW intentionally does not cache lesson video streams.
 */
const VERSION = 'solai-v2';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const CORE = ['/', '/manifest.json', '/icon.svg', '/learn', '/workshops', '/vocabulary', '/practice', '/community', '/faq'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      for (const url of CORE) {
        try {
          await shell.add(new Request(url, { mode: 'navigate' }));
        } catch {
          /* ignore individual failures */
        }
      }
      await caches.open(ASSETS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (!key.startsWith(VERSION)) await caches.delete(key);
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache: API routes, live data
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network-first, fall back to shell
  if (req.mode === 'navigate') {
    e.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SHELL);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(SHELL);
          const cached = await cache.match(req) || (await cache.match('/'));
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Static assets: stale-while-revalidate
  e.respondWith(
    (async () => {
      const cache = await caches.open(ASSETS);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })()
  );
});
