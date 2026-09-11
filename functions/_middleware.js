/*
 * Globall Cloud production HTML middleware.
 * V5 Staff OS owns its complete DOM/auth lifecycle, so the middleware
 * deliberately does not inject legacy staff layers into V5 routes.
 */
const HTML_ACCEPT = 'text/html'
const VERSION = '20260911-2'
const LEGACY_SUPABASE_NOTICE = 'Supabase هێشتا پەیوەست نەکراوە — URL و publishable key لە کۆدەکەدا زیادبکە (سەرەتای script tag).'
const CURRENT_SUPABASE_NOTICE = 'پشکنینی پەیوەندیی Supabase لە پڕۆسەی production ـدایە.'
const ENTERPRISE_SHELL = `<link rel="stylesheet" href="/enterprise-shell-v2026.css?v=${VERSION}" data-gc-enterprise-shell="1">`
const CSP = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://rum-static.pingdom.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.supabase.co https://rum-ingest.pingdom.net https://*.sentry.io https://sentry.io; frame-src 'self' https://www.google.com; worker-src 'self' blob:"

const V5_STAFF_ROUTES = new Set(['/staff','/staff/','/staff.html','/staff-os','/staff-os/','/staff-os.html'])
const LEGACY_ADMIN_ROUTES = new Set([
  '/management.html','/accounts-console.html','/operations-suite.html',
  '/operations-command-center.html','/operations-control.html',
  '/operations-control-v2.html','/staff-portal.html','/warehouse-os.html',
  '/superadmin.html','/super-admin-command-center.html'
])
const addBeforeClose = (html, tag, fragment) => {
  const marker = `</${tag}>`
  const lower = html.toLowerCase()
  const index = lower.lastIndexOf(marker)
  if (index < 0 || html.includes(fragment)) return html
  return html.slice(0, index) + fragment + html.slice(index)
}
const addHeadAsset = (html, needle, fragment) =>
  html.includes(needle) ? html : addBeforeClose(html, 'head', fragment)
const addBodyAsset = (html, needle, fragment) =>
  html.includes(needle) ? html : addBeforeClose(html, 'body', fragment)

const applySecurityHeaders = (headers) => {
  headers.set('content-security-policy', CSP)
  headers.set('x-content-type-options', 'nosniff')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  headers.set('x-frame-options', 'DENY')
  headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload')
  headers.set('permissions-policy', 'camera=(self), geolocation=(self), microphone=(), payment=()')
  headers.set('cross-origin-opener-policy', 'same-origin')
  headers.set('origin-agent-cluster', '?1')
  return headers
}

