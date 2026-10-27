/* Globall Cloud — production HTML middleware. */
const HTML_ACCEPT = 'text/html';
const VERSION = '20261017-13';
const VISUAL_REFRESH = `<link rel="stylesheet" href="/globall-visual-refresh-20260921.css?v=20260921-1" data-gc-visual-refresh="20260921-1">`;
const ENTERPRISE_SHELL = `<link rel="stylesheet" href="/enterprise-shell-v2026.css?v=${VERSION}" data-gc-enterprise-shell="1">`;
const THEME_CSS = `<link rel="stylesheet" href="/gc-theme-sync.css?v=${VERSION}" data-gc-theme-css="1">`;
const THEME_JS = `<script src="/gc-theme-sync.js?v=${VERSION}" defer data-gc-theme-sync="1"></script>`;
const SETTINGS_CSS = `<link rel="stylesheet" href="/gc-settings-hub.css?v=${VERSION}" data-gc-settings-css="1">`;
const SETTINGS_JS = `<script src="/gc-settings-hub.js?v=${VERSION}" defer data-gc-settings-hub="1"></script>`;
const ACCOUNT_ENTRY_JS = `<script src="/gc-account-entry.js?v=20261014-1" defer data-gc-account-entry="1"></script>`;
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
const CSP = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://rum-static.pingdom.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.supabase.co https://rum-ingest.pingdom.net https://*.sentry.io https://sentry.io; frame-src 'self' https://www.google.com; worker-src 'self' blob:";
const STAFF_V5 = /^\/(?:staff|staff-os|staff-os-v5)(?:\.html)?\/?$/i;
const OPERATIONAL_PAGE = /^\/(?:staff(?:-os)?|staff-os-v5|warehouse(?:-os)?|customer-portal|superadmin|super-admin-command-center|operations(?:-[a-z0-9-]+)?|accounts-console|management)(?:\.html)?\/?$/i;
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
  if (OPERATIONAL_PAGE.test(path)) html=addHeadAsset(html,'src="/runtime-guard.js',`<script src="/runtime-guard.js?v=${VERSION}" defer data-gc-runtime-guard="1"></script>`);
  if (/^\/(?:tracking|track|tracking-integration)(?:\.html)?\/?$/i.test(path)) html=addHeadAsset(html,'src="/gc-tracking-deeplink.js',`<script src="/gc-tracking-deeplink.js?v=${VERSION}" defer data-gc-tracking-deeplink="1"></script>`);
  if (!OPERATIONAL_PAGE.test(path) || /^\/(?:customer-portal|tracking|tracking-integration)(?:\.html)?\/?$/i.test(path)) html=addHeadAsset(html,'href="/globall-realistic-design-20260919.css',`<link rel="stylesheet" href="/globall-realistic-design-20260919.css?v=${VERSION}" data-gc-realistic-design="1">`);
  if (path === '/' || path === '/index.html') {
    html=addHeadAsset(html,'src="/staff-auth-runtime-fix.js',`<script src="/staff-auth-runtime-fix.js?v=${VERSION}" defer data-gc-staff-auth-runtime="1"></script>`);
    html=addBodyAsset(html,'src="/gc-csp-scripts/logistics-pricing-ui.js',`<script src="/gc-csp-scripts/logistics-pricing-ui.js?v=${VERSION}" defer data-gc-logistics-pricing-ui="1"></script>`);
    html=addBodyAsset(html,'src="/site-navigation-20260909.js',`<script src="/site-navigation-20260909.js?v=${VERSION}" defer data-gc-site-navigation="1"></script>`);
    html=addBodyAsset(html,'src="/public-core-recovery.js',`<script src="/public-core-recovery.js?v=${VERSION}" defer data-gc-public-core-recovery="1"></script>`);
    // index.html owns the single public dock; do not inject a second overlapping navbar.
  }
  if (STAFF_V5.test(path)) {
    html=addHeadAsset(html,'src="/staff-blank-screen-recovery-20261003.js',`<script src="/staff-blank-screen-recovery-20261003.js?v=${VERSION}" defer data-gc-staff-blank-recovery="1"></script>`);
    html=addHeadAsset(html,'src="/staff-os-compat.js',`<script src="/staff-os-compat.js?v=${VERSION}" defer data-gc-staff-compat="1"></script>`);
    html=addHeadAsset(html,'href="/staff-login-polish.css',`<link rel="stylesheet" href="/staff-login-polish.css?v=${VERSION}" data-gc-staff-login-polish="1">`);
    html=addHeadAsset(html,'href="/staff-command-center-pro.css',`<link rel="stylesheet" href="/staff-command-center-pro.css?v=${VERSION}" data-gc-staff-command-center-css="1">`);
    html=addHeadAsset(html,'href="/staff-directory-360.css',`<link rel="stylesheet" href="/staff-directory-360.css?v=${VERSION}" data-gc-staff-directory-360-css="1">`);
    html=addHeadAsset(html,'href="/gc-staff-customer-control-20261003.css',`<link rel="stylesheet" href="/gc-staff-customer-control-20261003.css?v=${VERSION}" data-gc-staff-customer-control="1">`);
    html=addHeadAsset(html,'href="/gc-staff-dashboard-mobile-fix-20261003.css',`<link rel="stylesheet" href="/gc-staff-dashboard-mobile-fix-20261003.css?v=${VERSION}" data-gc-staff-dashboard-mobile-fix="1">`);
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
  // Keep the signature homepage CSS as the final stylesheet in the rendered document.
  // Compatibility/theme layers are injected after index.html, so move this one
  // scoped layer to the end only for the public homepage.
  if (path === '/' || path === '/index.html') {
    html = html.replace(/<link\b(?=[^>]*\bhref=["']\/gc-homepage-signature-20261016\.css(?:\?[^"']*)?["'])[^>]*>\s*/gi, '');
    html = addHeadAsset(
      html,
      'href="/gc-homepage-signature-20261016.css',
      '<link rel="stylesheet" href="/gc-homepage-signature-20261016.css?v=3" data-gc-homepage-signature="20261016">'
    );
  }

  // Staff UI styles are injected by compatibility layers above.
  // Keep compatibility repairs first, then one authoritative command deck last.
  if (STAFF_V5.test(path)) {
    const eliteThemeLink = '<link rel="stylesheet" href="/gc-staff-console-elite-20261018.css?v=6" data-gc-staff-console-elite="1">';
    const finalRepairLink = '<link rel="stylesheet" href="/gc-staff-polish-mobile-20261019.css?v=6" data-gc-staff-polish-mobile="1">';
    const finalDesignLink = '<link rel="stylesheet" href="/gc-staff-ui-refinement-20261019-v4.css?v=4" data-gc-staff-ui-refinement="1">';
    const finalWorkspaceLink = '<link rel="stylesheet" href="/gc-staff-live-workspace-20261019.css?v=6" data-gc-staff-live-workspace="1">';
    const finalOperationsRedesignLink = '<link rel="stylesheet" href="/gc-staff-operations-redesign-20261022.css?v=5" data-gc-staff-operations-redesign="1">';
    const finalSignatureLink = '<link rel="stylesheet" href="/gc-staff-command-signature-20261022.css?v=1" data-gc-staff-command-signature="1">';
    const finalCommandDeckLink = '<link rel="stylesheet" href="/gc-staff-command-deck-20261023.css?v=4" data-gc-staff-command-deck="1">';
    const finalLiveFinishLink = '<link rel="stylesheet" href="/gc-staff-live-finish-20261027.css?v=3" data-gc-staff-live-finish="1">';
    html = html.replace(/<link[^>]*data-gc-staff-console-elite[^>]*>\s*/gi, '');
    html = html.replace(/<link[^>]*data-gc-staff-polish-mobile[^>]*>\s*/gi, '');
    html = html.replace(/<link[^>]*data-gc-staff-ui-refinement[^>]*>\s*/gi, '');
    html = html.replace(/<link[^>]*data-gc-staff-live-workspace[^>]*>\s*/gi, '');
    html = html.replace(/<link[^>]*data-gc-staff-operations-redesign[^>]*>\s*/gi, '');
    html = html.replace(/<link[^>]*data-gc-staff-command-signature[^>]*>\s*/gi, '');
    html = html.replace(/<link[^>]*data-gc-staff-command-deck[^>]*>\s*/gi, '');
    html = html.replace(/<link[^>]*data-gc-staff-live-finish[^>]*>\s*/gi, '');
    html = html.replace(/<\/head>/i, eliteThemeLink + finalRepairLink + finalDesignLink + finalWorkspaceLink + finalOperationsRedesignLink + finalSignatureLink + finalCommandDeckLink + finalLiveFinishLink + "<style data-gc-staff-critical-style=\"1\">\nbody.gc-staff-os-shell{--gcf-canvas:#edf3f7;--gcf-paper:#fff;--gcf-soft:#f6fafc;--gcf-ink:#173247;--gcf-muted:#60798a;--gcf-line:#d7e3eb;--gcf-line-strong:#bdd1dc;--gcf-teal:#087f8c;--gcf-teal-2:#13aab2;--gcf-teal-soft:#e2f6f5;--gcf-shadow:0 10px 30px rgba(17,49,68,.075);background:var(--gcf-canvas)!important;color:var(--gcf-ink)!important;font-family:\"Vazirmatn\",\"Noto Sans Arabic\",system-ui,sans-serif!important;overflow-x:clip!important}\nhtml[data-gc-theme=\"dark\"] body.gc-staff-os-shell{--gcf-canvas:#061522;--gcf-paper:#0d293b;--gcf-soft:#123345;--gcf-ink:#f0f7fb;--gcf-muted:#aac0cd;--gcf-line:#264b60;--gcf-line-strong:#39677b;--gcf-teal:#56d5dc;--gcf-teal-2:#29b9c4;--gcf-teal-soft:#103e47;--gcf-shadow:0 13px 34px rgba(0,0,0,.28)}\nbody.gc-staff-os-shell #app{width:min(1680px,100%)!important;max-width:1680px!important;min-width:0!important;margin-inline:auto!important}\nbody.gc-staff-os-shell #app .gc-shell{grid-template-columns:minmax(225px,260px) minmax(0,1fr)!important;gap:14px!important;min-width:0!important}\nbody.gc-staff-os-shell #app .gc-side,body.gc-staff-os-shell #app .topbar,body.gc-staff-os-shell #app .card,body.gc-staff-os-shell #app .panel,body.gc-staff-os-shell #app .section-card,body.gc-staff-os-shell #app .grid-kpi.tower-kpis>.kpi{background:var(--gcf-paper)!important;color:var(--gcf-ink)!important;border:1px solid var(--gcf-line)!important;border-radius:18px!important;box-shadow:var(--gcf-shadow)!important}\nbody.gc-staff-os-shell #app .gc-side{border-radius:22px!important}\nbody.gc-staff-os-shell #app .topbar{padding:13px 16px!important;margin:0 0 14px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;flex-wrap:wrap!important}\nbody.gc-staff-os-shell #app .top-title strong,body.gc-staff-os-shell #app .card h2,body.gc-staff-os-shell #app .card h3,body.gc-staff-os-shell #app .section-head h2{color:var(--gcf-ink)!important;line-height:1.5!important}\nbody.gc-staff-os-shell #app .muted,body.gc-staff-os-shell #app .top-title small,body.gc-staff-os-shell #app .card small{color:var(--gcf-muted)!important}\nbody.gc-staff-os-shell #app .tower-hero{background:linear-gradient(125deg,#08263d 0%,#0b4055 62%,#0a6065 100%)!important;color:#f4fbff!important;border:1px solid #1a6170!important;border-radius:24px!important;box-shadow:0 18px 44px rgba(9,38,61,.20)!important;padding:clamp(18px,2.5vw,28px)!important;overflow:hidden!important;min-width:0!important}\nbody.gc-staff-os-shell #app .tower-hero h1,body.gc-staff-os-shell #app .tower-hero h2,body.gc-staff-os-shell #app .tower-hero h3,body.gc-staff-os-shell #app .tower-hero p,body.gc-staff-os-shell #app .tower-hero .muted{color:#f4fbff!important;line-height:1.75!important;overflow-wrap:anywhere!important}\nbody.gc-staff-os-shell #app .tower-hero .eyebrow{color:#86edf0!important}\nbody.gc-staff-os-shell #app .tower-hero-meta{display:flex!important;gap:8px!important;flex-wrap:wrap!important;margin-top:10px!important}\nbody.gc-staff-os-shell #app .tower-hero-actions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:9px!important;margin-top:16px!important}\nbody.gc-staff-os-shell #app .tower-hero-actions>*{min-width:0!important;max-width:100%!important;width:100%!important}\nbody.gc-staff-os-shell #app .btn,body.gc-staff-os-shell #app button.btn,body.gc-staff-os-shell #app a.btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-width:0!important;max-width:100%!important;min-height:42px!important;padding:10px 14px!important;background:var(--gcf-paper)!important;color:var(--gcf-ink)!important;border:1px solid var(--gcf-line-strong)!important;border-radius:12px!important;font:800 12px/1.45 \"Vazirmatn\",system-ui,sans-serif!important;text-align:center!important;white-space:normal!important;overflow-wrap:anywhere!important;box-shadow:none!important;transform:none!important}\nbody.gc-staff-os-shell #app .btn.primary,body.gc-staff-os-shell #app .btn.primary:hover{background:linear-gradient(135deg,var(--gcf-teal-2),var(--gcf-teal))!important;color:#fff!important;border-color:transparent!important}\nbody.gc-staff-os-shell #app .tower-hero .btn{background:rgba(255,255,255,.09)!important;color:#f7fdff!important;border-color:rgba(208,245,250,.32)!important}\nbody.gc-staff-os-shell #app .tower-hero .btn.primary{background:linear-gradient(135deg,#5fe1e2,#18b6c0)!important;color:#062932!important;border-color:transparent!important}\nbody.gc-staff-os-shell #app .grid-kpi.tower-kpis{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:11px!important;min-width:0!important}\nbody.gc-staff-os-shell #app .grid-kpi.tower-kpis>.kpi{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:space-between!important;gap:7px!important;min-width:0!important;min-height:112px!important;padding:15px!important;overflow:hidden!important}\nbody.gc-staff-os-shell #app .grid-kpi.tower-kpis>.kpi>span{color:var(--gcf-muted)!important;font-size:11px!important;font-weight:800!important;line-height:1.7!important;overflow-wrap:anywhere!important}\nbody.gc-staff-os-shell #app .grid-kpi.tower-kpis>.kpi>strong{color:var(--gcf-ink)!important;font:900 clamp(18px,2vw,26px)/1.3 \"JetBrains Mono\",ui-monospace,monospace!important;direction:ltr!important;unicode-bidi:isolate!important;font-variant-numeric:tabular-nums!important;overflow-wrap:anywhere!important}\nbody.gc-staff-os-shell #app .grid-kpi.tower-kpis>.kpi small{color:var(--gcf-muted)!important;line-height:1.7!important;overflow-wrap:anywhere!important}\nbody.gc-staff-os-shell #app .tower-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important;min-width:0!important}\nbody.gc-staff-os-shell #app .tower-grid>*{min-width:0!important;max-width:100%!important}\nbody.gc-staff-os-shell #app .tower-grid>.card{padding:18px!important}\nbody.gc-staff-os-shell #app .tower-flow{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:8px!important;min-width:0!important;overflow:visible!important}\nbody.gc-staff-os-shell #app .tower-flow-step{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-width:0!important;min-height:86px!important;padding:10px 6px!important;background:var(--gcf-soft)!important;color:var(--gcf-muted)!important;border:1px solid var(--gcf-line)!important;border-radius:13px!important;transform:none!important;box-shadow:none!important}\nbody.gc-staff-os-shell #app .tower-flow-step.has-data,body.gc-staff-os-shell #app .tower-flow-step.active{background:var(--gcf-teal-soft)!important;border-color:var(--gcf-line-strong)!important;color:var(--gcf-teal)!important}\nbody.gc-staff-os-shell #app .tower-flow-step>b,body.gc-staff-os-shell #app .tower-flow-step>strong{font:900 15px/1.3 \"JetBrains Mono\",monospace!important;direction:ltr!important;unicode-bidi:isolate!important;color:inherit!important}\nbody.gc-staff-os-shell #app .tower-flow-step small{font-size:10px!important;line-height:1.55!important;color:inherit!important;overflow-wrap:anywhere!important}\nbody.gc-staff-os-shell #app .table-wrap,body.gc-staff-os-shell #app .table-scroll,body.gc-staff-os-shell #app .table-container{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:auto!important;border:1px solid var(--gcf-line)!important;border-radius:14px!important}\nbody.gc-staff-os-shell #app .table th{background:var(--gcf-soft)!important;color:var(--gcf-muted)!important}\nbody.gc-staff-os-shell #app .table td{background:var(--gcf-paper)!important;color:var(--gcf-ink)!important}\nbody.gc-staff-os-shell #app input,body.gc-staff-os-shell #app textarea,body.gc-staff-os-shell #app select,body.gc-staff-os-shell #app .field{max-width:100%!important;min-width:0!important;min-height:44px!important;border:1px solid var(--gcf-line-strong)!important;border-radius:12px!important;background:var(--gcf-paper)!important;color:var(--gcf-ink)!important;font-size:14px!important}\nbody.gc-staff-os-shell #app .mono,body.gc-staff-os-shell #app bdi[dir=\"ltr\"]{direction:ltr!important;unicode-bidi:isolate!important;font-variant-numeric:tabular-nums!important}\nbody.gc-staff-os-shell #app .modal,body.gc-staff-os-shell #app .modal-card,body.gc-staff-os-shell #app .modal-panel{background:var(--gcf-paper)!important;color:var(--gcf-ink)!important;border:1px solid var(--gcf-line)!important;border-radius:20px!important;max-width:100%!important;max-height:calc(100dvh - 24px)!important;overflow:auto!important}\nbody.gc-staff-os-shell > .gc-staff-mobile-dock{position:fixed!important;z-index:9999!important;display:none!important;box-sizing:border-box!important;border:1px solid var(--gcf-line)!important;background:var(--gcf-paper)!important;color:var(--gcf-muted)!important;box-shadow:0 12px 36px rgba(10,39,56,.22)!important;backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important}\nbody.gc-staff-os-shell > .gc-staff-mobile-dock button{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-width:0!important;min-height:49px!important;gap:4px!important;padding:5px 2px!important;border:1px solid transparent!important;border-radius:12px!important;background:transparent!important;color:var(--gcf-muted)!important;font:850 9px/1.35 \"Vazirmatn\",system-ui,sans-serif!important}\nbody.gc-staff-os-shell > .gc-staff-mobile-dock button.active,body.gc-staff-os-shell > .gc-staff-mobile-dock button[aria-current=\"page\"]{background:var(--gcf-teal-soft)!important;color:var(--gcf-teal)!important;border-color:var(--gcf-line-strong)!important}\nbody.gc-staff-os-shell > .gc-staff-mobile-dock .gc-staff-mobile-icon{display:grid!important;place-items:center!important;width:21px!important;height:21px!important;flex:0 0 21px!important}\nbody.gc-staff-os-shell > .gc-staff-mobile-dock .gc-staff-mobile-icon svg{display:block!important;width:20px!important;height:20px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important}\nbody.gc-staff-os-shell > #gcStaffMobileBackdrop,body.gc-staff-os-shell > .gc-staff-mobile-backdrop{display:none;position:fixed!important;inset:0!important;z-index:9997!important;background:rgba(5,19,32,.58)!important}\nbody.gc-staff-os-shell > .gc-staff-mobile-backdrop.open{display:block!important}\nbody.gc-staff-os-shell > #gcStaffMobileDrawer,body.gc-staff-os-shell > .gc-staff-mobile-drawer{display:none;position:fixed!important;inset-inline:0!important;inset-block-end:0!important;z-index:9998!important;max-height:min(78dvh,720px)!important;overflow:auto!important;overscroll-behavior:contain!important;padding:20px 16px calc(18px + env(safe-area-inset-bottom,0px))!important;border:1px solid var(--gcf-line)!important;border-radius:24px 24px 0 0!important;background:var(--gcf-paper)!important;color:var(--gcf-ink)!important;box-shadow:0 -18px 52px rgba(10,39,56,.2)!important;-webkit-overflow-scrolling:touch!important}\nbody.gc-staff-os-shell > .gc-staff-mobile-drawer.open:not([hidden]){display:flex!important;flex-direction:column!important;gap:14px!important}\nbody.gc-staff-os-shell > .gc-staff-mobile-drawer[hidden],body.gc-staff-os-shell > .gc-staff-mobile-dock[hidden]{display:none!important}\n@media(min-width:761px){body.gc-staff-os-shell > .gc-staff-mobile-dock,body.gc-staff-os-shell > .gc-staff-mobile-drawer,body.gc-staff-os-shell > .gc-staff-mobile-backdrop{display:none!important}}\n@media(max-width:760px){\nbody.gc-staff-os-shell{padding:0!important;padding-bottom:calc(88px + env(safe-area-inset-bottom,0px))!important}\nbody.gc-staff-os-shell #app{width:100%!important;max-width:100%!important;min-height:100dvh!important;margin:0!important;padding:0!important}\nbody.gc-staff-os-shell #app .gc-shell{display:flex!important;flex-direction:column!important;gap:0!important;min-height:100dvh!important}\nbody.gc-staff-os-shell #app .gc-side{display:none!important}\nbody.gc-staff-os-shell #app .gc-main{width:100%!important;max-width:100%!important;min-width:0!important;padding:0 0 20px!important}\nbody.gc-staff-os-shell #app .topbar{position:sticky!important;top:0!important;z-index:70!important;margin:0 0 10px!important;padding:10px 12px!important;border-width:0 0 1px!important;border-radius:0 0 16px 16px!important;background:var(--gcf-paper)!important}\nbody.gc-staff-os-shell #app .top-actions{display:flex!important;flex-wrap:wrap!important;gap:7px!important;min-width:0!important}\nbody.gc-staff-os-shell #app .view,body.gc-staff-os-shell #app #view{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:11px!important;min-width:0!important;margin:0!important;padding:0 10px 26px!important}\nbody.gc-staff-os-shell #app .tower-hero{padding:17px 14px!important;margin:0 -10px!important;max-width:calc(100% + 20px)!important;border-radius:0 0 20px 20px!important}\nbody.gc-staff-os-shell #app .tower-hero h1{font-size:clamp(24px,7vw,34px)!important;line-height:1.35!important}\nbody.gc-staff-os-shell #app .tower-hero-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}\nbody.gc-staff-os-shell #app .tower-hero-actions>*{min-width:0!important;width:100%!important}\nbody.gc-staff-os-shell #app .tower-hero-actions>:last-child{grid-column:1/-1!important}\nbody.gc-staff-os-shell #app .tower-hero-actions .btn{min-height:44px!important;padding:9px 7px!important;font-size:11px!important}\nbody.gc-staff-os-shell #app .grid-kpi.tower-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}\nbody.gc-staff-os-shell #app .grid-kpi.tower-kpis>.kpi{min-height:92px!important;padding:12px 10px!important;border-radius:15px!important}\nbody.gc-staff-os-shell #app .grid-kpi.tower-kpis>.kpi>strong{font-size:clamp(17px,5.2vw,23px)!important}\nbody.gc-staff-os-shell #app .tower-grid{grid-template-columns:minmax(0,1fr)!important;gap:10px!important}\nbody.gc-staff-os-shell #app .tower-grid>.card{padding:13px!important;border-radius:16px!important}\nbody.gc-staff-os-shell #app .tower-flow{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}\nbody.gc-staff-os-shell #app .tower-flow-step{min-height:76px!important;padding:9px 6px!important}\nbody.gc-staff-os-shell #app .table{min-width:680px!important}\nbody.gc-staff-os-shell #app .modal-backdrop,body.gc-staff-os-shell #app #gcModal{align-items:end!important;padding:8px!important;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px))!important}\nbody.gc-staff-os-shell #app .modal,body.gc-staff-os-shell #app .modal-card,body.gc-staff-os-shell #app .modal-panel{width:100%!important;max-height:calc(100dvh - 16px)!important;border-radius:19px!important}\nbody.gc-staff-os-shell > .gc-staff-mobile-dock{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:3px!important;inset-inline:8px!important;inset-block-end:calc(7px + env(safe-area-inset-bottom,0px))!important;width:auto!important;max-width:calc(100vw - 16px)!important;min-height:62px!important;padding:5px!important;margin:0!important;border-radius:18px!important}\nbody.gc-staff-os-shell > .gc-staff-mobile-dock button{min-height:49px!important}\n}\n@media(max-width:420px){body.gc-staff-os-shell #app .top-title strong{font-size:15px!important}body.gc-staff-os-shell #app .view,body.gc-staff-os-shell #app #view{padding-inline:9px!important}body.gc-staff-os-shell #app .grid-kpi.tower-kpis{gap:7px!important}body.gc-staff-os-shell #app .tower-grid>.card{padding:12px!important}body.gc-staff-os-shell > .gc-staff-mobile-dock{inset-inline:5px!important;max-width:calc(100vw - 10px)!important;gap:2px!important}}\n@media(prefers-reduced-motion:reduce){body.gc-staff-os-shell #app *,body.gc-staff-os-shell #app *::before,body.gc-staff-os-shell #app *::after{animation:none!important;transition:none!important}}\n</style>" + '</head>');
  }
  const headers=applySecurityHeaders(new Headers(response.headers)); headers.delete('content-encoding'); headers.delete('content-length'); headers.delete('etag'); headers.set('content-type','text/html; charset=UTF-8'); if(STAFF_V5.test(path)) headers.set('cache-control','no-store, max-age=0, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
