const CACHE_VERSION = 'gc-v2';
const STATIC_CACHE = `gc-static-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/management.html',
  '/staff-os.html',
  '/staff-portal.html',
  '/accounts-console.html',
  '/operations-suite.html',
  '/styles.css',
  '/tracking-styles.css',
  '/tracking-enhanced.js',
  '/tracking-integration.html',
  '/translations.js',
  '/form-validation.js',
  '/form-validation-styles.css',
  '/whatsapp-messenger.js',
  '/webhook-handler.js',
  '/admin-dashboard.js',
  '/price-calculator.js',
  '/logo-icon.png',
  '/og-image.jpg',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith('gc-static-') && key !== STATIC_CACHE)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isAsset = ['style', 'script', 'image', 'font'].includes(request.destination);
  const isNavigation = request.mode === 'navigate';

  if (isNavigation) {
    event.respondWith(
      fetch(request).then((response) => response).catch(async () => {
        const cached = await caches.match('/index.html');
        return cached || caches.match('/');
      })
    );
    return;
  }

  if (!isAsset) return;

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        return cached || Response.error();
      }
    })
  );
});