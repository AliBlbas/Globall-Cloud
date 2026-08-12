const CACHE_VERSION = 'gc-v11';
const STATIC_CACHE = `gc-static-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/', '/index.html', '/management.html', '/staff-os.html', '/staff-portal.html',
  '/accounts-console.html', '/operations-suite.html', '/styles.css', '/tracking-styles.css',
  '/mobile-final.css', '/mobile-polish.css', '/logo-fix.css', '/staff-auth-fix.js', '/superadmin.css', '/tracking-enhanced.js', '/tracking-integration.html', '/translations.js',
  '/form-validation.js', '/form-validation-styles.css', '/whatsapp-messenger.js', '/webhook-handler.js',
  '/admin-dashboard.js', '/price-calculator.js', '/logo-icon-original.png', '/logo-icon.png', '/og-image.jpg', '/manifest.json'
];

const MOBILE_CSS = '/mobile-final.css?v=20260812-11';
const MOBILE_POLISH_CSS = '/mobile-polish.css?v=20260812-1';
const LOGO_CSS = '/logo-fix.css?v=20260812-5';
const SUPERADMIN_CSS = '/superadmin.css?v=20260811-1';
const PINGDOM_SCRIPT = '<script src="//rum-static.pingdom.net/pa-6a7b6dd8a6e49b001200002c.js" async></script>';
const STAFF_AUTH_SCRIPT = '<script src="/staff-auth-fix.js?v=20260811-2" defer></script>';

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

function injectSiteAssets(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  return response.text().then((html) => {
    let injected = html;
    const path = new URL(response.url || self.location.href).pathname;

    if (!injected.includes('rum-static.pingdom.net/pa-6a7b6dd8a6e49b001200002c.js')) {
      injected = injected.replace(/<head([^>]*)>/i, `<head$1>${PINGDOM_SCRIPT}`);
    }

    if (/\/staff-os\.html$/.test(path) && !injected.includes('/staff-auth-fix.js')) {
      injected = injected.replace(/<head([^>]*)>/i, `<head$1>${STAFF_AUTH_SCRIPT}`);
    }

    if (/\/staff-os\.html$/.test(path) && !injected.includes('/superadmin.css')) {
      injected = injected.replace(/<\/head>/i, `<link rel="stylesheet" href="${SUPERADMIN_CSS}"></head>`);
    }

    if (!injected.includes('/logo-fix.css')) {
      injected = injected.replace(/<\/head>/i, `<link rel="stylesheet" href="${LOGO_CSS}"></head>`);
    }

    if (!injected.includes('/mobile-final.css')) {
      injected = injected.replace(/<\/head>/i, `<link rel="stylesheet" href="${MOBILE_CSS}" media="screen and (max-width: 760px)"></head>`);
    }

    if (!injected.includes('/mobile-polish.css')) {
      injected = injected.replace(/<\/head>/i, `<link rel="stylesheet" href="${MOBILE_POLISH_CSS}" media="screen and (max-width: 760px)"></head>`);
    }

    const headers = new Headers(response.headers);
    headers.delete('content-encoding');
    headers.delete('content-length');
    headers.delete('etag');
    headers.set('content-type', 'text/html; charset=UTF-8');

    return new Response(injected, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
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
        .then(injectSiteAssets)
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached ? injectSiteAssets(cached) : Response.error();
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