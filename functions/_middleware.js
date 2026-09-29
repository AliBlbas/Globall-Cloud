/*
 * Production HTML middleware.
 * Injects compatibility assets exactly once and keeps admin-only enhancements
 * off public/customer/payment surfaces.
 */
const HTML_ACCEPT = 'text/html'
const VERSION = '20260929-1'
const THEME_CSS = `<link rel="stylesheet" href="/gc-theme-sync.css?v=${VERSION}" data-gc-theme-css="1">`
const THEME_JS = `<script src="/gc-theme-sync.js?v=${VERSION}" defer data-gc-theme-sync="1"></script>`
const SETTINGS_CSS = `<link rel="stylesheet" href="/gc-settings-hub.css?v=${VERSION}" data-gc-settings-css="1">`
const SETTINGS_JS = `<script src="/gc-settings-hub.js?v=${VERSION}" defer data-gc-settings-hub="1"></script>`
const ACCOUNT_ENTRY_JS = `<script src="/gc-account-entry.js?v=${VERSION}" defer data-gc-account-entry="1"></script>`
const addHeadAsset = (html, needle, fragment) => html.includes(needle) ? html : html.replace(/<\/head>/i, `${fragment}</head>`)
const addBodyAsset = (html, needle, fragment) => html.includes(needle) ? html : html.replace(/<\/body>/i, `${fragment}</body>`)

export async function onRequest(context) {
  const accept = context.request.headers.get('accept') || ''
  if (!accept.toLowerCase().includes(HTML_ACCEPT)) return context.next()
  const path = new URL(context.request.url).pathname
  const response = await context.next()
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes(HTML_ACCEPT)) return response

  let html = await response.text()
  const headAssets = [
    ['href="/gc-theme-sync.css', THEME_CSS],
    ['src="/gc-theme-sync.js', THEME_JS],
    ['href="/gc-settings-hub.css', SETTINGS_CSS],
    ['src="/gc-settings-hub.js', SETTINGS_JS],
    ['name="color-scheme"', '<meta name="color-scheme" content="dark light">'],
    ['href="/browser-compat.css', `<link rel="stylesheet" href="/browser-compat.css?v=${VERSION}" data-gc-browser-compat="1">`],
    ['href="/safari-compat-elite.css', `<link rel="stylesheet" href="/safari-compat-elite.css?v=${VERSION}" data-gc-safari-elite="1">`],
    ['href="/logo-fix.css', `<link rel="stylesheet" href="/logo-fix.css?v=${VERSION}" data-gc-logo-fix="1">`],
    ['href="/site-polish.css', `<link rel="stylesheet" href="/site-polish.css?v=${VERSION}" data-gc-premium-polish="1">`],
    ['href="/production-mobile-hotfix.css', `<link rel="stylesheet" href="/production-mobile-hotfix.css?v=${VERSION}" data-gc-production-mobile-hotfix="1">`],
    ['href="/logo-icon-original.png', '<link rel="preload" as="image" href="/logo-icon-original.png" fetchpriority="high">'],
    ['href="/logo-icon.svg', '<link rel="preload" as="image" href="/logo-icon.svg" fetchpriority="high">'],
    ['src="/production-brand-repair.js', `<script src="/production-brand-repair.js?v=${VERSION}" defer data-gc-production-brand-repair="1"></script>`],
    ['src="/runtime-guard.js', `<script src="/runtime-guard.js?v=${VERSION}" defer data-gc-runtime-guard="1"></script>`],
  ]
  for (const [needle, fragment] of headAssets) html = addHeadAsset(html, needle, fragment)
  if (path === '/customer-portal.html') {
    html = addHeadAsset(html, 'src="/gc-account-entry.js', ACCOUNT_ENTRY_JS)
    html = addHeadAsset(html, 'href="/gc-customer-account-20260923.css', `<link rel="stylesheet" href="/gc-customer-account-20260923.css?v=${VERSION}" data-gc-customer-account-css="1">`)
    html = addBodyAsset(html, 'src="/gc-customer-account-20260923.js', `<script src="/gc-customer-account-20260923.js?v=${VERSION}" defer data-gc-customer-account="1"></script>`)
  }

  const adminSurface = /^\/(management|accounts-console|operations-suite|operations-command-center|operations-control|operations-control-v2|staff-os|staff-portal|warehouse-os|superadmin|super-admin-command-center)\.html$/.test(path)
  if (adminSurface) {
    html = addHeadAsset(html, 'href="/admin-console-enhanced.css', `<link rel="stylesheet" href="/admin-console-enhanced.css?v=${VERSION}" data-gc-admin-polish="1">`)
    html = addHeadAsset(html, 'src="/admin-console-enhanced.js', `<script src="/admin-console-enhanced.js?v=${VERSION}" defer data-gc-admin-recovery="1"></script>`)
  }
  if (path === '/super-admin-command-center.html') {
    html = addHeadAsset(html, 'href="/super-admin-elite.css', `<link rel="stylesheet" href="/super-admin-elite.css?v=${VERSION}" data-gc-superadmin-elite="1">`)
    html = addBodyAsset(html, 'src="/super-admin-elite.js', `<script src="/super-admin-elite.js?v=${VERSION}" defer data-gc-superadmin-elite="1"></script>`)
  }
  if (path === '/superadmin.html') html = addBodyAsset(html, 'src="/superadmin-staff-actions.js', `<script src="/superadmin-staff-actions.js?v=${VERSION}" defer data-gc-superadmin-staff-actions="1"></script>`)
  if (path === '/operations-control-v2.html') html = addBodyAsset(html, 'src="/operations-events.js', `<script src="/operations-events.js?v=${VERSION}" defer data-gc-operations-events="1"></script>`)
  if (path === '/operations-command-center.html') html = addBodyAsset(html, 'src="/operations-exception-engine.js', `<script src="/operations-exception-engine.js?v=${VERSION}" defer data-gc-exception-engine="1"></script>`)
  if (path === '/staff-os.html' && !html.includes('gc-superadmin-entry')) {
    html = addBodyAsset(html, 'gc-superadmin-entry', '<div class="gc-superadmin-entry"><a href="./super-admin-command-center.html">GC · Super Admin</a></div>')
  }

  const headers = new Headers(response.headers)
  headers.delete('content-encoding')
  headers.delete('content-length')
  headers.delete('etag')
  headers.set('content-type', 'text/html; charset=UTF-8')
  return new Response(html, { status: response.status, statusText: response.statusText, headers })
}
