/*
 * Production HTML middleware.
 * Injects compatibility assets exactly once and keeps admin-only enhancements
 * off public/customer/payment surfaces.
 */
const HTML_ACCEPT = 'text/html'
const VERSION = '20260912-1'
const ENTERPRISE_SHELL = `<link rel="stylesheet" href="/enterprise-shell-v2026.css?v=${VERSION}" data-gc-enterprise-shell="1">`
const LEGACY_SUPABASE_NOTICE = 'Supabase هێشتا پەیوەست نەکراوە — URL و publishable key لە کۆدەکەدا زیادبکە (سەرەتای script tag).'
const CURRENT_SUPABASE_NOTICE = 'پشکنینی پەیوەندیی Supabase لە پڕۆسەی production ـدایە.'
const CSP = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://rum-static.pingdom.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.supabase.co https://rum-ingest.pingdom.net https://*.sentry.io https://sentry.io; frame-src 'self' https://www.google.com; worker-src 'self' blob:"

const addHeadAsset = (html, needle, fragment) => html.includes(needle) ? html : html.replace(/<\/head>/i, `${fragment}</head>`)
const addBodyAsset = (html, needle, fragment) => html.includes(needle) ? html : html.replace(/<\/body>/i, `${fragment}</body>`)
const OPERATIONAL_PAGE = /^\/(staff(?:-os)?|warehouse(?:-os)?|customer-portal|superadmin|super-admin-command-center|operations(?:-[a-z0-9-]+)?|accounts-console|management)(?:\.html)?\/?$/i

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

const STAFF_V5 = /^\/(?:staff|staff-os)(?:\.html)?\/?$/i

