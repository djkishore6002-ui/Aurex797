/*
 * Solai PWA service worker.
 *
 * Strategy (correctness-first — a stale cache once shipped a broken
 * player version to users, so page HTML is NEVER cached):
 *  - Page navigations: NETWORK ONLY. The server is always the source of
 *    truth; a hard refresh always gives the latest build.
 *  - Hashed static assets (_next/static): stale-while-revalidate — safe,
 *    because the filename hash is derived from the file content, so a
 *    given URL can never change meaning.
 *  - API + live content: network only (never serve stale data).
 * Offline-first learning content (downloads) is handled separately via
 * IndexedDB on the client — this SW intentionally does not cache
 * lesson video streams.
 */
const VERSION = 'solai-v4';
const ASSETS = `${VERSION}-assets`;
const CORE = ['/manifest.json', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(ASSETS);
      for (const url of CORE) {
        try {
          await cache.add(url);
        } catch {
          /* ignore individual failures */
        }
      }
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // Wipe every cache that isn't ours (this is what purges the old
      // cached page HTML from previous versions).
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

  // Page navigations: network only — never serve a cached copy of a page.
  if (req.mode === 'navigate') return;

  // Static assets: stale-while-revalidate (immutable hashed files).
  if (url.pathname.startsWith('/_next/static/')) {
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
    return;
  }

  // Everything else: network only.
});
