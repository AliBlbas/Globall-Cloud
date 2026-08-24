/*
 * Production HTML middleware.
 * Injects compatibility assets exactly once and keeps admin-only enhancements
 * off public/customer/payment surfaces.
 */
const HTML_ACCEPT = 'text/html'
const VERSION = '20260824-4'
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

  if (/^\/staff(?:-os)?(?:\.html)?\/?$/.test(path)) {
    html = addHeadAsset(html, 'src="/staff-os-compat.js', `<script src="/staff-os-compat.js?v=${VERSION}" data-gc-staff-compat="1"></script>`)
    html = addHeadAsset(html, 'src="/staff-auth-fix.js', `<script src="/staff-auth-fix.js?v=${VERSION}" data-gc-staff-auth-fix="1"></script>`)
  }

  const legacyAdminSurface = /^\/(management|accounts-console|operations-suite|operations-command-center|operations-control|operations-control-v2|staff-portal|warehouse-os|superadmin|super-admin-command-center)\.html$/.test(path)
  if (legacyAdminSurface) {
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

  const headers = new Headers(response.headers)
  headers.delete('content-encoding')
  headers.delete('content-length')
  headers.delete('etag')
  headers.set('content-type', 'text/html; charset=UTF-8')
  return new Response(html, { status: response.status, statusText: response.statusText, headers })
}