export async function onRequest(context) {
  const accept = context.request.headers.get('accept') || ''
  if (!accept.toLowerCase().includes(HTML_ACCEPT)) return context.next()

  const path = new URL(context.request.url).pathname
  const response = await context.next()
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes(HTML_ACCEPT)) return response

  let html = await response.text()

  /* V5 is self-contained. This early return is the important isolation boundary. */
  if (V5_STAFF_ROUTES.has(path)) {
    html = html.split(LEGACY_SUPABASE_NOTICE).join(CURRENT_SUPABASE_NOTICE)
    const headers = applySecurityHeaders(new Headers(response.headers))
    headers.delete('content-encoding')
    headers.delete('content-length')
    headers.delete('etag')
    headers.set('content-type', 'text/html; charset=UTF-8')
    return new Response(html, { status: response.status, statusText: response.statusText, headers })
  }

  html = html.split(LEGACY_SUPABASE_NOTICE).join(CURRENT_SUPABASE_NOTICE)

  if (path === '/' || path === '/index.html') {
    html = html.split('href="#admin"').join('href="/staff"')
    html = html.split('href="./staff-os.html"').join('href="/staff"')
    html = html.split(' data-gc-onclick="route(\'admin\')"').join('')
    html = addHeadAsset(html, 'name="color-scheme"', '<meta name="color-scheme" content="dark light">')
    html = addHeadAsset(html, 'href="/enterprise-shell-v2026.css', ENTERPRISE_SHELL)
    html = addHeadAsset(html, 'href="/browser-compat.css', `<link rel="stylesheet" href="/browser-compat.css?v=${VERSION}" data-gc-browser-compat="1">`)
    html = addHeadAsset(html, 'href="/safari-compat-elite.css', `<link rel="stylesheet" href="/safari-compat-elite.css?v=${VERSION}" data-gc-safari-elite="1">`)
    html = addHeadAsset(html, 'href="/logo-fix.css', `<link rel="stylesheet" href="/logo-fix.css?v=${VERSION}" data-gc-logo-fix="1">`)
    html = addHeadAsset(html, 'href="/site-polish.css', `<link rel="stylesheet" href="/site-polish.css?v=${VERSION}" data-gc-premium-polish="1">`)
    html = addHeadAsset(html, 'href="/production-mobile-hotfix.css', `<link rel="stylesheet" href="/production-mobile-hotfix.css?v=${VERSION}" data-gc-production-mobile-hotfix="1">`)
    html = addHeadAsset(html, 'href="/production-mobile-ux-v2026.css', `<link rel="stylesheet" href="/production-mobile-ux-v2026.css?v=${VERSION}" data-gc-production-mobile-ux="1">`)
    html = addHeadAsset(html, 'src="/production-brand-repair.js', `<script src="/production-brand-repair.js?v=${VERSION}" defer data-gc-production-brand-repair="1"></script>`)
    html = addHeadAsset(html, 'src="/staff-auth-runtime-fix.js', `<script src="/staff-auth-runtime-fix.js?v=${VERSION}" defer data-gc-staff-auth-runtime="1"></script>`)
    html = addBodyAsset(html, 'src="/gc-csp-scripts/logistics-pricing-ui.js', `<script src="/gc-csp-scripts/logistics-pricing-ui.js?v=${VERSION}" defer data-gc-logistics-pricing-ui="1"></script>`)
  }

  const operational =
    path === '/warehouse-os' || path === '/warehouse-os/' || path === '/warehouse-os.html' ||
    path === '/customer-portal' || path === '/customer-portal/' || path === '/customer-portal.html' ||
    path === '/superadmin.html' || path === '/super-admin-command-center.html' ||
    path.startsWith('/operations-') || path === '/accounts-console' || path === '/accounts-console.html' ||
    path === '/management' || path === '/management.html'
  if (operational) {
    html = addHeadAsset(html, 'src="/runtime-guard.js', `<script src="/runtime-guard.js?v=${VERSION}" defer data-gc-runtime-guard="1"></script>`)
  }

  if (LEGACY_ADMIN_ROUTES.has(path)) {
    html = addHeadAsset(html, 'href="/admin-console-enhanced.css', `<link rel="stylesheet" href="/admin-console-enhanced.css?v=${VERSION}" data-gc-admin-polish="1">`)
    html = addHeadAsset(html, 'src="/admin-console-enhanced.js', `<script src="/admin-console-enhanced.js?v=${VERSION}" defer data-gc-admin-recovery="1"></script>`)
  }

  if (path === '/warehouse-os.html' || path === '/warehouse-os' || path === '/warehouse-os/') {
    html = addHeadAsset(html, 'href="/warehouse-receipt-proof.css', `<link rel="stylesheet" href="/warehouse-receipt-proof.css?v=${VERSION}" data-gc-warehouse-receipt-proof="1">`)
    html = addBodyAsset(html, 'src="/gc-csp-scripts/warehouse-receipt-proof-enhancement.js', `<script src="/gc-csp-scripts/warehouse-receipt-proof-enhancement.js?v=${VERSION}" defer data-gc-warehouse-receipt-proof="1"></script>`)
    html = addBodyAsset(html, 'src="/gc-csp-scripts/warehouse-receiving-chain-bridge.js', `<script src="/gc-csp-scripts/warehouse-receiving-chain-bridge.js?v=${VERSION}" defer data-gc-warehouse-receiving-chain="1"></script>`)
  }

  if (path === '/shop/shein.html') {
    html = addBodyAsset(html, 'src="/gc-csp-scripts/shein-customer-identity.js', `<script src="/gc-csp-scripts/shein-customer-identity.js?v=${VERSION}" defer data-gc-shein-identity="1"></script>`)
  }

  if (path === '/customer-portal.html' || path === '/customer-portal' || path === '/customer-portal/') {
    html = addHeadAsset(html, 'href="/customer-receipt-evidence.css', `<link rel="stylesheet" href="/customer-receipt-evidence.css?v=${VERSION}" data-gc-customer-receipt-evidence="1">`)
    html = addBodyAsset(html, 'src="/gc-csp-scripts/customer-receipt-evidence-enhancement.js', `<script src="/gc-csp-scripts/customer-receipt-evidence-enhancement.js?v=${VERSION}" defer data-gc-customer-receipt-evidence="1"></script>`)
    html = addBodyAsset(html, 'src="/customer-debt-chat.js', `<script src="/customer-debt-chat.js?v=${VERSION}" defer data-gc-customer-debt-chat="1"></script>`)
  }

  if (path === '/super-admin-command-center.html') {
    html = addHeadAsset(html, 'src="/super-admin-live-control-v2.js', `<script src="/super-admin-live-control-v2.js?v=${VERSION}" defer data-gc-superadmin-live-control="1"></script>`)
  }

  if (path === '/superadmin.html') {
    html = addHeadAsset(html, 'href="/superadmin-server.css', `<link rel="stylesheet" href="/superadmin-server.css?v=${VERSION}" data-gc-superadmin-server-css="1">`)
    html = addBodyAsset(html, 'src="/superadmin-enhancements.js', `<script src="/superadmin-enhancements.js?v=${VERSION}" defer data-gc-superadmin-enhancements="1"></script>`)
    html = addBodyAsset(html, 'src="/superadmin-server.js', `<script src="/superadmin-server.js?v=${VERSION}" defer data-gc-superadmin-server="1"></script>`)
  }

  if (path === '/operations-control-v2.html') {
    html = addBodyAsset(html, 'src="/operations-events.js', `<script src="/operations-events.js?v=${VERSION}" defer data-gc-operations-events="1"></script>`)
  }

  if (path === '/operations-command-center.html') {
    html = addBodyAsset(html, 'src="/operations-exception-engine.js', `<script src="/operations-exception-engine.js?v=${VERSION}" defer data-gc-exception-engine="1"></script>`)
  }

  const headers = applySecurityHeaders(new Headers(response.headers))
  headers.delete('content-encoding')
  headers.delete('content-length')
  headers.delete('etag')
  headers.set('content-type', 'text/html; charset=UTF-8')
  return new Response(html, { status: response.status, statusText: response.statusText, headers })
}