export async function onRequest(context) {
  const accept = context.request.headers.get('accept') || ''
  if (!accept.toLowerCase().includes(HTML_ACCEPT)) return context.next()
  const path = new URL(context.request.url).pathname
  const response = await context.next()
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes(HTML_ACCEPT)) return response

  let html = await response.text()
  html = html.split(LEGACY_SUPABASE_NOTICE).join(CURRENT_SUPABASE_NOTICE)

  if (path === '/' || path === '/index.html') {
    html = html.split('href="#admin"').join('href="/staff"')
    html = html.split('href="./staff-os.html"').join('href="/staff"')
    html = html.split(' data-gc-onclick="route(\'admin\')"').join('')
    /* The public page has a pre-paint bootstrap. Always serve a new URL for it
       so old Safari/iOS service-worker caches cannot keep the broken bootstrap. */
    html = html.split('/gc-csp-scripts/index-inline-1.js?v=20260821-1').join(`/gc-csp-scripts/index-inline-1.js?v=${VERSION}`)
  }

  const headAssets = [
    ['name="color-scheme"', '<meta name="color-scheme" content="dark light">'],
    ['href="/enterprise-shell-v2026.css', ENTERPRISE_SHELL],
    ['href="/browser-compat.css', `<link rel="stylesheet" href="/browser-compat.css?v=${VERSION}" data-gc-browser-compat="1">`],
    ['href="/safari-compat-elite.css', `<link rel="stylesheet" href="/safari-compat-elite.css?v=${VERSION}" data-gc-safari-elite="1">`],
    ['href="/logo-fix.css', `<link rel="stylesheet" href="/logo-fix.css?v=${VERSION}" data-gc-logo-fix="1">`],
    ['href="/site-polish.css', `<link rel="stylesheet" href="/site-polish.css?v=${VERSION}" data-gc-premium-polish="1">`],
    ['href="/production-mobile-hotfix.css', `<link rel="stylesheet" href="/production-mobile-hotfix.css?v=${VERSION}" data-gc-production-mobile-hotfix="1">`],
    ['href="/production-mobile-ux-v2026.css', `<link rel="stylesheet" href="/production-mobile-ux-v2026.css?v=${VERSION}" data-gc-production-mobile-ux="1">`],
    ['src="/production-brand-repair.js', `<script src="/production-brand-repair.js?v=${VERSION}" defer data-gc-production-brand-repair="1"></script>`],
  ]
  for (const [needle, fragment] of headAssets) html = addHeadAsset(html, needle, fragment)

  /* V5 Staff owns its complete DOM/auth lifecycle. Only security headers and
     cache-safe markup changes apply here; no legacy staff UI/auth scripts. */
  if (STAFF_V5.test(path)) {
    const headers = applySecurityHeaders(new Headers(response.headers))
    headers.delete('content-encoding')
    headers.delete('content-length')
    headers.delete('etag')
    headers.set('cache-control', 'no-store, max-age=0')
    headers.set('content-type', 'text/html; charset=UTF-8')
    return new Response(html, { status: response.status, statusText: response.statusText, headers })
  }

  if (OPERATIONAL_PAGE.test(path)) {
    html = addHeadAsset(html, 'src="/runtime-guard.js', `<script src="/runtime-guard.js?v=${VERSION}" defer data-gc-runtime-guard="1"></script>`)
  }

  if (path === '/' || path === '/index.html') {
    html = addHeadAsset(html, 'src="/staff-auth-runtime-fix.js', `<script src="/staff-auth-runtime-fix.js?v=${VERSION}" defer data-gc-staff-auth-runtime="1"></script>`)
    html = addBodyAsset(html, 'src="/gc-csp-scripts/logistics-pricing-ui.js', `<script src="/gc-csp-scripts/logistics-pricing-ui.js?v=${VERSION}" defer data-gc-logistics-pricing-ui="1"></script>`)
    html = addBodyAsset(html, 'src="/site-navigation-20260909.js', `<script src="/site-navigation-20260909.js?v=${VERSION}" defer data-gc-site-navigation="1"></script>`)
  }

  if (/^\/staff(?:-os)?(?:\.html)?\/?$/i.test(path)) {
    html = html.replace(/<script\b[^>]*src=["']\/staff-os-compat\.js\?v=[^"']+["'][^>]*><\/script>/gi,
      `<script src="/staff-os-compat.js?v=${VERSION}" defer data-gc-staff-compat="1"></script>`)
    html = addHeadAsset(html, 'src="/staff-os-compat.js', `<script src="/staff-os-compat.js?v=${VERSION}" defer data-gc-staff-compat="1"></script>`)
    if (!/^\/staff-os(?:\.html)?\/?$/i.test(path)) {
      html = html.replace(/<script\b[^>]*src=["']\/staff-auth-fix\.js\?v=[^"']+["'][^>]*><\/script>/gi,
        `<script src="/staff-auth-fix.js?v=${VERSION}" defer data-gc-staff-auth-fix="1"></script>`)
      html = addHeadAsset(html, 'src="/staff-auth-fix.js', `<script src="/staff-auth-fix.js?v=${VERSION}" defer data-gc-staff-auth-fix="1"></script>`)
    }
    html = addHeadAsset(html, 'href="/staff-login-polish.css', `<link rel="stylesheet" href="/staff-login-polish.css?v=${VERSION}" data-gc-staff-login-polish="1">`)
    html = addHeadAsset(html, 'href="/staff-command-center-pro.css', `<link rel="stylesheet" href="/staff-command-center-pro.css?v=${VERSION}" data-gc-staff-command-center-css="1">`)
    html = addHeadAsset(html, 'href="/staff-directory-360.css', `<link rel="stylesheet" href="/staff-directory-360.css?v=${VERSION}" data-gc-staff-directory-360-css="1">`)
    html = addBodyAsset(html, 'src="/staff-command-center-pro.js', `<script src="/staff-command-center-pro.js?v=${VERSION}" defer data-gc-staff-command-center="1"></script>`)
    html = addBodyAsset(html, 'src="/staff-directory-360.js', `<script src="/staff-directory-360.js?v=${VERSION}" defer data-gc-staff-directory-360="1"></script>`)
    html = addBodyAsset(html, 'src="/staff-profit-analytics.js', `<script src="/staff-profit-analytics.js?v=${VERSION}" defer data-gc-staff-profit-analytics="1"></script>`)
    html = addBodyAsset(html, 'src="/gc-csp-scripts/staff-admin-panel.js', `<script src="/gc-csp-scripts/staff-admin-panel.js?v=${VERSION}" defer data-gc-staff-admin-panel="1"></script>`)
  }

  const legacyAdminSurface = /^\/(management|accounts-console|operations-suite|operations-command-center|operations-control|operations-control-v2|staff-portal|warehouse-os|superadmin|super-admin-command-center)\.html$/.test(path)
  if (legacyAdminSurface) {
    html = addHeadAsset(html, 'href="/admin-console-enhanced.css', `<link rel="stylesheet" href="/admin-console-enhanced.css?v=${VERSION}" data-gc-admin-polish="1">`)
    html = addHeadAsset(html, 'src="/admin-console-enhanced.js', `<script src="/admin-console-enhanced.js?v=${VERSION}" defer data-gc-admin-recovery="1"></script>`)
  }
  if (/^\/warehouse-os(?:\.html)?\/?$/.test(path)) {
    html = addHeadAsset(html, 'href="/warehouse-receipt-proof.css', `<link rel="stylesheet" href="/warehouse-receipt-proof.css?v=${VERSION}" data-gc-warehouse-receipt-proof="1">`)
    html = addBodyAsset(html, 'src="/gc-csp-scripts/warehouse-receipt-proof-enhancement.js', `<script src="/gc-csp-scripts/warehouse-receipt-proof-enhancement.js?v=${VERSION}" defer data-gc-warehouse-receipt-proof="1"></script>`)
    html = addBodyAsset(html, 'src="/gc-csp-scripts/warehouse-receiving-chain-bridge.js', `<script src="/gc-csp-scripts/warehouse-receiving-chain-bridge.js?v=${VERSION}" defer data-gc-warehouse-receiving-chain="1"></script>`)
  }
  if (/^\/shop\/shein\.html$/i.test(path)) {
    html = addBodyAsset(html, 'src="/gc-csp-scripts/shein-customer-identity.js', `<script src="/gc-csp-scripts/shein-customer-identity.js?v=${VERSION}" defer data-gc-shein-identity="1"></script>`)
  }
  if (/^\/customer-portal(?:\.html)?\/?$/.test(path)) {
    html = addHeadAsset(html, 'href="/customer-receipt-evidence.css', `<link rel="stylesheet" href="/customer-receipt-evidence.css?v=${VERSION}" data-gc-customer-receipt-evidence="1">`)
    html = addBodyAsset(html, 'src="/gc-csp-scripts/customer-receipt-evidence-enhancement.js', `<script src="/gc-csp-scripts/customer-receipt-evidence-enhancement.js?v=${VERSION}" defer data-gc-customer-receipt-evidence="1"></script>`)
    html = addBodyAsset(html, 'src="/customer-debt-chat.js', `<script src="/customer-debt-chat.js?v=${VERSION}" defer data-gc-customer-debt-chat="1"></script>`)
  }
  if (path === '/super-admin-command-center.html') html = addHeadAsset(html, 'src="/super-admin-live-control-v2.js', `<script src="/super-admin-live-control-v2.js?v=${VERSION}" defer data-gc-superadmin-live-control="1"></script>`)
  if (path === '/superadmin.html') {
    html = addHeadAsset(html, 'href="/superadmin-server.css', `<link rel="stylesheet" href="/superadmin-server.css?v=${VERSION}" data-gc-superadmin-server-css="1">`)
    html = addBodyAsset(html, 'src="/superadmin-enhancements.js', `<script src="/superadmin-enhancements.js?v=${VERSION}" defer data-gc-superadmin-enhancements="1"></script>`)
    html = addBodyAsset(html, 'src="/superadmin-server.js', `<script src="/superadmin-server.js?v=${VERSION}" defer data-gc-superadmin-server="1"></script>`)
  }
  if (path === '/operations-control-v2.html') html = addBodyAsset(html, 'src="/operations-events.js', `<script src="/operations-events.js?v=${VERSION}" defer data-gc-operations-events="1"></script>`)
  if (path === '/operations-command-center.html') html = addBodyAsset(html, 'src="/operations-exception-engine.js', `<script src="/operations-exception-engine.js?v=${VERSION}" defer data-gc-exception-engine="1"></script>`)

  const headers = applySecurityHeaders(new Headers(response.headers))
  headers.delete('content-encoding')
  headers.delete('content-length')
  headers.delete('etag')
  headers.set('content-type', 'text/html; charset=UTF-8')
  return new Response(html, { status: response.status, statusText: response.statusText, headers })
}
