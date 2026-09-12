/* Globall Cloud — enterprise service worker
 * Purpose: eliminate stale UI/cache regressions while keeping a safe network-first fallback.
 */
const CACHE_NAME = 'globall-cloud-v6-enterprise';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always fetch navigations fresh. Never serve stale HTML from a prior release.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Assets are network-first so the latest CSS/JS always wins. A fresh cache
  // fallback is used only when the network is unavailable.
  if (['script', 'style', 'image', 'font', 'manifest', 'worker'].includes(request.destination)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error())),
    );
  }
});
