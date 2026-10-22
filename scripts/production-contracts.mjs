#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let failures = 0
const fail = (message) => { console.error(`  ✗ ${message}`); failures += 1 }
const ok = (message) => console.log(`  ✓ ${message}`)
const read = (path) => readFileSync(join(ROOT, path), 'utf8')
const exists = (path) => existsSync(join(ROOT, path))

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules' || entry === '.wrangler' || entry === '.pages-dist') continue
    const absolute = join(dir, entry)
    let stat
    try { stat = statSync(absolute) } catch { continue }
    if (stat.isDirectory()) walk(absolute, out)
    else out.push(absolute)
  }
  return out
}

console.log('Production contract validation')

const config = read('supabase/config.toml')
if (/^project_id\s*=\s*"ahslifnthiwfkmaswjno"$/m.test(config)) ok('Supabase production project is pinned')
else fail('Supabase project_id is not pinned to production')

const sw = read('sw.js')
const cacheName = sw.match(/const CACHE_NAME\s*=\s*['"]([^'"]+)['"]/)?.[1]
if (cacheName && /^globall-cloud-v\d+-\d{8,}$/.test(cacheName)) ok(`Service-worker cache is versioned: ${cacheName}`)
else fail('sw.js does not use a versioned Globall Cloud cache name')
if (sw.includes("fetch(request, { cache: 'no-store' })") && sw.includes('self.skipWaiting()') && sw.includes('self.clients.claim()')) ok('Service worker is network-first and self-updating')
else fail('Service Worker network-first/lifecycle contract is incomplete')

const required = [
  'index.html','gc-accessibility-mobile-20261021.css','gc-customer-experience-signature-20261017.css','login.html','register.html','customer-access.html','sw.js','gc-production-ui-20260927.css','production-bridge.js','runtime-guard.js','_headers','_redirects','functions/api/health.js','functions/api/ready.js','public-route-bootstrap.js','public-runtime-guarantee.js',
  'public-staff-guard-20260909.js','public-premium-mobile-20260909.css','public-premium-mobile-20260909.js','tracking-integration.html','tracking-intelligence.js',
  'tracking-intelligence.css','customer-portal.html','warehouse-os.html','driver-workspace.html','staff-os-v5.html','staff-os-v5.css','gc-staff-ui-refinement-20261019-v4.css','gc-staff-live-workspace-20261019.css','gc-staff-operations-redesign-20261022.css','gc-staff-customer-bridge-20261019.js','staff-os-v5.js','staff-os-v5-20261017.js',
  'staff-os-v5-rescue.js','staff-logistics-intelligence.css','staff-logistics-intelligence.js','staff-mobile-command-dock.css','staff-mobile-command-dock.js',
  'staff-os-pro-20260909.css','staff-os-pro-20260909.js','staff-shell-polish-20260909.css','staff-shell-polish-20260909.js',
  'staff-premium-mobile-20260909.css','staff-premium-mobile-20260909.js','warehouse-offline-sync.js','production-mobile-ux-v2026.css','gc-platform-vnext.js',
  'gc-platform-vnext-plus.js','gc-runtime-safety-v2026.js','production-brand-repair.js','gc-csp-scripts/logistics-pricing-ui.js','supabase/config.toml',
  'package.json','gc-account-entry.js','gc-csp-scripts/customer-portal-inline-1.js','gc-csp-scripts/customer-portal-inline-20261017.js','gc-unified-customer-experience-20261016.js','supabase/functions/_shared/service-key.ts','supabase/functions/logistics-control-plane/index.ts',
  'supabase/functions/notification-dispatch/index.ts','supabase/functions/warehouse-receiving/index.ts','supabase/functions/warehouse-notify/index.ts',
  'supabase/functions/staff-ops-hub/index.ts','supabase/functions/staff-analytics/index.ts','supabase/functions/invoice-ai/index.ts',
  'supabase/functions/customer-debt-assistant/index.ts','supabase/functions/fx-refresh/index.ts','supabase/functions/public-config/index.ts',
  'supabase/functions/public-message/index.ts','supabase/functions/public-quote/index.ts','supabase/functions/public-pricing/index.ts',
  'supabase/functions/public-track/index.ts','supabase/functions/public-health/index.ts','supabase/functions/customer-self/index.ts','supabase/functions/customer-gc-login/index.ts','supabase/functions/customer-gc-register/index.ts','supabase/functions/payment-webhook/index.ts',
  'supabase/functions/_shared/payment-providers.ts','tests/validate.mjs','tests/e2e/run.mjs'
]
const missing = required.filter((path) => !exists(path))
if (missing.length) missing.forEach((path) => fail(`missing critical production file: ${path}`))
else ok(`${required.length} critical production files are present`)

