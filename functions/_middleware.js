/*
 * Production HTML middleware.
 * Injects compatibility assets exactly once and keeps admin-only enhancements
 * off public/customer/payment surfaces.
 */
const HTML_ACCEPT = 'text/html'
const VERSION = '20260903-1'
const addHeadAsset = (html, needle, fragment) => html.includes(needle) ? html : html.replace(/<\/head>/i, `${fragment}</head>`)
const addBodyAsset = (html, needle, fragment) => html.includes(needle) ? html : html.replace(/<\/body>/i, `${fragment}</body>`)

const OPERATIONAL_PAGE = /^\/(staff(?:-os)?|warehouse(?:-os)?|customer-portal|superadmin|super-admin-command-center|operations(?:-[a-z0-9-]+)?|accounts-console|management)(?:\.html)?\/?$/i

export async function onRequest(context) {
  const accept = context.request.headers.get('accept') || ''
  if (!accept.toLowerCase().includes(HTML_ACCEPT)) return context.next()
  const path = new URL(context.request.url).pathname
  const response = await context.next()
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes(HTML_ACCEPT)) return response

  let html = await response.text()
  const headAssets = [
    ['name="color-scheme"', '<meta name="color-scheme" content="dark light">'],
    ['href="/browser-compat.css', `<link rel="stylesheet" href="/browser-compat.css?v=${VERSION}" data-gc-browser-compat="1">`],
    ['href="/safari-compat-elite.css', `<link rel="stylesheet" href="/safari-compat-elite.css?v=${VERSION}" data-gc-safari-elite="1">`],
    ['href="/logo-fix.css', `<link rel="stylesheet" href="/logo-fix.css?v=${VERSION}" data-gc-logo-fix="1">`],
    ['href="/site-polish.css', `<link rel="stylesheet" href="/site-polish.css?v=${VERSION}" data-gc-premium-polish="1">`],
    ['href="/production-mobile-hotfix.css', `<link rel="stylesheet" href="/production-mobile-hotfix.css?v=${VERSION}" data-gc-production-mobile-hotfix="1">`],
    ['src="/production-brand-repair.js', `<script src="/production-brand-repair.js?v=${VERSION}" defer data-gc-production-brand-repair="1"></script>`],
  ]
  for (const [needle, fragment] of headAssets) html = addHeadAsset(html, needle, fragment)

  if (OPERATIONAL_PAGE.test(path)) {
    html = addHeadAsset(html, 'src="/runtime-guard.js', `<script src="/runtime-guard.js?v=${VERSION}" defer data-gc-runtime-guard="1"></script>`)
  }

  if (path === '/' || path === '/index.html') {
    html = addHeadAsset(html, 'src="/staff-auth-runtime-fix.js', `<script src="/staff-auth-runtime-fix.js?v=${VERSION}" defer data-gc-staff-auth-runtime="1"></script>`)
    html = addBodyAsset(html, 'src="/gc-csp-scripts/logistics-pricing-ui.js', `<script src="/gc-csp-scripts/logistics-pricing-ui.js?v=${VERSION}" defer data-gc-logistics-pricing-ui="1"></script>`)
  }

  if (/^\/staff(?:-os)?(?:\.html)?\/?$/.test(path)) {
    html = html.replace(/<script\b[^>]*src=["']\/staff-os-compat\.js\?v=[^"']+["'][^>]*><\/script>/gi,
      `<script src="/staff-os-compat.js?v=${VERSION}" defer data-gc-staff-compat="1"></script>`)
    html = addHeadAsset(html, 'src="/staff-os-compat.js', `<script src="/staff-os-compat.js?v=${VERSION}" defer data-gc-staff-compat="1"></script>`)
    if (!/^\/staff-os(?:\.html)?\/?$/.test(path)) {
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

  const headers = new Headers(response.headers)
  headers.delete('content-encoding')
  headers.delete('content-length')
  headers.delete('etag')
  headers.set('content-type', 'text/html; charset=UTF-8')
  return new Response(html, { status: response.status, statusText: response.statusText, headers })
}
