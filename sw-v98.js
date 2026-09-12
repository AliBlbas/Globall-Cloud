const VERSION = '20260912-6';
const CACHE = `gc-public-${VERSION}`;
const hardfixTag = `<script src="/public-hardfix-v2.js?v=${VERSION}" defer data-gc-public-hardfix="1"></script>`;

function patchDocument(response) {
  if (!response || !(response.headers.get('content-type') || '').toLowerCase().includes('text/html')) return response;
  return response.text().then((html) => {
    let out = html;
    out = out.replace(/\/gc-csp-scripts\/index-inline-1\.js\?v=[^"']+/g, `/gc-csp-scripts/index-inline-1.js?v=${VERSION}`);
    out = out.replace(/\/gc-csp-scripts\/index-inline-2\.js\?v=[^"']+/g, `/gc-csp-scripts/index-inline-2.js?v=${VERSION}`);
    out = out.replace(/\/public-route-bootstrap\.js\?v=[^"']+/g, `/public-route-bootstrap.js?v=${VERSION}`);
    if (!out.includes('data-gc-public-hardfix')) out = out.replace(/<\/body>/i, `${hardfixTag}</body>`);
    const headers = new Headers(response.headers);
    headers.delete('content-encoding');
    headers.delete('content-length');
    headers.delete('etag');
    headers.set('content-type', 'text/html; charset=UTF-8');
    headers.set('cache-control', 'no-store, max-age=0, must-revalidate');
    return new Response(out, { status: response.status, statusText: response.statusText, headers });
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => (key.startsWith('gc-static-') || key.startsWith('gc-public-')) && key !== CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => patchDocument(response))
        .catch(() => Response.error()),
    );
    return;
  }

  if (['script', 'style', 'worker', 'manifest'].includes(request.destination)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => caches.match(request).then((cached) => cached || Response.error())),
    );
  }
});
