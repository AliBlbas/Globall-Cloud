const CACHE_VERSION = 'gc-v3';
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

/* The public site is intentionally mobile-first on narrow screens.
   Keep the override here so every CSS entry point receives the same guardrail
   even when an older static stylesheet is still present in the browser cache. */
const MOBILE_OVERRIDE = `
@media (max-width:760px){
  html,body{width:100%;max-width:100%;min-width:0;overflow-x:clip;-webkit-text-size-adjust:100%;text-size-adjust:100%;}

  .top-announcement{min-height:48px;}
  .top-announcement-inner{width:100%;max-width:100%;padding:7px 12px;gap:7px;flex-wrap:nowrap;justify-content:center;overflow:hidden;}
  .announcement-pill,.announcement-chip{min-width:0;max-width:100%;padding:6px 9px;font-size:9.5px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:none;}

  .nav{min-height:64px;}
  .nav-inner{padding:10px 12px;gap:8px;min-height:64px;}
  .nav-links,.nav-auth{display:none!important;}
  .nav-right{display:flex;align-items:center;gap:7px;margin-inline-start:auto;min-width:0;}
  .brand{min-width:0;gap:8px;}
  .brand b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .brand small{font-size:9px;white-space:nowrap;}
  .brand-logo{width:36px;height:36px;}
  .lang-toggle button{padding:6px 9px;font-size:10px;}
  .theme-toggle-btn{width:36px;height:36px;}
  .burger{width:38px;height:38px;flex:0 0 auto;}

  .hero{width:100%;padding:28px 16px 22px;display:block;}
  .hero h1{font-size:clamp(31px,8.3vw,38px);line-height:1.2;letter-spacing:-.6px;margin-bottom:14px;}
  .hero .sub{font-size:15px;line-height:1.85;max-width:none;margin-bottom:20px;}
  .hero-ctas{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .hero-ctas .btn{width:100%;min-width:0;padding:12px 10px;font-size:13px;min-height:46px;}

  .route-map{margin-top:18px;aspect-ratio:1.1/1;padding:10px;border-radius:20px;}
  .hero-overlay{inset:10px!important;}
  .hero-status-card{max-width:200px;padding:11px 12px;border-radius:14px;}
  .hero-status-card b{font-size:13px;}
  .hero-status-card small{font-size:10.5px;}
  .hero-route-stack{width:min(100%,220px);gap:7px;}
  .route-chip{padding:9px 10px;border-radius:13px;gap:8px;}
  .route-chip-num{width:28px;height:28px;font-size:9px;}
  .route-chip b{font-size:11.5px;}
  .route-chip small{font-size:10px;}

  .section{padding-block:32px 42px;}
  .section-head{margin-bottom:26px;}
  .section-head h2{font-size:24px;}
  .section-head p{font-size:14px;}

  .portal-bottom-nav{left:8px;right:8px;bottom:8px;border-radius:18px;overflow:hidden;}
  .portal-bottom-nav-inner{max-width:none;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:7px 8px calc(7px + env(safe-area-inset-bottom));box-shadow:0 14px 34px rgba(0,0,0,.36);}
  .pbn-item{min-height:46px;gap:3px;padding:5px 1px;font-size:9.5px;}
  .pbn-item svg{width:21px;height:21px;}
  .pbn-fab{width:52px;height:52px;margin-top:-22px;border-width:3px;}
  .pbn-fab svg{width:22px;height:22px;}
  body:has(.portal-bottom-nav.active){padding-bottom:calc(84px + env(safe-area-inset-bottom));}
  body:has(.portal-bottom-nav.active) .whatsapp-float{bottom:calc(94px + env(safe-area-inset-bottom));inset-inline-start:14px;width:48px;height:48px;}
  .whatsapp-float svg{width:25px;height:25px;}

  .container{padding-inline:16px;}
  .form-grid,.grid-2,.grid-3,.grid-4,.business-hub-grid,.ops-metrics{min-width:0;}
  .card,.hub-card,.ops-card,.warehouse-card,.testimonial-card{padding:18px;}
}

@media (max-width:390px){
  .top-announcement-inner{padding-inline:9px;}
  .announcement-pill,.announcement-chip{font-size:9px;padding-inline:8px;}
  .nav-inner{padding-inline:9px;}
  .brand b{font-size:14px;}
  .lang-toggle button{padding-inline:8px;}
  .hero{padding-inline:12px;}
  .hero h1{font-size:30px;}
  .hero .sub{font-size:14px;}
  .hero-ctas{grid-template-columns:1fr;}
  .hero-ctas .btn{width:100%;}
}
`;

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

  const isStyle = request.destination === 'style';
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

  if (isStyle) {
    event.respondWith(
      fetch(request).then(async (response) => {
        if (!response || !response.ok) return response;
        const css = await response.text();
        const headers = new Headers(response.headers);
        headers.set('Content-Type', 'text/css; charset=UTF-8');
        const transformed = new Response(css + '\n' + MOBILE_OVERRIDE, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, transformed.clone());
        return transformed;
      }).catch(async () => caches.match(request))
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