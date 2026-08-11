const CACHE_VERSION = 'gc-v6';
const STATIC_CACHE = `gc-static-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/', '/index.html', '/management.html', '/staff-os.html', '/staff-portal.html',
  '/accounts-console.html', '/operations-suite.html', '/styles.css', '/tracking-styles.css',
  '/mobile-final.css', '/tracking-enhanced.js', '/tracking-integration.html', '/translations.js',
  '/form-validation.js', '/form-validation-styles.css', '/whatsapp-messenger.js', '/webhook-handler.js',
  '/admin-dashboard.js', '/price-calculator.js', '/logo-icon.png', '/og-image.jpg', '/manifest.json'
];

const MOBILE_CSS = '/mobile-final.css?v=20260811-6';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('gc-static-') && key !== STATIC_CACHE)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

function injectMobileStyles(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;
  return response.text().then((html) => {
    if (html.includes('/mobile-final.css')) return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
    const link = `<link rel="stylesheet" href="${MOBILE_CSS}" media="screen and (max-width: 760px)">`;
    const injected = html.replace(/<\/head>/i, `${link}</head>`);
    const headers = new Headers(response.headers);
    headers.delete('content-encoding');
    headers.delete('content-length');
    headers.delete('etag');
    headers.set('content-type', 'text/html; charset=UTF-8');
    return new Response(injected, { status: response.status, statusText: response.statusText, headers });
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(injectMobileStyles)
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached ? injectMobileStyles(cached) : Response.error();
        })
    );
    return;
  }

  const isStaticAsset = ['style', 'script', 'image', 'font'].includes(request.destination);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return cached || Response.error();
      }
    })
  );
});
