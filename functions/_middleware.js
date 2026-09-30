/* Globall Cloud — production HTML middleware. */
const HTML_ACCEPT = 'text/html';
const VERSION = '20260929-5';
const VISUAL_REFRESH = `<link rel="stylesheet" href="/globall-visual-refresh-20260921.css?v=20260921-1" data-gc-visual-refresh="20260921-1">`;
const ENTERPRISE_SHELL = `<link rel="stylesheet" href="/enterprise-shell-v2026.css?v=${VERSION}" data-gc-enterprise-shell="1">`;
const THEME_CSS = `<link rel="stylesheet" href="/gc-theme-sync.css?v=${VERSION}" data-gc-theme-css="1">`;
const THEME_JS = `<script src="/gc-theme-sync.js?v=${VERSION}" defer data-gc-theme-sync="1"></script>`;
const SETTINGS_CSS = `<link rel="stylesheet" href="/gc-settings-hub.css?v=${VERSION}" data-gc-settings-css="1">`;
const SETTINGS_JS = `<script src="/gc-settings-hub.js?v=${VERSION}" defer data-gc-settings-hub="1"></script>`;
const ACCOUNT_ENTRY_JS = `<script src="/gc-account-entry.js?v=${VERSION}" defer data-gc-account-entry="1"></script>`;
const MOBILE_PRIMARY_NAV = `<style data-gc-mobile-primary-nav="1">
@media (max-width: 760px){
  body{padding-bottom:62px!important}
  #gcPrimaryMobileNav{
    position:fixed!important;
    left:0!important;
    right:0!important;
    bottom:0!important;
    width:100%!important;
    height:calc(58px + env(safe-area-inset-bottom))!important;
    min-height:58px!important;
    display:grid!important;
    grid-template-columns:repeat(5,minmax(0,1fr))!important;
    align-items:stretch!important;
    gap:0!important;
    padding:3px 0 env(safe-area-inset-bottom)!important;
    margin:0!important;
    border:0!important;
    border-top:1px solid rgba(140,170,186,.18)!important;
    border-radius:0!important;
    background:rgba(4,16,28,.985)!important;
    box-shadow:0 -8px 24px rgba(0,0,0,.22)!important;
    backdrop-filter:blur(18px)!important;
    -webkit-backdrop-filter:blur(18px)!important;
    z-index:2147483647!important;
  }
  #gcPrimaryMobileNav a{
    position:relative!important;
    width:100%!important;
    min-width:0!important;
    height:55px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    padding:0!important;
    margin:0!important;
    border:0!important;
    border-radius:0!important;
    background:transparent!important;
    color:#8ea5b1!important;
    text-decoration:none!important;
  }
  #gcPrimaryMobileNav a svg{
    display:block!important;
    width:23px!important;
    height:23px!important;
    fill:none!important;
    stroke:currentColor!important;
    stroke-width:1.9!important;
    stroke-linecap:round!important;
    stroke-linejoin:round!important;
    opacity:1!important;
  }
  #gcPrimaryMobileNav a span{display:none!important}
  #gcPrimaryMobileNav a.primary{color:#f0cf79!important}
  #gcPrimaryMobileNav a:focus-visible{
    outline:2px solid #64e5ec!important;
    outline-offset:-2px!important;
  }
  #gcPrimaryMobileNav a[aria-current="page"]{
    color:#64e5ec!important;
  }
  #gcPrimaryMobileNav a[aria-current="page"]::before,
  #gcPrimaryMobileNav a.primary[aria-current="page"]::before{
    content:""!important;
    position:absolute!important;
    top:0!important;
    left:24px!important;
    right:24px!important;
    height:2px!important;
    border-radius:999px!important;
    background:currentColor!important;
  }
}
@media (min-width:761px){
  #gcPrimaryMobileNav{display:none!important}
}
@media (max-width:430px){
  body{padding-bottom:58px!important}
  #gcPrimaryMobileNav{height:calc(54px + env(safe-area-inset-bottom))!important}
  #gcPrimaryMobileNav a{height:51px!important}
  #gcPrimaryMobileNav a svg{width:22px!important;height:22px!important}
  #gcPrimaryMobileNav a[aria-current="page"]::before{left:18px!important;right:18px!important}
}
</style>
<nav id="gcPrimaryMobileNav" aria-label="ناڤیگەیشنی سەرەکیی مۆبایل">
<a href="/" aria-label="سەرەکی" aria-current="page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-7 8 7v10H4z"></path><path d="M9 20v-6h6v6"></path></svg><span>سەرەکی</span></a>
<a href="/dashboard#shipments" aria-label="بارەکان"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4z"></path><path d="M7 7V5h10v2M4 11h16M9 15h6"></path></svg><span>بارەکان</span></a>
<a href="/#request" class="primary" aria-label="داواکردنی نرخ"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>نرخ</span></a>
<a href="/track" aria-label="شوێنکەوتن"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path><path d="M8.5 11h5"></path></svg><span>شوێنکەوتن</span></a>
<a href="/dashboard#profile" aria-label="هەژمار"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"></circle><path d="M5 20c.8-3.3 3.2-5 7-5s6.2 1.7 7 5"></path></svg><span>هەژمار</span></a>
</nav>`;
const LEGACY_SUPABASE_NOTICE = 'Supabase هێشتا پەیوەست نەکراوە — URL و publishable key لە کۆدەکەدا زیادبکە (سەرەتای script tag).';
const CSP = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://rum-static.pingdom.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.supabase.co https://rum-ingest.pingdom.net https://*.sentry.io https://sentry.io; frame-src 'self' https://www.google.com; worker-src 'self' blob:";
const STAFF_V5 = /^\/(?:staff|staff-os)(?:\.html)?\/?$/i;
const OPERATIONAL_PAGE = /^\/(?:staff(?:-os)?|warehouse(?:-os)?|customer-portal|superadmin|super-admin-command-center|operations(?:-[a-z0-9-]+)?|accounts-console|management)(?:\.html)?\/?$/i;
const addHeadAsset = (html, needle, fragment) => html.includes(needle) ? html : html.replace(/<\/head>/i, `${fragment}</head>`);
const addBodyAsset = (html, needle, fragment) => html.includes(needle) ? html : html.replace(/<\/body>/i, `${fragment}</body>`);
const applySecurityHeaders = (headers) => {
  if (!headers.get('x-request-id')) headers.set('x-request-id', crypto.randomUUID());
  headers.set('content-security-policy', CSP); headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin'); headers.set('x-frame-options', 'DENY');
  headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('permissions-policy', 'camera=(self), geolocation=(self), microphone=(), payment=()');
  headers.set('cross-origin-opener-policy', 'same-origin'); headers.set('origin-agent-cluster', '?1'); return headers;
};
const rewriteRootHtml = (html) => {
  let out = html;
  out = out.split(LEGACY_SUPABASE_NOTICE).join('').split('href="#admin"').join('href="/staff"').split('href="./staff-os.html"').join('href="/staff"').split(' data-gc-onclick="route(\'admin\')"').join('');
  out = out.split('/gc-csp-scripts/index-inline-1.js?v=20260821-1').join(`/gc-csp-scripts/index-inline-1.js?v=${VERSION}`);
  return out;
};
export async function onRequest(context) {
  const requestUrl = new URL(context.request.url), requestPath = requestUrl.pathname, accept = context.request.headers.get('accept') || '';
  if (requestPath === '/health' || requestPath === '/api/health') return new Response(JSON.stringify({ok:true,service:'globall-cloud',cloudflare:'pages',edge:'ok',timestamp:new Date().toISOString()}), {status:200,headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store'}});
  if (requestPath === '/release.json') return new Response(JSON.stringify({service:'globall-cloud',branch:context.env?.CF_PAGES_BRANCH||'main',commit:context.env?.CF_PAGES_COMMIT_SHA||null,generated_at:new Date().toISOString()}), {status:200,headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store'}});
  if (!accept.toLowerCase().includes(HTML_ACCEPT)) return context.next();
  const path = requestUrl.pathname, response = await context.next(), contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes(HTML_ACCEPT)) return response;
  let html = await response.text();
  if (path === '/' || path === '/index.html') html = rewriteRootHtml(html); else html = html.split(LEGACY_SUPABASE_NOTICE).join('');
  const headAssets = [
    ['href="/gc-theme-sync.css',THEME_CSS],
    ['src="/gc-theme-sync.js',THEME_JS],
    ['href="/gc-settings-hub.css',SETTINGS_CSS],
    ['src="/gc-settings-hub.js',SETTINGS_JS],
    ['name="color-scheme"','<meta name="color-scheme" content="dark light">'],
    ['href="/globall-visual-refresh-20260921.css',VISUAL_REFRESH],
    ['href="/enterprise-shell-v2026.css',ENTERPRISE_SHELL],
    ['href="/browser-compat.css',`<link rel="stylesheet" href="/browser-compat.css?v=${VERSION}" data-gc-browser-compat="1">`],
    ['href="/safari-compat-elite.css',`<link rel="stylesheet" href="/safari-compat-elite.css?v=${VERSION}" data-gc-safari-elite="1">`],
    ['href="/logo-fix.css',`<link rel="stylesheet" href="/logo-fix.css?v=${VERSION}" data-gc-logo-fix="1">`],
    ['href="/site-polish.css',`<link rel="stylesheet" href="/site-polish.css?v=${VERSION}" data-gc-premium-polish="1">`],
    ['href="/production-mobile-hotfix.css',`<link rel="stylesheet" href="/production-mobile-hotfix.css?v=${VERSION}" data-gc-production-mobile-hotfix="1">`],
    ['href="/production-mobile-ux-v2026.css',`<link rel="stylesheet" href="/production-mobile-ux-v2026.css?v=${VERSION}" data-gc-production-mobile-ux="1">`],
    ['href="/gc-public-premium-ux-2026.css',`<link rel="stylesheet" href="/gc-public-premium-ux-2026.css?v=${VERSION}" data-gc-public-premium-ux="1">`],
    ['href="/gc-home-final-2026.css',`<link rel="stylesheet" href="/gc-home-final-2026.css?v=${VERSION}" data-gc-home-final="1">`],
    ['src="/production-bridge.js',`<script src="/production-bridge.js?v=${VERSION}" defer data-gc-production-bridge="1"></script>`],
    ['src="/public-customer-auth-fix.js',`<script src="/public-customer-auth-fix.js?v=${VERSION}" defer data-gc-customer-auth-fix="1"></script>`],
    ['src="/production-brand-repair.js',`<script src="/production-brand-repair.js?v=${VERSION}" defer data-gc-production-brand-repair="1"></script>`],
    ['src="/gc-final-experience-2026.js',`<script src="/gc-final-experience-2026.js?v=${VERSION}" defer data-gc-final-experience="1"></script>`],
    ['href="/gc-final-ui-20260927.css',`<link rel="stylesheet" href="/gc-final-ui-20260927.css?v=4" data-gc-final-ui="3">`]
  ];
  for (const [needle,fragment] of headAssets) html = addHeadAsset(html,needle,fragment);
  if (STAFF_V5.test(path)) {
    const headers=applySecurityHeaders(new Headers(response.headers)); headers.delete('content-encoding'); headers.delete('content-length'); headers.delete('etag'); headers.set('cache-control','no-store, max-age=0, must-revalidate'); headers.set('content-type','text/html; charset=UTF-8');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
  if (OPERATIONAL_PAGE.test(path)) html=addHeadAsset(html,'src="/runtime-guard.js',`<script src="/runtime-guard.js?v=${VERSION}" defer data-gc-runtime-guard="1"></script>`);
  if (/^\/(?:tracking|track|tracking-integration)(?:\.html)?\/?$/i.test(path)) html=addHeadAsset(html,'src="/gc-tracking-deeplink.js',`<script src="/gc-tracking-deeplink.js?v=${VERSION}" defer data-gc-tracking-deeplink="1"></script>`);
  if (!OPERATIONAL_PAGE.test(path) || /^\/(?:customer-portal|tracking|tracking-integration)(?:\.html)?\/?$/i.test(path)) html=addHeadAsset(html,'href="/globall-realistic-design-20260919.css',`<link rel="stylesheet" href="/globall-realistic-design-20260919.css?v=${VERSION}" data-gc-realistic-design="1">`);
  if (path === '/' || path === '/index.html') {
    html=addHeadAsset(html,'src="/staff-auth-runtime-fix.js',`<script src="/staff-auth-runtime-fix.js?v=${VERSION}" defer data-gc-staff-auth-runtime="1"></script>`);
    html=addBodyAsset(html,'src="/gc-csp-scripts/logistics-pricing-ui.js',`<script src="/gc-csp-scripts/logistics-pricing-ui.js?v=${VERSION}" defer data-gc-logistics-pricing-ui="1"></script>`);
    html=addBodyAsset(html,'src="/site-navigation-20260909.js',`<script src="/site-navigation-20260909.js?v=${VERSION}" defer data-gc-site-navigation="1"></script>`);
    html=addBodyAsset(html,'src="/public-core-recovery.js',`<script src="/public-core-recovery.js?v=${VERSION}" defer data-gc-public-core-recovery="1"></script>`);
    html=addBodyAsset(html,'id="gcPrimaryMobileNav"',MOBILE_PRIMARY_NAV);
  }
  if (STAFF_V5.test(path)) {
    html=addHeadAsset(html,'src="/staff-os-compat.js',`<script src="/staff-os-compat.js?v=${VERSION}" defer data-gc-staff-compat="1"></script>`);
    html=addHeadAsset(html,'href="/staff-login-polish.css',`<link rel="stylesheet" href="/staff-login-polish.css?v=${VERSION}" data-gc-staff-login-polish="1">`);
    html=addHeadAsset(html,'href="/staff-command-center-pro.css',`<link rel="stylesheet" href="/staff-command-center-pro.css?v=${VERSION}" data-gc-staff-command-center-css="1">`);
    html=addHeadAsset(html,'href="/staff-directory-360.css',`<link rel="stylesheet" href="/staff-directory-360.css?v=${VERSION}" data-gc-staff-directory-360-css="1">`);
    html=addBodyAsset(html,'src="/staff-command-center-pro.js',`<script src="/staff-command-center-pro.js?v=${VERSION}" defer data-gc-staff-command-center="1"></script>`);
    html=addBodyAsset(html,'src="/staff-directory-360.js',`<script src="/staff-directory-360.js?v=${VERSION}" defer data-gc-staff-directory-360="1"></script>`);
    html=addBodyAsset(html,'src="/staff-profit-analytics.js',`<script src="/staff-profit-analytics.js?v=${VERSION}" defer data-gc-staff-profit-analytics="1"></script>`);
    html=addBodyAsset(html,'src="/gc-csp-scripts/staff-admin-panel.js',`<script src="/gc-csp-scripts/staff-admin-panel.js?v=${VERSION}" defer data-gc-staff-admin-panel="1"></script>`);
  }
  const legacyAdminSurface=/^\/(?:management|accounts-console|operations-suite|operations-command-center|operations-control|operations-control-v2|staff-portal|warehouse-os|superadmin|super-admin-command-center)\.html$/i;
  if (legacyAdminSurface.test(path)) {
    html=addHeadAsset(html,'href="/admin-console-enhanced.css',`<link rel="stylesheet" href="/admin-console-enhanced.css?v=${VERSION}" data-gc-admin-polish="1">`);
    html=addHeadAsset(html,'src="/admin-console-enhanced.js',`<script src="/admin-console-enhanced.js?v=${VERSION}" defer data-gc-admin-recovery="1"></script>`);
  }
  if (/^\/warehouse-os(?:\.html)?\/?$/i.test(path)) {
    html=addHeadAsset(html,'href="/warehouse-receipt-proof.css',`<link rel="stylesheet" href="/warehouse-receipt-proof.css?v=${VERSION}" data-gc-warehouse-receipt-proof="1">`);
    html=addBodyAsset(html,'src="/gc-csp-scripts/warehouse-receipt-proof-enhancement.js',`<script src="/gc-csp-scripts/warehouse-receipt-proof-enhancement.js?v=${VERSION}" defer data-gc-warehouse-receipt-proof="1"></script>`);
    html=addBodyAsset(html,'src="/gc-csp-scripts/warehouse-receiving-chain-bridge.js',`<script src="/gc-csp-scripts/warehouse-receiving-chain-bridge.js?v=${VERSION}" defer data-gc-warehouse-receiving-chain="1"></script>`);
  }
  if (/^\/customer-portal(?:\.html)?\/?$/i.test(path)) {
    html=addHeadAsset(html,'src="/gc-account-entry.js',ACCOUNT_ENTRY_JS);
    html=addHeadAsset(html,'href="/customer-receipt-evidence.css',`<link rel="stylesheet" href="/customer-receipt-evidence.css?v=${VERSION}" data-gc-customer-receipt-evidence="1">`);
    html=addBodyAsset(html,'src="/gc-csp-scripts/customer-receipt-evidence-enhancement.js',`<script src="/gc-csp-scripts/customer-receipt-evidence-enhancement.js?v=${VERSION}" defer data-gc-customer-receipt-evidence="1"></script>`);
    html=addBodyAsset(html,'src="/customer-debt-chat.js',`<script src="/customer-debt-chat.js?v=${VERSION}" defer data-gc-customer-debt-chat="1"></script>`);
  }
  if (path === '/super-admin-command-center.html') html=addHeadAsset(html,'src="/super-admin-live-control-v2.js',`<script src="/super-admin-live-control-v2.js?v=${VERSION}" defer data-gc-superadmin-live-control="1"></script>`);
  if (path === '/superadmin.html') {
    html=addHeadAsset(html,'href="/superadmin-server.css',`<link rel="stylesheet" href="/superadmin-server.css?v=${VERSION}" data-gc-superadmin-server-css="1">`);
    html=addBodyAsset(html,'src="/superadmin-enhancements.js',`<script src="/superadmin-enhancements.js?v=${VERSION}" defer data-gc-superadmin-enhancements="1"></script>`);
    html=addBodyAsset(html,'src="/superadmin-server.js',`<script src="/superadmin-server.js?v=${VERSION}" defer data-gc-superadmin-server="1"></script>`);
  }
  if (path === '/operations-control-v2.html') html=addBodyAsset(html,'src="/operations-events.js',`<script src="/operations-events.js?v=${VERSION}" defer data-gc-operations-events="1"></script>`);
  if (path === '/operations-command-center.html') html=addBodyAsset(html,'src="/operations-exception-engine.js',`<script src="/operations-exception-engine.js?v=${VERSION}" defer data-gc-exception-engine="1"></script>`);
  const headers=applySecurityHeaders(new Headers(response.headers)); headers.delete('content-encoding'); headers.delete('content-length'); headers.delete('etag'); headers.set('content-type','text/html; charset=UTF-8');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