const extensions = new Set(['.js','.mjs','.ts','.tsx','.html','.css','.json','.toml','.yml','.yaml'])
const files = walk(ROOT).filter((file) => extensions.has(file.slice(file.lastIndexOf('.'))))
const staleProjectRef = ['swptm', 'hhwhdtyrrfzetam'].join('')
let staleHits = 0
let secretHits = 0
const secretPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?:eyJ|sb_secret_)[A-Za-z0-9._-]{10,}/i,
  /service[_-]?role[_-]?key\s*[:=]\s*["'](?:eyJ|sb_secret_)[A-Za-z0-9._-]{10,}/i,
  /CLOUDFLARE_API_TOKEN\s*[:=]\s*["'][A-Za-z0-9._-]{20,}/i,
]
for (const file of files) {
  const source = readFileSync(file, 'utf8')
  if (source.includes(staleProjectRef)) { staleHits += 1; fail(`stale Supabase project reference in ${relative(ROOT, file)}`) }
  if (secretPatterns.some((pattern) => pattern.test(source))) { secretHits += 1; fail(`secret-like credential literal detected in ${relative(ROOT, file)}`) }
}
if (!staleHits) ok('No stale Supabase project reference detected')
if (!secretHits) ok('No secret-like service credential detected in source')

const headers = read('_headers')
const redirects = read('_redirects')
if (!headers.includes('Content-Security-Policy:') || /script-src[^\n;]*unsafe-inline/.test(headers) || !headers.includes('Strict-Transport-Security:') || !headers.includes('X-Content-Type-Options: nosniff')) fail('security header contract is incomplete')
else ok('Security headers are present')
for (const route of ['/tracking-integration.html /track 301','/staff /staff-os-v5.html 200','/staff/ /staff-os-v5.html 200','/staff-os /staff-os-v5.html 200']) if (!redirects.includes(route)) fail(`route contract missing: ${route}`)
if (!failures) ok('Core public/staff routes are wired')

const bridge = read('production-bridge.js')
const staff = read('staff-os-v5.html')
const staffLoader = read('staff-os-v5-enhancement-loader-20261017.js')
const publicShell = read('index.html')
const brandSystem = read('gc-brand-system-20260929.css')
const brandRoot = brandSystem.match(/:root\s*\{([^}]+)\}/)?.[1] || ''
if (!publicShell.includes('/gc-brand-system-20260929.css?v=2')) fail('Homepage brand token stylesheet cache-buster is stale')
if (/--gc-(?:ink|navy|navy-2|muted|line)\s*:/.test(brandRoot)) fail('Brand accent stylesheet must not override shared public UI color and border tokens')
else ok('Brand accents stay isolated from shared UI text, muted and border tokens')
if (!['--gc-gold:', '--gc-gold-bright:', '--gc-gold-soft:'].every(token => brandRoot.includes(token))) fail('Premium brand gold tokens are incomplete')
const publicIndex = read('gc-csp-scripts/index-inline-2.js')
const publicBootstrap = read('public-route-bootstrap.js')
const publicRuntime = read('public-runtime-guarantee.js')
if (!bridge.includes('https://ahslifnthiwfkmaswjno.supabase.co')) fail('production bridge points at the wrong Supabase project')
if (!/^\[functions\.customer-self\]\s*verify_jwt\s*=\s*true$/m.test(config)) fail('customer-self verify_jwt must remain true')
if (!/^\[functions\.public-health\]\s*verify_jwt\s*=\s*false$/m.test(config)) fail('public-health verify_jwt must remain false')
if (!read('functions/api/ready.js').includes('/functions/v1/public-health')) fail('ready endpoint points at the wrong Supabase health function')
if (!bridge.includes('SUPABASE_PUBLISHABLE_KEY')) fail('production bridge publishable key marker missing')
if (!staff.includes('gc-staff-final-20260922.js?v=')) fail('Staff final mobile navigation JS is not loaded')
if (staff.includes('staff-reference-mobile-20260922.js?v=') || staff.includes('staff-premium-mobile-20260909.js?v=')) fail('Legacy competing Staff mobile navigation scripts are still loaded')
if (staffLoader.includes('staff-mobile-command-dock.js?v=')) fail('Legacy Staff mobile command dock is still dynamically loaded')
if (!staff.includes('mobile-premium-responsive-v2026.css?v=')) fail('Staff responsive CSS is not loaded')
if (!publicShell.includes('/gc-production-ui-20260927.css?v=1')) fail('Public production UI layer is not loaded')
if (!staff.includes('/gc-production-ui-20260927.css?v=1')) fail('Staff production UI layer is not loaded')
if (!read('index.html').includes('gc-customer-workspace-elite-20261014.css?v=23')) fail('Unified customer workspace UI layer is not loaded')
if (!read('index.html').includes('gc-customer-experience-signature-20261017.css?v=2') || !read('gc-public-customer-style-loader-20261014.js').includes('gc-customer-experience-signature-20261017.css?v=2')) fail('Signature customer experience layer is not loaded last')
if (!read('index.html').includes('gc-homepage-signature-20261016.css?v=10') || !read('index.html').includes('gc-live-mobile-v3.css?v=20261017-2')) fail('Premium mobile homepage style layer is not loaded')
const homeMobileRefinement = read('gc-homepage-signature-20261016.css')
if (!homeMobileRefinement.includes('#gcApp .gc-announcement { display:none!important; }') || !homeMobileRefinement.includes('body .gc-whatsapp-float {display:none!important;}') || !homeMobileRefinement.includes('#gcApp {padding-bottom:0!important;}')) fail('Public mobile UX must compact the header and avoid fixed controls covering content')
else ok('Public mobile UX keeps the header compact and prevents WhatsApp/dock overlap')
if (!read('index.html').includes('gc-customer-mobile-dock-20261016.css?v=5') || !read('index.html').includes('gc-public-customer-style-loader-20261014.js?v=24')) fail('Customer mobile navigation stylesheet cache-busters are stale')
const premiumHomeStyles = read('gc-homepage-signature-20261016.css')
const premiumCustomerStyles = read('gc-customer-workspace-elite-20261014.css')
const premiumDockStyles = read('gc-customer-mobile-dock-20261016.css')
if (!premiumHomeStyles.includes('body:not(.gc-customer-app) .gc-mobile-dock-v3{display:none!important') || !premiumHomeStyles.includes("url('/assets/gc-air-freight-hero-1440.webp')")) fail('Public mobile layout should avoid overlapping navigation and use the freight hero art')
if (!['gc-air-freight-hero-640.webp','gc-sea-freight-hero-640.webp','gc-land-freight-hero-640.webp'].every(asset => premiumCustomerStyles.includes(asset))) fail('Customer service cards must feature real air, sea and land images')
if (!premiumDockStyles.includes('grid-template-columns:repeat(5,minmax(0,1fr))') || !premiumDockStyles.includes('padding-bottom:calc(136px + env(safe-area-inset-bottom))')) fail('Customer dock must keep five clear icons without covering page content')
else ok('Unified customer workspace UI layer is loaded')
if (!staff.includes('staff-os-pro-20260909.css?v=') || !staff.includes('staff-shell-polish-20260909.css?v=')) fail('Staff shell polish assets are not loaded')
if (!publicShell.includes('/globall-redesign-20260922.js')) fail('active public shell does not load the current experience script')
if (publicShell.includes('gc-csp-scripts/index-inline-2.js')) fail('legacy monolithic public script is still loaded by the active homepage')
if (!publicIndex.includes('functions/v1/public-quote')) fail('active public quote endpoint is not wired')
if (!publicIndex.includes('functions/v1/public-message')) fail('active public message endpoint is not wired')
if (!publicBootstrap.includes('/public-runtime-guarantee.js')) fail('public runtime guarantee is not loaded')
if (!publicRuntime.includes('renderEmergencyShell')) fail('public emergency shell is missing')
if (staff.includes('YOUR_PROJECT_ID') || staff.includes('YOUR_ANON_KEY')) fail('Staff OS still contains placeholder Supabase configuration')

const publicFns = ['public-config','public-message','public-quote','public-pricing','public-track','public-health','staff-directory']
for (const fn of publicFns) {
  const block = new RegExp(`\\[functions\\.${fn}\\][\\s\\S]*?verify_jwt\\s*=\\s*(true|false)`).exec(config)
  if (!block) fail(`missing explicit verify_jwt setting for ${fn}`)
  else if (block[1] !== 'false') fail(`${fn} must be publicly callable`)
}
if (!failures) ok('Public function JWT posture is explicit')
const customerPortalLogin = read('gc-csp-scripts/customer-portal-inline-20261017.js')
const customerAccountEntry = read('gc-account-entry.js')
if (!customerPortalLogin.includes('/functions/v1/customer-gc-login') || !customerPortalLogin.includes('sb.auth.setSession')) fail('Customer portal must authenticate GC codes via customer-gc-login and persist the returned session')
else ok('GC-code sign-in uses the dedicated Edge Function and stores the Supabase session')
if (!customerAccountEntry.includes("email.setAttribute('type', 'text')")) fail('Customer login identifier must accept GC codes without email-type validation')
else ok('Customer login input accepts GC codes')

