const CACHE_VERSION = 'gc-v4';
const STATIC_CACHE = `gc-static-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/', '/index.html', '/management.html', '/staff-os.html', '/staff-portal.html',
  '/accounts-console.html', '/operations-suite.html', '/styles.css', '/tracking-styles.css',
  '/tracking-enhanced.js', '/tracking-integration.html', '/translations.js', '/form-validation.js',
  '/form-validation-styles.css', '/whatsapp-messenger.js', '/webhook-handler.js',
  '/admin-dashboard.js', '/price-calculator.js', '/logo-icon.png', '/og-image.jpg', '/manifest.json'
];

const MOBILE_OVERRIDE = `
@media (max-width:760px){
  html,body{width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:clip!important;-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important;}
  .top-announcement{height:46px!important;min-height:46px!important;overflow:hidden!important;}
  .top-announcement-inner{height:46px!important;width:100%!important;max-width:100%!important;padding:6px 10px!important;gap:6px!important;flex-wrap:nowrap!important;justify-content:center!important;overflow:hidden!important;}
  .announcement-pill,.announcement-chip{min-width:0!important;max-width:50%!important;padding:5px 8px!important;font-size:9px!important;line-height:1.2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;box-shadow:none!important;}
  .nav{min-height:60px!important;height:60px!important;}
  .nav-inner{height:60px!important;min-height:60px!important;padding:7px 10px!important;gap:7px!important;}
  .nav-links,.nav-auth{display:none!important;}
  .nav-right{display:flex!important;align-items:center!important;gap:6px!important;margin-inline-start:auto!important;min-width:0!important;}
  .brand{min-width:0!important;gap:7px!important;}
  .brand-logo{width:34px!important;height:34px!important;}
  .brand b{font-size:14px!important;line-height:1.1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
  .brand small{font-size:8px!important;line-height:1.1!important;white-space:nowrap!important;}
  .lang-toggle button{padding:5px 8px!important;font-size:9.5px!important;}
  .theme-toggle-btn{width:34px!important;height:34px!important;}
  .burger{width:36px!important;height:36px!important;flex:0 0 auto!important;}
  .hero{width:100%!important;max-width:100%!important;padding:20px 14px 18px!important;display:block!important;}
  .hero h1{font-size:clamp(28px,8vw,36px)!important;line-height:1.18!important;letter-spacing:-.55px!important;margin-bottom:12px!important;}
  .hero .sub{font-size:14px!important;line-height:1.78!important;max-width:none!important;margin-bottom:18px!important;}
  .hero-ctas{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;}
  .hero-ctas .btn{width:100%!important;min-width:0!important;padding:11px 8px!important;font-size:12.5px!important;min-height:44px!important;}
  .route-map{margin-top:14px!important;aspect-ratio:1.15/1!important;padding:9px!important;border-radius:19px!important;}
  .section{padding-block:28px 36px!important;}
  .section-head{margin-bottom:22px!important;}
  .section-head h2{font-size:22px!important;}
  .section-head p{font-size:13.5px!important;}
  .container{padding-inline:14px!important;}
  .portal-bottom-nav{left:8px!important;right:8px!important;bottom:8px!important;border-radius:16px!important;overflow:hidden!important;}
  .portal-bottom-nav-inner{max-width:none!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:16px!important;padding:5px 6px calc(5px + env(safe-area-inset-bottom))!important;box-shadow:0 12px 28px rgba(0,0,0,.34)!important;}
  .pbn-item{min-height:42px!important;gap:2px!important;padding:4px 1px!important;font-size:9px!important;}
  .pbn-item svg{width:20px!important;height:20px!important;}
  .pbn-fab{width:50px!important;height:50px!important;margin-top:-19px!important;border-width:3px!important;}
  .pbn-fab svg{width:21px!important;height:21px!important;}
  body:has(.portal-bottom-nav.active){padding-bottom:calc(76px + env(safe-area-inset-bottom))!important;}
  body:has(.portal-bottom-nav.active) .whatsapp-float{bottom:calc(86px + env(safe-area-inset-bottom))!important;inset-inline-start:12px!important;width:46px!important;height:46px!important;}
  .whatsapp-float svg{width:24px!important;height:24px!important;}
  .card,.hub-card,.ops-card,.warehouse-card,.testimonial-card{padding:16px!important;}
  img,svg,video,canvas,iframe{max-width:100%!important;}
  .form-grid,.grid-2,.grid-3,.grid-4,.business-hub-grid,.ops-metrics{min-width:0!important;max-width:100%!important;}
  input,select,textarea,.field{font-size:16px!important;min-width:0!important;max-width:100%!important;}
}
@media (max-width:390px){
  .top-announcement{height:42px!important;min-height:42px!important;}
  .top-announcement-inner{height:42px!important;padding-inline:8px!important;}
  .announcement-pill,.announcement-chip{font-size:8.5px!important;padding-inline:7px!important;}
  .nav,.nav-inner{height:56px!important;min-height:56px!important;}
  .nav-inner{padding-inline:8px!important;}
  .brand b{font-size:13px!important;}
  .hero{padding-inline:11px!important;padding-top:16px!important;}
  .hero h1{font-size:28px!important;}
  .hero .sub{font-size:13.5px!important;}
  .hero-ctas{grid-template-columns:1fr!important;}
}
`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => Promise.resolve()));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('gc-static-') && key !== STATIC_CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === 'navigate';
  const isStyle = request.destination === 'style';
  const isAsset = ['style', 'script', 'image', 'font'].includes(request.destination);

  if (isNavigation) {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/index.html')) || (await caches.match('/'))));
    return;
  }

  if (isStyle) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then(async (response) => {
        if (!response || !response.ok) return response;
        const css = await response.text();
        const headers = new Headers(response.headers);
        headers.delete('content-encoding');
        headers.delete('content-length');
        headers.delete('etag');
        headers.set('Cache-Control', 'no-store');
        headers.set('Content-Type', 'text/css; charset=UTF-8');
        const transformed = new Response(`${css}\n${MOBILE_OVERRIDE}`, { status: response.status, statusText: response.statusText, headers });
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, transformed.clone());
        return transformed;
      }).catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  if (!isAsset) return;
  event.respondWith(caches.match(request).then(async (cached) => {
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return cached || Response.error();
    }
  }));
});
