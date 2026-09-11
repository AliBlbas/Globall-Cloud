const CACHE_VERSION = 'gc-v98'
const STATIC_CACHE = `gc-static-${CACHE_VERSION}`

// Keep the service worker intentionally small and deterministic.
// Never rewrite HTML or inject legacy Staff/Admin assets at runtime.
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/staff-os-v5.html',
  '/staff-manifest.json',
  '/staff-os-v5.css?v=20260911-2',
  '/staff-os-v5.js?v=20260911-2',
  '/staff-runtime-recovery-20260911.js?v=20260911-1',
  '/staff-os-v5-shipment-create-fix.js?v=20260905-3',
  '/staff-os-v5-shipment-control-bridge.js?v=20260905-1',
  '/staff-os-data-health-panel.js?v=20260905-1',
  '/staff-os-v5-integrations.js?v=20260905-3',
  '/staff-os-v5-profile.js?v=20260905-3',
  '/staff-os-production-analytics-bridge.js?v=20260905-3',
  '/staff-os-v5-stability.js?v=20260905-3',
  '/staff-logistics-intelligence.css?v=20260908-1',
  '/staff-logistics-intelligence.js?v=20260908-1',
  '/staff-os-v2-compat.js?v=20260908-2',
  '/staff-mobile-command-dock.css?v=20260908-1',
  '/staff-mobile-command-dock.js?v=20260908-1',
  '/mobile-premium-responsive-v2026.css?v=20260908-1',
  '/staff-os-pro-20260909.css?v=20260909-1',
  '/staff-os-pro-20260909.js?v=20260909-1',
  '/staff-shell-polish-20260909.css?v=20260909-1',
  '/staff-shell-polish-20260909.js?v=20260909-1',
  '/staff-premium-mobile-20260909.css?v=20260911-1',
  '/staff-premium-mobile-20260909.js?v=20260911-1',
  '/staff-workflow-chain.js?v=20260911-1',
  '/production-mobile-ux-v2026.css',
  '/production-bridge.js',
  '/production-brand-repair.js',
  '/browser-compat.css',
  '/safari-compat-elite.css',
  '/logo-fix.css',
  '/logo-icon.svg',
  '/logo-icon.png',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml'
]

const isSameOrigin = (request) => new URL(request.url).origin === self.location.origin
const isStaffRoute = (pathname) => /^\/staff(?:-os)?(?:\.html)?\/?$/i.test(pathname)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => undefined)
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith('gc-static-') && key !== STATIC_CACHE)
        .map((key) => caches.delete(key))
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || !isSameOrigin(request)) return

  const url = new URL(request.url)

  // HTML is always network-first and is never rewritten by the worker.
  // This prevents stale middleware-like HTML injection from corrupting Staff V5.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(async () => {
          if (isStaffRoute(url.pathname)) {
            const cachedStaff = await caches.match('/staff-os-v5.html')
            if (cachedStaff) return cachedStaff
          }
          const cachedIndex = await caches.match('/index.html')
          return cachedIndex || Response.error()
        })
    )
    return
  }

  // Static assets use cache-first after the current release has been installed.
  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached
        try {
          const response = await fetch(request)
          if (response.ok) {
            const cache = await caches.open(STATIC_CACHE)
            await cache.put(request, response.clone())
          }
          return response
        } catch {
          return cached || Response.error()
        }
      })
    )
  }
})