const staffV5Script = read('staff-os-v5-20261017.js')
const staffCustomerBridgeScript = read('gc-staff-customer-bridge-20261019.js')
const staffUnifiedStyles = read('gc-staff-ui-refinement-20261019-v4.css')
const staffV5EnhancementLoader = read('staff-os-v5-enhancement-loader-20261017.js')
const staffMobileDock = read('gc-staff-mobile-dock-20261016.js')
const staffWorkspaceCss = read('gc-staff-live-workspace-20261019.css')
const staffRedesignCss = read('gc-staff-operations-redesign-20261022.css')
if (!staffRedesignCss.includes('GC-STAFF-OPERATIONS-REDESIGN-20261022') ||
    !staffRedesignCss.includes('GC-STAFF-ACTION-RELIABILITY-20261022') ||
    !staffRedesignCss.includes('touch-action: manipulation !important') ||
    !staffRedesignCss.includes('.gc-mobile-staff-dock') ||
    !staffRedesignCss.includes('.gc-staff-mobile-backdrop:not(.open)') ||
    !staffRedesignCss.includes('font-family: "Vazirmatn"') ||
    !staffRedesignCss.includes('.tower-hero') ||
    !staffRedesignCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr)) !important') ||
    !staff.includes('gc-staff-operations-redesign-20261022.css?v=4') ||
    !staffV5EnhancementLoader.includes("loadStyle('/gc-staff-operations-redesign-20261022.css?v=4')") ||
    !staffV5EnhancementLoader.includes("const href = '/gc-staff-operations-redesign-20261022.css?v=4'") ||
    !productionMiddleware.includes('finalOperationsRedesignLink') ||
    !productionMiddleware.includes("finalWorkspaceLink + finalOperationsRedesignLink + '</head>'")) {
  fail('Staff OS must load the final responsive operations redesign and mobile tap repair after all legacy CSS')
} else {
  ok('Staff OS final operations redesign and mobile interaction repair override legacy CSS')
}
if (!staffRedesignCss.includes('GC-STAFF-MODAL-ACTION-LAYER-20261022') ||
    !staffRedesignCss.includes('z-index: 2147483600 !important') ||
    !staffRedesignCss.includes('position: sticky !important') ||
    !staffRedesignCss.includes('body.gc-staff-os-shell:has(#gcModal) .gc-staff-mobile-dock') ||
    !staff.includes('gc-staff-operations-redesign-20261022.css?v=4') ||
    !staffV5EnhancementLoader.includes("loadStyle('/gc-staff-operations-redesign-20261022.css?v=4')") ||
    !staffV5EnhancementLoader.includes("const href = '/gc-staff-operations-redesign-20261022.css?v=4'") ||
    !productionMiddleware.includes('gc-staff-operations-redesign-20261022.css?v=4')) {
  fail('Staff operation modals must layer above the mobile dock and keep save controls reachable')
} else {
  ok('Staff operation modals and sticky mobile save controls layer above the navigation dock')
}
if (!staffRedesignCss.includes('GC-STAFF-FEEDBACK-VISIBILITY-20261022') ||
    !staffRedesignCss.includes('z-index: 2147483647 !important') ||
    !staffRedesignCss.includes('bottom: calc(90px + env(safe-area-inset-bottom, 0px)) !important') ||
    !staff.includes('gc-staff-operations-redesign-20261022.css?v=4') ||
    !staffV5EnhancementLoader.includes("const href = '/gc-staff-operations-redesign-20261022.css?v=4'")) {
  fail('Staff success/error feedback must remain visible above the mobile dock')
} else {
  ok('Staff success/error feedback remains visible above the mobile dock')
}
if (!staffV5Script.includes("window.addEventListener('unhandledrejection'") ||
    !staffV5Script.includes('کردارەکە ئەنجام نەدرا') ||
    !staffV5Script.includes('lastStaffActionFailure')) {
  fail('Async staff actions must surface rejected click-handler errors to the operator')
} else {
  ok('Async staff action failures are visible instead of silent')
}
if (!staffV5Script.includes('window.gcStaffLoadTab = (tab, force=false)') ||
    staffV5Script.includes('button.disabled || event.defaultPrevented') ||
    !staffMobileDock.includes('const navigate = (tab)') ||
    !staffMobileDock.includes('window.gcStaffLoadTab(tab)') ||
    !staffMobileDock.includes("if (tab === 'land-manifests') return findNav(tab)?.click()") ||
    !staffV5EnhancementLoader.includes("'/gc-staff-mobile-dock-20261016.js?v=8'")) {
  fail('Mobile Staff OS navigation must call the tab loader directly instead of proxying clicks to hidden sidebar buttons')
} else {
  ok('Mobile Staff OS navigation directly invokes the tab loader and preserves the land-manifest handler')
}
if (!staffV5Script.includes('staffTabClickDelegationInstalled') ||
    !staffV5Script.includes("body.gc-staff-os-shell #app .gc-side .nav-btn[data-tab]") ||
    !staffV5Script.includes("button.dataset.tab === 'land-manifests'") ||
    staffV5Script.includes("document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click'")) {
  fail('Staff OS navigation must use a single resilient delegated handler without double binding')
} else {
  ok('Staff OS navigation uses a single delegated handler and leaves the manifest module in control')
}
if (!staffRedesignCss.includes('GC-STAFF-OPERATIONS-REDESIGN-20261022') ||
    !staffRedesignCss.includes('font-family: "Vazirmatn"') ||
    !staffRedesignCss.includes('.tower-hero') ||
    !staffRedesignCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr)) !important') ||
    !staff.includes('gc-staff-operations-redesign-20261022.css?v=4') ||
    !staffV5EnhancementLoader.includes("loadStyle('/gc-staff-operations-redesign-20261022.css?v=4')") ||
    !staffV5EnhancementLoader.includes("const href = '/gc-staff-operations-redesign-20261022.css?v=4'") ||
    !productionMiddleware.includes('finalOperationsRedesignLink') ||
    !productionMiddleware.includes("finalWorkspaceLink + finalOperationsRedesignLink + '</head>'")) {
  fail('Staff OS must load the final responsive operations redesign after all legacy CSS')
} else {
  ok('Staff OS final operations redesign overrides legacy CSS cascade')
}
if (!staffWorkspaceCss.includes('GC-STAFF-MOBILE-DASHBOARD-READABILITY-20261021') ||
    !staffWorkspaceCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr)) !important') ||
    !staff.includes('gc-staff-live-workspace-20261019.css?v=6') ||
    !staffV5EnhancementLoader.includes("const href = '/gc-staff-operations-redesign-20261022.css?v=4'")) {
  fail('Staff mobile dashboard must use the final compact card layout as the last-loaded workspace layer')
} else {
  ok('Staff mobile dashboard final layout is pinned after legacy CSS layers')
}
if (!staffV5Script.includes('<bdi dir="ltr">${money(income)}</bdi>') ||
    !staffV5Script.includes('<bdi dir="ltr">${number(x.count)} shipment') ||
    !staffV5Script.includes('class="mono" dir="ltr"><bdi dir="ltr">${esc(l.target_id')) {
  fail('Staff dashboard must isolate currencies, route totals and audit IDs from RTL text')
} else {
  ok('Staff dashboard values use explicit LTR/RTL isolation')
}
if (!publicShell.includes('gc-accessibility-mobile-20261021.css?v=1') || !staff.includes('gc-accessibility-mobile-20261021.css?v=1')) fail('Accessibility mobile viewport styles must be loaded by public and Staff OS shells');
else ok('Public and Staff OS load the short-viewport accessibility repair');
if (!publicShell.includes('id="gcMobileMenu"') || !publicShell.includes('aria-controls="gcMobileMenu"') || !publicShell.includes('aria-expanded="false"') || !publicShell.includes('role="navigation"') || !read('globall-redesign-20260922.js').includes("event.key === 'Escape'") || !read('globall-redesign-20260922.js').includes("setMobileMenuOpen(false, true)")) fail('Public mobile navigation needs accessible state, landmark, Escape close and focus restoration');
else ok('Public mobile navigation exposes state and keyboard dismissal');
if (!staffV5Script.includes('Globall Cloud Staff') || !staffV5Script.includes('document.title') || !read('gc-staff-land-manifest-20261018.js').includes("document.title='مانيفێستی دوبەی — Globall Cloud Staff'")) fail('Staff console document title must track the active view');
else ok('Staff document title follows the active panel and land manifest');

if (!staff.includes('gc-staff-command-system-20261017.css?v=2') || !staff.includes('gc-staff-polish-mobile-20261019.css?v=6') || !staff.includes('gc-staff-ui-refinement-20261019-v4.css?v=4') || !staff.includes('gc-staff-live-workspace-20261019.css?v=6') || !staff.includes('staff-os-v5-20261017.js?v=20261022-3') || !staff.includes('staff-os-v5-enhancement-loader-20261017.js?v=22') || !staff.includes('<body class="gc-staff-os-shell">') || !staffV5EnhancementLoader.includes("loadStyle('/gc-staff-polish-mobile-20261019.css?v=6')") || !staffV5EnhancementLoader.includes("loadStyle('/gc-staff-ui-refinement-20261019-v4.css?v=4')") || !staffV5EnhancementLoader.includes("const href = '/gc-staff-operations-redesign-20261022.css?v=4'")) fail('Staff OS final responsive design layer, cache-busted mobile dock, or scoped shell is missing')
else ok('Staff OS loads the scoped command-system design layer')
if (!read('gc-staff-live-workspace-20261019.css').includes('Locale-safe operations data and consistent dark/light workspace surfaces (v3).') || !read('gc-staff-live-workspace-20261019.css').includes('unicode-bidi: isolate') || !read('gc-staff-live-workspace-20261019.css').includes('html[data-gc-theme="dark"] body.gc-staff-os-shell #app .table-wrap') || !read('gc-staff-live-workspace-20261019.css').includes('html[data-gc-theme="dark"] body.gc-staff-os-shell .modal') || !read('gc-staff-live-workspace-20261019.css').includes('GC-STAFF-CONTROL-TOWER-PREMIUM-LAYER-V4')) fail('Staff workspace must support dark tables/dialogs and RTL/LTR data');
else ok('Staff workspace supports dark table/dialog surfaces and RTL/LTR data')
if (!staffV5Script.includes("storageKey: 'gc-staff-os-auth-v5-ahslifnthiwfkmaswjno'")) fail('Staff authentication storage must be isolated from customer portal sessions')
else ok('Staff and customer auth sessions use separate browser storage keys')
if (!staffV5Script.includes('const customerBridgePanel =') || !staffV5Script.includes('${customerBridgePanel}') || !staffV5Script.includes('CUSTOMER WORKSPACE · SHARED DATA')) fail('Staff overview must expose the live customer workspace integration panel')
else ok('Staff overview exposes customer account linkage and portal access')
if (!staff.includes('gc-staff-customer-bridge-20261019.js?v=1') || !staffCustomerBridgeScript.includes("SUPABASE_URL + '/functions/v1/account-admin'") || !staffCustomerBridgeScript.includes('identity_verified: true') || !staffCustomerBridgeScript.includes('confirmed_gc_code: confirmedCode') || !staffCustomerBridgeScript.includes('event.stopImmediatePropagation()')) fail('Staff customer-account bridge must call the protected Super Admin binding workflow with explicit identity checks')
else ok('Staff customer-account bridge delegates to the protected account-admin workflow with explicit identity checks')
if (!staffUnifiedStyles.includes('.gc-customer-bridge-panel') || !staffUnifiedStyles.includes('.gc-customer-bind-modal') || !staffUnifiedStyles.includes('@media (max-width: 760px)')) fail('Staff and customer workspaces must share responsive bridge and identity-linking styles')
else ok('Staff and customer workspace bridge styling is responsive and unified')
if (!staffV5Script.includes('receiptGpsBtn') || !staffV5Script.includes('navigator.geolocation.getCurrentPosition') || !staffV5Script.includes('name="photo_taken_at"') || !staffV5Script.includes('name="location_captured_at"')) fail('Staff warehouse intake must capture photo and GPS evidence with user consent')
else ok('Staff warehouse intake captures consent-based GPS and evidence timestamps')
if (!staffV5Script.includes('r.account_linked') || !staffV5Script.includes('customerAccountLinked') || !staffV5Script.includes('openReceiptCustomer')) fail('Warehouse receipt details must show login-link state and open its owner record')
else ok('Warehouse receipt details show account state and open the owning customer record')

const warehouseReceivingSource = read('supabase/functions/warehouse-receiving/index.ts')
const warehouseNotifySource = read('supabase/functions/warehouse-notify/index.ts')
const warehouseReceiptCartonsMigration = read('supabase/migrations/20261017185000_warehouse_receipt_cartons.sql')
const warehousePhotoBucketMigration = read('supabase/migrations/20261017195000_harden_warehouse_receipt_photo_bucket.sql')
const customerCartonManifestScript = read('gc-customer-carton-manifest-20261017.js')
const customerCartonManifestStyles = read('gc-customer-carton-manifest-20261017.css')
const staffCommandSystemStyles = read('gc-staff-command-system-20261017.css')
if (!warehouseReceivingSource.includes('MAX_RECEIPT_TOTAL_PHOTO_BYTES=48*1024*1024') || !warehouseReceivingSource.includes('photo_signing_warning:photoSigningWarning')) fail('Warehouse intake must bound uploads and report photo-link warnings without losing saved receipts')
else ok('Warehouse intake protects upload size and preserves saved receipts when signed-photo URLs fail')
if (!warehousePhotoBucketMigration.includes('file_size_limit = 12582912') || !warehousePhotoBucketMigration.includes('public IS FALSE') || !warehousePhotoBucketMigration.includes("'image/heic'")) fail('Private warehouse photo bucket safety migration is missing')
else ok('Private warehouse evidence storage enforces image type and size limits')
if (!staffCommandSystemStyles.includes('.gc-customer-bridge-panel') || !staffCommandSystemStyles.includes('@media (max-width: 760px)')) fail('Staff command UI must style the customer bridge and mobile controls')
else ok('Staff command UI includes the responsive customer integration panel')
if (!staffV5Script.includes('openReceiptCustomer') || !staffV5Script.includes('navigator.geolocation.getCurrentPosition')) fail('Staff receipt details must link the owning customer and support consent-based GPS capture')
else ok('Staff receipt management links to the owner record and supports consent-based GPS')
if (!staffV5Script.includes('const suffix=fullCode.match') || !staffV5Script.includes('fullCode.slice(0,suffix.index)') || !staffV5Script.includes('receipt.cartons||[]')) fail('Carton scanning must normalize the barcode to the owner GC code')
else ok('Carton scanning resolves the owning GC code before lookup')
if (!staffV5Script.includes('receipt-owner-routing-hint') || !staffCommandSystemStyles.includes('.receipt-owner-routing-hint')) fail('Warehouse intake must explain that every receipt belongs to one GC owner')
else ok('Warehouse intake UI makes per-GC owner assignment explicit')
if (!staffV5Script.includes("(['super_admin','admin'].includes(staffRole)?'':'Dubai')") || !staffV5Script.includes('یەکەم کۆگای وەرگرتن هەڵبژێرە')) fail('Admin and Super Admin must select the actual receiving warehouse explicitly')
else ok('Warehouse assignment cannot default silently for all-warehouse administrators')
const customerSelfWarehouseSource = read('supabase/functions/customer-self/index.ts')
const customerReceiptUiSource = read('gc-csp-scripts/customer-portal-inline-20261017.js')
const realtimeSource = read('gc-realtime-notifications-20261003.js')
if (!warehouseReceivingSource.includes('async function queueReceiptNotifications') || !warehouseReceivingSource.includes('submittedBatchCode') || !warehouseReceivingSource.includes('warehouse.receipt.created')) fail('Warehouse intake must link each GC receipt, use a unique batch, and audit the intake')
else ok('Warehouse intake has unique batches, customer linkage, and an audit record')
if (!warehouseNotifySource.includes('async function queueOutboxChannel') || !warehouseNotifySource.includes("['failed','cancelled'].includes") || !warehouseNotifySource.includes("timeZone: 'Asia/Baghdad'")) fail('Warehouse notifications must be idempotent, retry failed queue items, and use Erbil time')
else ok('Warehouse notification queue supports safe retries and local timestamps')
if (!customerSelfWarehouseSource.includes('secureWarehouseReceiptPhotos') || !customerSelfWarehouseSource.includes('createSignedUrls(paths, WAREHOUSE_RECEIPT_SIGNED_URL_TTL)') || !customerSelfWarehouseSource.includes('receipts:customerReceipts')) fail('Customer-self must sign private warehouse evidence URLs for the owner account')
else ok('Customer receipt evidence is owner-scoped and uses signed image URLs')
if (!customerReceiptUiSource.includes('warehouse-receipt-evidence') || !customerReceiptUiSource.includes('notification-open-action') || !customerReceiptUiSource.includes('item.photo_taken_at')) fail('Customer portal must show receipt evidence details and the notification action')
else ok('Customer portal displays warehouse location, timestamp, image evidence, and action links')
if (!read('index.html').includes('gc-realtime-notifications-20261003.js?v=4') || !realtimeSource.includes("page === '/' && Boolean(document.querySelector('#gcCustomerWorkspace'))")) fail('Root customer workspace must load the real-time notification bridge')
else ok('Root customer workspace subscribes to real-time account notifications')
if (!/^\[functions\.warehouse-receiving\]\s*verify_jwt\s*=\s*true$/m.test(read('supabase/config.toml')) || !/^\[functions\.warehouse-notify\]\s*verify_jwt\s*=\s*true$/m.test(read('supabase/config.toml'))) fail('Warehouse endpoints must continue requiring authenticated JWTs')
else ok('Warehouse receipt and notification endpoints keep JWT verification enabled')
if (warehouseReceivingSource.includes('created_at:receivedAt') || warehouseReceivingSource.includes('receipt.received_at||receipt.created_at')) fail('Warehouse receipt intake must only write schema-backed receipt timestamp fields')
else ok('Warehouse receipt intake uses only schema-backed receipt timestamps')
if (warehouseNotifySource.includes('received_at,created_at')) fail('Warehouse notification query must not select non-existent warehouse receipt created_at')
else ok('Warehouse notification query matches the live receipt schema')
if (!realtimeSource.includes('client.auth.onAuthStateChange') || !realtimeSource.includes("event === 'SIGNED_OUT'")) fail('Realtime subscriptions must follow login and clean up after logout')
else ok('Realtime subscriptions follow authentication state changes')
if (!staffV5EnhancementLoader.includes("'/gc-staff-mobile-dock-20261016.js?v=8'") || !staffV5EnhancementLoader.includes("loadStyle('/gc-staff-command-system-20261017.css?v=2')")) fail('Staff mobile icon script or final command layer is stale')
else ok('Staff enhancement loader applies the refreshed mobile navigation and final visual layer')
if (!staffMobileDock.includes("original.querySelector('.nav-icon svg')") || !staffMobileDock.includes('gc-staff-mobile-module-icon')) fail('Mobile staff module drawer must reuse the same SVG icons as the main navigation')
else ok('Mobile staff module drawer uses consistent SVG navigation icons')
if (!read('customer-portal.html').includes("window.location.replace('/#auth')") || read('customer-portal.html').includes('gc-csp-scripts/customer-portal-inline-1.js')) fail('Legacy customer portal must redirect to the unified customer entry')
else ok('Legacy customer portal redirects to the unified customer entry')
if (!read('functions/_middleware.js').includes('gc-account-entry.js?v=20261014-1')) fail('Customer GC login helper cache-buster is stale')
const customerGcLogin = read('supabase/functions/customer-gc-login/index.ts')
if (!customerGcLogin.includes('consume_public_message_rate_limit') || !customerGcLogin.includes('MAX_LOGIN_REQUESTS_PER_IP = 40') || !customerGcLogin.includes('MAX_LOGIN_REQUESTS_PER_IP_CODE = 8') || !customerGcLogin.includes('MAX_LOGIN_REQUESTS_PER_GC_CODE = 12') || !customerGcLogin.includes('originAllowed(req)')) fail('GC-code login must apply network/code rate limits and origin validation')
else ok('GC-code login applies server-side attempt limits and origin validation')
const unifiedCustomerAuth = read('gc-csp-scripts/customer-portal-inline-20261017.js')
const unifiedCustomerController = read('gc-unified-customer-experience-20261016.js')
if (!read('index.html').includes('gc-unified-customer-experience-20261016.js?v=20261017-1') || !unifiedCustomerController.includes("const normalizeHash =") || !unifiedCustomerController.includes("window.location.hash || '#auth'") || !unifiedCustomerController.includes("verifyExistingSession(hash === '#auth'")) fail('Unified root must open customer mode and normalize its starting route')
else ok('Root opens the unified customer workspace and guards authenticated sections')
if (!unifiedCustomerController.includes("const legacyRoutes = {") || !unifiedCustomerController.includes("'#public':'#overview'") || !unifiedCustomerController.includes("'#services':'#gcCustomerRouteOverview'") || !unifiedCustomerController.includes("'#request':'#newRequest'") || !unifiedCustomerController.includes("'#track':'#shipmentsSection'") || !unifiedCustomerController.includes("'#contact':'#support'")) fail('Legacy marketing routes must map into customer console views')
else ok('Legacy homepage actions map into the customer console')
if (unifiedCustomerController.includes('const syncPublicPageRoute =') || unifiedCustomerController.includes('setPublicMode')) fail('Obsolete public homepage route controller must be removed')
else ok('Legacy public home mode is not rendered by the unified shell')
if (!read('index.html').includes('gc-csp-scripts/customer-portal-inline-20261017.js?v=20261017-8')) fail('Unified customer login cache-buster is stale')
if (!customerPortalLogin.includes("if (billedKpi) billedKpi.textContent = formatBuckets(billed);") || !customerPortalLogin.includes("$('trackBtn')?.addEventListener") || !customerPortalLogin.includes("$('quoteBtn')?.addEventListener")) fail('Customer dashboard loading must tolerate optional finance and home-action elements')
else ok('Customer dashboard loading tolerates optional finance and home-action elements')
const customerSubmitHandlers = unifiedCustomerAuth.match(/\$\('authForm'\)\??\.addEventListener\('submit'/g) || []
if (customerSubmitHandlers.length !== 1 || !unifiedCustomerAuth.includes("$('authForm').addEventListener('submit', async (event) => {") || !unifiedCustomerAuth.includes('event.preventDefault();') || unifiedCustomerAuth.includes("$('signIn').click();")) fail('Customer login must use exactly one submit handler without programmatic resubmission')
else ok('Customer login form submits once and prevents native navigation')
const unifiedShell = read('index.html')
const unifiedController = read('gc-unified-customer-experience-20261016.js')
const customerStyleLoader = read('gc-public-customer-style-loader-20261014.js')
if (!unifiedShell.includes('<body class="gc-customer-app"') || !unifiedShell.includes('<div class="gc-app" id="gcApp" hidden>') || !unifiedShell.includes('<div id="gcCustomerWorkspace" data-gc-unified-customer="1">') || !unifiedShell.includes('<div id="auth" class="app-modal">') || unifiedShell.includes('<nav class="gc-mobile-dock-v3"')) fail('Root must open the integrated customer workspace without rendering the obsolete public homepage or dock')
else ok('Root opens the single customer workspace and no public mobile dock')
const customerShellToolbarStart = unifiedShell.indexOf('<section class="workspace-toolbar"')
const customerShellToolbarEnd = unifiedShell.indexOf('</section>', customerShellToolbarStart)
const customerShellToolbar = customerShellToolbarStart >= 0 && customerShellToolbarEnd >= 0 ? unifiedShell.slice(customerShellToolbarStart, customerShellToolbarEnd) : ''
const customerSettingsHub = read('gc-settings-hub.js')
if (!customerShellToolbar || customerShellToolbar.includes('data-dashboard-theme') || customerShellToolbar.includes('data-dashboard-language') || !customerSettingsHub.includes('id="gcSettingsTheme"') || !customerSettingsHub.includes('id="gcSettingsLanguage"')) fail('Language and appearance preferences must live only inside the dedicated Settings section')
else ok('Personal language and appearance preferences are available only inside Settings')
const customerPreferencesRuntime = read('gc-dashboard-preferences-20261003.js')
const mobileDockTabs = (unifiedShell.match(/data-dock-tab="(home|shipments|requests|notifications|settings)"/g) || [])
if (mobileDockTabs.length !== 5 || !unifiedShell.includes('gc-dashboard-preferences-20261003.js?v=20261017-3') || !customerPreferencesRuntime.includes("'#support':'requests'") || !customerPreferencesRuntime.includes("requestedKey === 'support' ? 'requests'") || !customerPreferencesRuntime.includes("new Set(nextHash === '#support' ? ['support'] : viewGroups[key])") || customerPreferencesRuntime.includes("support: ['support']")) fail('Customer navigation must keep exactly five tabs and open support as a Requests subview')
else ok('Customer navigation keeps five primary tabs with a focused Support subview')
const customerRequestUi = read('gc-customer-request-20261003.js')
const customerQuoteController = read('gc-csp-scripts/customer-portal-inline-20261017.js')
const requestFormStart = unifiedShell.indexOf('id="newRequest"')
const requestFieldsHtml = requestFormStart >= 0 ? unifiedShell.slice(requestFormStart, unifiedShell.indexOf('</form>', requestFormStart)) : ''
if (!unifiedShell.includes('gc-customer-request-20261003.js?v=20261017-3') || !requestFieldsHtml.includes('id="requestVolumeWrap"') || !requestFieldsHtml.includes('id="requestVolume"') || !customerRequestUi.includes('volumeInput.required = isSea') || !customerRequestUi.includes('volume_cbm: volume') || !customerRequestUi.includes("const volumeValid = mode === 'sea'")) fail('Customer shipment requests must collect CBM for sea freight and submit valid measurement units')
else ok('Customer shipment requests handle sea CBM and air/land kilograms')
if (!unifiedShell.includes('gc-csp-scripts/customer-portal-inline-20261017.js?v=20261017-8') || !customerQuoteController.includes('const syncQuoteMeasurements = () =>') || !customerQuoteController.includes('volume.required = isSea') || !customerQuoteController.includes('volume_cbm: volume') || !customerQuoteController.includes("const quantityValid = transportMode === 'sea'")) fail('Customer quotes must enforce the server quantity rule and submit null-safe weight/volume values')
else ok('Customer quotes enforce sea CBM versus air/land weight before submission')

const privateCargoPhotoRequest = read('gc-customer-request-20261003.js')
const privateCargoPhotoBackend = read('supabase/functions/customer-self/index.ts')
const privateCargoPhotoAdmin = read('supabase/functions/account-admin/index.ts')
const privateCargoPhotoStaff = read('staff-os-v5-20261017.js')
const privateCargoPhotoMigration = read('supabase/migrations/20261017130000_restrict_customer_request_photo_uploads.sql')
if (!unifiedShell.includes('id="requestImage"') || !unifiedShell.includes('gc-customer-request-20261003.js?v=20261017-4') || !privateCargoPhotoRequest.includes("storage?.from?.('customer-request-photos')") || !privateCargoPhotoRequest.includes('cargo_image_path: uploadedPath') || !privateCargoPhotoRequest.includes("remove?.([uploadedPath])")) fail('Customer shipment photos must upload privately, attach their path, and clean up rejected uploads')
else ok('Customer shipment requests upload optional private cargo photos')
if (!privateCargoPhotoBackend.includes("const CARGO_PHOTO_BUCKET = 'customer-request-photos'") || !privateCargoPhotoBackend.includes('cargo_image_path: cargoImagePath') || !privateCargoPhotoBackend.includes('pathParts[0] !== user.id') || !privateCargoPhotoBackend.includes('size > CARGO_PHOTO_MAX_BYTES')) fail('Customer backend must enforce cargo photo ownership and size')
else ok('Customer backend verifies private cargo photo ownership and size')
if (!privateCargoPhotoAdmin.includes('request_type,cargo_country,cargo_description,cargo_image_path') || !privateCargoPhotoStaff.includes('createSignedUrl(q.cargo_image_path, 300)') || !privateCargoPhotoStaff.includes('data-request-photo')) fail('Staff must see request metadata and preview private images through short-lived signed URLs')
else ok('Staff request inbox can preview private cargo photos through temporary URLs')
if (!privateCargoPhotoMigration.includes('file_size_limit = 10485760') || !privateCargoPhotoMigration.includes('allowed_mime_types')) fail('Private customer-photo bucket must enforce 10MB and image MIME limits')
else ok('Private customer-photo bucket enforces size and image MIME limits')



if (!unifiedController.includes("'#public':'#overview'") || !unifiedController.includes("'#services':'#gcCustomerRouteOverview'") || !unifiedController.includes("'#request':'#newRequest'") || !unifiedController.includes("'#contact':'#support'")) fail('Legacy marketing routes must map into customer console views')
if (!customerStyleLoader.includes('function ensureHomeDock() { return; }') || customerStyleLoader.includes('dock.innerHTML')) fail('Legacy public dock injector must remain disabled')
if (!read('gc-customer-workspace-elite-20261014.css').includes('body.gc-customer-app #gcWhatsAppFloat') || !read('gc-customer-workspace-elite-20261014.css').includes('body.gc-customer-app .gc-whatsapp-float')) fail('Floating marketing WhatsApp bubble must not overlap customer app navigation')
if (!unifiedShell.includes('gc-unified-customer-experience-20261016.js?v=20261017-1') || !unifiedShell.includes('gc-customer-workspace-elite-20261014.css?v=23') || !unifiedShell.includes('gc-customer-experience-signature-20261017.css?v=2') || !unifiedShell.includes('gc-public-customer-style-loader-20261014.js?v=24') || !unifiedShell.includes('gc-csp-scripts/customer-portal-inline-20261017.js?v=20261017-8')) fail('Customer-first app shell cache references are stale')
else ok('Customer-first app shell loads current assets')
const customerGcRegister = read('supabase/functions/customer-gc-register/index.ts')
const supabaseConfig = read('supabase/config.toml')
const legacyLoginPage = read('login.html')
const legacyRegisterPage = read('register.html')
const legacyAccessPage = read('customer-access.html')
const legacyPortalPage = read('customer-portal.html')
const legacyAuthRedirects = read('_redirects')
if (customerGcRegister.includes('SUPABASE_SERVICE_ROLE_KEY') || customerGcRegister.includes('createUser(') || customerGcRegister.includes('register_customer_with_gc') || !customerGcRegister.includes('CUSTOMER_REGISTRATION_DISABLED')) fail('Public customer registration must be disabled and must not create Auth users')
else ok('Public customer registration endpoint is retired without service-role account creation')
if (!supabaseConfig.includes('[functions.customer-gc-register]\nverify_jwt = true')) fail('Retired customer registration endpoint must require a valid JWT at the gateway')
else ok('Retired customer registration requires JWT verification')
if (!supabaseConfig.includes('[functions.customer-gc-login]\nverify_jwt = false') || !read('supabase/functions/customer-gc-login/index.ts').includes('signInWithPassword')) fail('GC-code customer login must remain available through its rate-limited credential flow')
else ok('GC-code login remains available through the dedicated credential flow')
for (const [label, page] of [['login.html', legacyLoginPage], ['register.html', legacyRegisterPage], ['customer-access.html', legacyAccessPage], ['customer-portal.html', legacyPortalPage]]) {
  if (!page.includes("window.location.replace('/#auth')") || page.includes('customer-gc-register')) fail(`Legacy ${label} must route to the unified customer entry without a separate auth flow`)
  else ok(`Legacy ${label} routes to the unified customer entry`)
}
for (const route of ['/login /#auth 302','/login/ /#auth 302','/login.html /#auth 302','/register /#auth 302','/register/ /#auth 302','/register.html /#auth 302','/customer-access /#auth 302','/customer-access/ /#auth 302','/customer-access.html /#auth 302']) {
  if (!legacyAuthRedirects.includes(route)) fail(`Legacy auth redirect missing: ${route}`)
}
if (!failures) ok('Legacy auth routes converge on the single customer page')
if (!read('tests/validate.mjs').includes('public customer registration endpoint is retired')) fail('Repository validator must guard against reintroducing public customer registration')
else ok('Repository validation guards the retired public registration endpoint')



if (!staff.includes('staff-os-v5-20261017.js?v=20261022-3')) fail('Staff structured cargo editor JavaScript cache-buster is stale')

const mobileLoader = read('staff-os-v5-enhancement-loader-20261017.js')
if (!staff.includes('staff-os-v5-enhancement-loader-20261017.js?v=22')) fail('Staff enhancement loader cache-buster is stale')
if (!staff.includes('data-gc-mobile-dock-preload="1"') || !staff.includes('/gc-staff-mobile-dock-20261016.css?v=5')) fail('Mobile dock CSS must be preloaded before the app initializes')
if (mobileLoader.indexOf("'/gc-staff-mobile-dock-20261016.js?v=8'") > mobileLoader.indexOf("'/staff-os-v5-shipment-create-fix.js?v=20260912-2'")) fail('Mobile navigation must initialize before optional staff bridges')
if (!mobileLoader.includes("loadStyle('/gc-staff-mobile-dock-20261016.css?v=5')") || !mobileLoader.includes("loadStyle('/gc-staff-command-system-20261017.css?v=2')") || !mobileLoader.includes("loadStyle('/gc-staff-polish-mobile-20261019.css?v=6')") || !mobileLoader.includes("const href = '/gc-staff-operations-redesign-20261022.css?v=4'")) fail('Staff responsive dock and final refinement cascade are missing')
const staffMobile = read('gc-staff-mobile-dock-20261016.css')
if (!staffMobile.includes('#app .customer-control-hero') || !staffMobile.includes('#app .customer-control-kpis') || !staffMobile.includes('#app .customer-control-toolbar')) fail('Staff Customer 360 workspace styles are incomplete')
if (!staffMobile.includes('#app .customer-control-table tbody>tr') || !staffMobile.includes('td:before{content:attr(data-label)')) fail('Staff customer rows must reflow into readable mobile cards')
if (!staffMobile.includes('@media (max-width: 760px)') || !staffMobile.includes('@media (max-width: 390px)')) fail('Staff customer responsive breakpoints are missing')

const operationsApi = read('supabase/functions/operations-v4/index.ts');
if (!operationsApi.includes(".range(offset,offset+safePageSize-1)") || !operationsApi.includes("{count:'exact'}") || !operationsApi.includes('page_size:safePageSize') || !operationsApi.includes('has_more:offset+items.length')) fail('Staff shipment API must provide a counted, bounded pagination contract');
if (!operationsApi.includes('pageRaw') || !operationsApi.includes('pageSizeRaw') || !operationsApi.includes("Math.min(500,pageSizeRaw)")) fail('Staff shipment API must validate requested page and cap page size');
const cargoUi = read('staff-os-v5.js')
if (!cargoUi.includes("ops('shipments', 'page=1&page_size=100')") || !cargoUi.includes('loadMoreShipments') || !cargoUi.includes('shipmentPager') || !cargoUi.includes('next.has_more')) fail('Staff shipment workspace must load more records without replacing previously loaded shipments');
const cargoControl = read('supabase/functions/staff-shipment-control/index.ts')
const cargoCreate = read('supabase/functions/staff-shipment-v5/index.ts')
const cargoCss = read('gc-shipment-detail-20261016.css')
if (!staff.includes('/gc-shipment-detail-20261016.css?v=3')) fail('Structured cargo editor CSS cache-buster is missing')
if (!cargoUi.includes('cargoItemEditorHTML') || !cargoUi.includes('collectCargoItems')) fail('Staff shipment editor must support structured cargo rows')
if (!cargoUi.includes('const hasStructuredCargo = Number(x.cargo_item_count || 0) > 0') || !cargoUi.includes('const cartonCount = hasStructuredCargo ? cargoCartons : Number(x.carton_count ?? x.box_count ?? x.items_count ?? 0)') || !cargoUi.includes('number(pieceCount)') || !cargoUi.includes('number(cartonCount)')) fail('Shipment cards must display structured cargo counts without treating zero as missing')
if (!cargoUi.includes('list="gcCargoCustomerCodes"') || !cargoUi.includes('ops(\'customers\').then')) fail('Shipment and cargo GC fields should suggest known customer codes')
if (!cargoUi.includes('if (!row.dataset.itemId && !itemName && !notes && quantity === 0 && boxes === 0 && weight === 0 && declared === 0) return;')) fail('Empty prefilled GC-code row must not block deleting all cargo items')
if (!cargoUi.includes("if (row.dataset.itemId) item.id = row.dataset.itemId;") || !cargoUi.includes("if (!itemName) throw new Error('ناوی کاڵا بۆ هەر ڕیزی پڕکراو پێویستە.');")) fail('Existing cargo rows must not silently disappear from updates when their names are cleared')
if (!cargoUi.includes('d.cargo_items = collectCargoItems') || !cargoUi.includes('deleted_cargo_item_ids')) fail('Staff shipment save must submit cargo edits and explicit removals')
if (!cargoCreate.includes('normalizeCargoRows') || !cargoCreate.includes("from('shipment_cargo_items').insert(cargoRows)")) fail('Shipment creation must persist structured cargo rows')
if (!cargoCreate.includes("A valid GC customer code is required") || !cargoCreate.includes('Invalid transport mode')) fail('Shipment creation must validate customer GC codes and transport mode')
if (!cargoCreate.includes('nonNegativeNumber') || !cargoCreate.includes("'actual weight'") || !cargoCreate.includes("'carton count'") || !cargoCreate.includes("'total amount'")) fail('Shipment creation must reject negative or invalid logistics measurements and amounts')
if (!cargoCreate.includes('const status=/unauthorized/i.test(message)?401') || !cargoCreate.includes('/required|requires|needs|invalid|at most|cannot|must be/i.test(message)?400:500')) fail('Shipment creation must return client validation errors as HTTP 400, not HTTP 500')
if (!cargoControl.includes('normalizeCargoRows') || !cargoControl.includes("from('shipment_cargo_items').update(record)") || !cargoControl.includes("from('shipment_cargo_items').delete()")) fail('Shipment control must safely update and remove structured cargo rows')
if (cargoControl.indexOf('Operational permission required') > cargoControl.indexOf('const hasCargoItems')) fail('Shipment control must authorize staff before loading cargo rows')
if (cargoControl.indexOf('Operational permission required') > cargoControl.indexOf("from('shipments').select('*')")) fail('Shipment control must authorize staff before reading shipment records')
if (!cargoControl.includes('requires|needs|Invalid|invalid|at most|cannot|must be|not found/i.test(message) ? 400 : 500')) fail('Shipment control must return cargo validation failures as HTTP 400')
if (!cargoControl.includes('patch.carton_count = totalBoxes') || cargoControl.includes('if (liveItems.length > 0) patch.carton_count = totalBoxes')) fail('Cargo carton aggregate must be set to zero when all cargo rows are removed')
if (!cargoControl.includes("GC customer code not found: ' + item.customer_gc_code")) fail('Cargo edits must reject unknown GC customer codes')
if (!cargoCreate.includes("GC customer code not found: '+item.customer_gc_code") || !cargoCreate.includes("if(!q.data)return out(req,{error:'Customer GC code not found'},404)")) fail('Shipment creation must reject customer codes that are not in the directory')
if (!cargoCreate.includes('/customer gc code not found/i.test(message)?404')) fail('Unknown customer GC codes must return HTTP 404')
if (!cargoCss.includes('.cargo-item-row') || !cargoCss.includes('@media (max-width: 390px)')) fail('Structured cargo editor responsive styles are missing')
if (!failures) ok('Structured cargo editor, server persistence, authorization and responsive contracts OK')

const customerWarehouseHtml = read('index.html')
const customerWarehouseCss = read('gc-customer-warehouse-evidence-20261017.css')
const customerWarehouseReceiving = read('supabase/functions/warehouse-receiving/index.ts')
const customerWarehouseNotify = read('supabase/functions/warehouse-notify/index.ts')
const customerWarehouseMigration = read('supabase/migrations/20261017181111_fix_warehouse_receipt_customer_notifications.sql')
const customerWarehouseRouteMigration = read('supabase/migrations/20261017181944_fix_warehouse_receipt_portal_route.sql')
const customerWarehousePreferenceMigration = read('supabase/migrations/20261017182723_warehouse_receipt_respect_in_app_preferences.sql')
const customerSelfSourceForReceiptEvidence = read('supabase/functions/customer-self/index.ts')
if (!customerWarehouseHtml.includes('id="receipts"') || !customerWarehouseHtml.includes('gc-customer-warehouse-evidence-20261017.css?v=1')) fail('Customer portal must render a dedicated warehouse receipt evidence panel')
else ok('Customer portal has a styled warehouse receipt evidence destination')
if (!customerWarehouseCss.includes('.warehouse-receipt-evidence') || !customerWarehouseCss.includes('.receipt-photo')) fail('Customer warehouse evidence responsive styles are incomplete')
if (!customerSelfSourceForReceiptEvidence.includes(".from('warehouse_receipts')") || !customerSelfSourceForReceiptEvidence.includes('secureWarehouseReceiptPhotos')) fail('Customer self API must return owner-scoped warehouse receipts with signed private photos')
if (!customerWarehouseReceiving.includes("const actionUrl='/#records'") || !customerWarehouseNotify.includes("const actionUrl = '/#records'")) fail('Warehouse alerts must link directly to the customer records/evidence section')
if (!customerWarehouseMigration.includes('ON CONFLICT (customer_user_id, event_key) DO NOTHING') || !customerWarehouseMigration.includes("'/#records'")) fail('Warehouse notification trigger must use the valid per-customer idempotency key and portal route')
else ok('Warehouse receipt notification trigger is idempotent and opens customer records')
if (!customerWarehouseRouteMigration.includes("'/#records'") || !customerWarehouseRouteMigration.includes('ON CONFLICT (customer_user_id, event_key) DO NOTHING')) fail('Final receipt notification route migration is missing or inconsistent')
else ok('Final database trigger route matches the customer portal router')
if (!customerWarehousePreferenceMigration.includes('COALESCE(p.in_app_enabled, TRUE)') || !customerWarehousePreferenceMigration.includes('v_in_app_enabled IS FALSE')) fail('Warehouse receipt trigger must respect customer in-app notification preferences')
else ok('Warehouse receipt trigger respects customer in-app notification preferences')

const cartonManifestMigration = read('supabase/migrations/20261017185000_warehouse_receipt_cartons.sql')
const cartonManifestReceiving = read('supabase/functions/warehouse-receiving/index.ts')
const cartonManifestNotify = read('supabase/functions/warehouse-notify/index.ts')
const cartonManifestCustomerSelf = read('supabase/functions/customer-self/index.ts')
const cartonManifestStaff = read('staff-os-v5-20261017.js')
const cartonManifestCustomerUi = read('gc-customer-carton-manifest-20261017.js')
const cartonManifestStaffTools = read('gc-staff-carton-tools-20261017.js')
if (!cartonManifestMigration.includes('CREATE TABLE IF NOT EXISTS public.warehouse_receipt_cartons') || !cartonManifestMigration.includes('ENABLE ROW LEVEL SECURITY') || !cartonManifestMigration.includes('REVOKE ALL ON TABLE public.warehouse_receipt_cartons FROM PUBLIC, anon, authenticated')) fail('Individual carton manifest must be RLS-protected from direct public/authenticated table access')
else ok('Individual carton manifest schema and direct access restrictions are present')
if (!cartonManifestReceiving.includes('ensureReceiptCartons') || !cartonManifestReceiving.includes('carton_code') || !cartonManifestReceiving.includes('Shipment') || !cartonManifestReceiving.includes('cartons_linked')) fail('Warehouse intake must record per-carton codes and guard shipment ownership')
else ok('Warehouse intake records each carton and returns explicit shipment-link status')
if (!cartonManifestCustomerSelf.includes("from('warehouse_receipt_cartons')") || !cartonManifestCustomerSelf.includes(".eq('customer_directory_id', customer.id)") || !cartonManifestCustomerSelf.includes('cartonsByReceipt.get(String(receipt.id))')) fail('Customer self API must scope carton rows to the signed-in GC owner')
else ok('Customer self API scopes carton manifests to the owning customer directory')
if (!cartonManifestNotify.includes('carton_codes: cartonCodes') || !cartonManifestNotify.includes('cartonSummary') || !cartonManifestReceiving.includes('carton_codes:cartonCodes')) fail('Warehouse notification payload must include unique carton labels')
else ok('In-app and external notification payloads include individual carton codes')
if (!cartonManifestCustomerUi.includes('gc:customer-loaded') || !cartonManifestCustomerUi.includes('warehouse-carton-manifest') || !cartonManifestCustomerUi.includes('textContent')) fail('Customer portal must render the per-carton manifest safely')
else ok('Customer portal renders individual carton codes from its customer-scoped payload')
if (!cartonManifestStaff.includes('warehouse-carton-manifest-card') || !cartonManifestStaffTools.includes('CODE128') || !staff.includes('gc-staff-carton-tools-20261017.js?v=2')) fail('Staff carton detail and printable barcode tools are missing')
else ok('Staff console exposes carton details and Code 128 label printing')
if (!publicShell.includes('gc-customer-carton-manifest-20261017.css?v=1') || !publicShell.includes('gc-customer-carton-manifest-20261017.js?v=1')) fail('Public customer page must load the individual carton manifest UI and styles')
else ok('Customer portal loads the carton manifest UI and responsive styles')
if (!publicShell.includes('gc-customer-experience-signature-20261017.css?v=3') || !publicShell.includes('gc-csp-scripts/customer-portal-inline-20261017.js?v=20261019-1')) fail('Dubai receipt alert CSS/JS assets must use fresh immutable-cache URLs')
else ok('Dubai receipt alert assets use cache-busted URLs')
if (!privateCargoPhotoStaff.includes("const availableLocations=roleLocation[state.staff?.role]?[roleLocation[state.staff.role]]:['China','Dubai','Erbil','USA'];")) fail('Staff receipt form must limit branch-scoped warehouse staff to their authorized location')
else ok('Warehouse receipt location options respect branch-scoped staff roles')

const dubaiReceiptDispatch = read('supabase/functions/notification-dispatch/index.ts')
const dubaiReceiptReceiving = read('supabase/functions/warehouse-receiving/index.ts')
const dubaiReceiptNotify = read('supabase/functions/warehouse-notify/index.ts')
const dubaiReceiptStaff = read('staff-os-v5-20261017.js')
const dubaiReceiptCustomerUi = read('gc-csp-scripts/customer-portal-inline-20261017.js')
const dubaiReceiptCustomerSelf = read('supabase/functions/customer-self/index.ts')
const dubaiReceiptCustomerStyles = read('gc-customer-experience-signature-20261017.css')
if (!dubaiReceiptReceiving.includes('if(!isDubaiWarehouse){') || !dubaiReceiptReceiving.includes('not_applicable:true') || !dubaiReceiptReceiving.includes('body:detailedBodyText') || !dubaiReceiptReceiving.includes("notificationStatus=!isDubaiReceipt?'not_applicable'")) fail('Customer receipt alerts must only be created for Dubai warehouse receipts and show the detailed receipt summary')
else ok('Warehouse intake only notifies on Dubai receipts and stores a detailed in-app message')
if (!dubaiReceiptNotify.includes('if (!isDubaiLocation(receiptLocation))') || !dubaiReceiptNotify.includes('notification: { not_applicable: true') || !dubaiReceiptNotify.includes('body: bodyText')) fail('Manual notification retry must be Dubai-only and reuse the detailed receipt body')
else ok('Manual notification retries enforce Dubai-only delivery and detailed receipt content')
if (!dubaiReceiptDispatch.includes("startsWith('warehouse_received:')") || !dubaiReceiptDispatch.includes('!isDubaiLocation(sourceLocation)') || !dubaiReceiptDispatch.includes("status:'cancelled'") || !dubaiReceiptDispatch.includes('non_dubai_receipt')) fail('External dispatcher must cancel stale queued receipt messages for non-Dubai warehouses')
else ok('External dispatcher cancels old non-Dubai receipt messages before provider delivery')
if (!dubaiReceiptStaff.includes('notification_status===\'not_applicable\'') || !dubaiReceiptStaff.includes('disabled title="ئاگادارکردنەوە تەنها بۆ receipt ـی دوبەیە"') || !dubaiReceiptStaff.includes('isDubaiLocation(x.location||x.source_warehouse||x.warehouse)&&x.notification_status===\'pending\'')) fail('Staff console must block non-Dubai retry and exclude non-Dubai receipts from pending notification counts')
else ok('Staff console shows not-applicable status and only counts Dubai notification work')
if (!dubaiReceiptCustomerUi.includes("String(item.body || '').trim()") || !dubaiReceiptCustomerUi.includes('style="white-space:pre-line"')) fail('Customer alerts must display the detailed notification body with readable line breaks')
else ok('Customer activity feed renders the detailed receipt message accessibly')
if (!dubaiReceiptCustomerSelf.includes('receiptsById.get(eventKey.slice(prefix.length))') || !dubaiReceiptCustomerSelf.includes('if (!isDubai) return []') || !dubaiReceiptCustomerSelf.includes('receipt_photos: photos') || !dubaiReceiptCustomerSelf.includes('hasDetailedBody ? existingBody : detailedBody')) fail('Customer self API must surface only owner-linked Dubai receipt notifications with private signed photos and detailed body text')
else ok('Customer self API links Dubai notifications only to owner-matched receipts and signed photos')
if (!dubaiReceiptCustomerUi.includes('item.receipt_photos') || !dubaiReceiptCustomerUi.includes('gc-notification-photo-strip') || !dubaiReceiptCustomerUi.includes('receipt_photo_count')) fail('Customer notification cards must render the linked receipt photo thumbnails')
else ok('Customer notification cards display receipt photo thumbnails')
if (!dubaiReceiptCustomerStyles.includes('.gc-notification-photo-strip') || !dubaiReceiptCustomerStyles.includes('.gc-notification-photo-thumb') || !dubaiReceiptCustomerStyles.includes('.gc-notification-photo-more')) fail('Customer notification receipt-photo strip requires responsive accessible styles')
else ok('Customer notification photo strip has responsive styling and a high-contrast keyboard focus state')
if (!staffV5Script.includes('data-process-in-app-outbox') || !staffV5Script.includes("action:'process_outbox'") || !staffV5Script.includes("item.channel === 'in_app'") || !staffV5Script.includes("action:'cancel_outbox'") || !staffV5Script.includes('ageHours(item) >= 24') || !staffV5Script.includes('gcOutboxConfirmProcess') || !read('supabase/functions/logistics-control-plane/index.ts').includes("action === 'cancel_outbox'") || !read('supabase/functions/logistics-control-plane/index.ts').includes("found.data.channel !== 'in_app'")) fail('Staff notification queue must provide a role-protected in-app-only manual processor')
if (!staffV5Script.includes('data-customer-status-filter="unlinked"') || !staffV5Script.includes("await loadTab(x.dataset.jump)") || !staffV5Script.includes("status.dispatchEvent(new Event('change',{bubbles:true}))")) fail('Staff customer bridge must open the unlinked-account filter from the command center')
if (!staffV5Script.includes('const severityLabel =') || !staffV5Script.includes('id="alertSearch"') || !staffV5Script.includes('id="alertReadFilter"') || !staffV5Script.includes('id="alertSeverityFilter"')) fail('Staff Alert Center must expose search, read-state, and severity filters')
else ok('Staff Alert Center has searchable read-state and severity filters')
if (!staffV5Script.includes('name="audience_role"') || !staffV5Script.includes('audience_role: text(data.audience_role) || null') || !staffV5Script.includes("const canCreate = ['super_admin', 'admin']")) fail('Staff alert creation must support role-targeting and restrict the composer to administrators')
else ok('Staff alert creation supports role-targeting and hides write controls from non-admin roles')
if (!staffV5Script.includes("ROLES.filter((role) => role !== 'driver')")) fail('Staff alert audience options must match the backend staff-role allowlist')
else ok('Staff alert audience choices exclude unsupported driver-only roles')
if (!staffV5Script.includes('button.disabled = true') || !staffV5Script.includes('current.read_by = existing') || !staffV5Script.includes('renderList();')) fail('Staff alert read action must prevent duplicate submissions and update the local read state')
else ok('Staff alert read action updates local state and prevents duplicate submissions')
if (!staff.includes('staff-os-v5-20261017.js?v=20261022-3') || !staff.includes('gc-staff-console-elite-20261018.css?v=6')) fail('Staff Alert Center release must use new immutable-cache asset URLs')
else ok('Staff Alert Center assets use cache-busted URLs')
console.log('')
if (failures) { console.error(`${failures} production contract check(s) failed.`); process.exit(1) }
console.log('All production contract checks passed.')
