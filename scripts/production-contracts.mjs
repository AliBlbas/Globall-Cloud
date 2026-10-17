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
  'index.html','login.html','register.html','customer-access.html','sw.js,'gc-production-ui-20260927.css','production-bridge.js','runtime-guard.js','_headers','_redirects','functions/api/health.js','functions/api/ready.js','public-route-bootstrap.js','public-runtime-guarantee.js',
  'public-staff-guard-20260909.js','public-premium-mobile-20260909.css','public-premium-mobile-20260909.js','tracking-integration.html','tracking-intelligence.js',
  'tracking-intelligence.css','customer-portal.html','warehouse-os.html','driver-workspace.html','staff-os-v5.html','staff-os-v5.css','staff-os-v5.js',
  'staff-os-v5-rescue.js','staff-logistics-intelligence.css','staff-logistics-intelligence.js','staff-mobile-command-dock.css','staff-mobile-command-dock.js',
  'staff-os-pro-20260909.css','staff-os-pro-20260909.js','staff-shell-polish-20260909.css','staff-shell-polish-20260909.js',
  'staff-premium-mobile-20260909.css','staff-premium-mobile-20260909.js','warehouse-offline-sync.js','production-mobile-ux-v2026.css','gc-platform-vnext.js',
  'gc-platform-vnext-plus.js','gc-runtime-safety-v2026.js','production-brand-repair.js','gc-csp-scripts/logistics-pricing-ui.js','supabase/config.toml',
  'package.json','gc-account-entry.js','gc-csp-scripts/customer-portal-inline-1.js','supabase/functions/_shared/service-key.ts','supabase/functions/logistics-control-plane/index.ts',
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
const staffLoader = read('staff-os-v5-enhancement-loader.js')
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
if (!read('index.html').includes('gc-customer-workspace-elite-20261014.css?v=19')) fail('Unified customer workspace UI layer is not loaded')
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
const customerPortalLogin = read('gc-csp-scripts/customer-portal-inline-1.js')
const customerAccountEntry = read('gc-account-entry.js')
if (!customerPortalLogin.includes('/functions/v1/customer-gc-login') || !customerPortalLogin.includes('sb.auth.setSession')) fail('Customer portal must authenticate GC codes via customer-gc-login and persist the returned session')
else ok('GC-code sign-in uses the dedicated Edge Function and stores the Supabase session')
if (!customerAccountEntry.includes("email.setAttribute('type', 'text')")) fail('Customer login identifier must accept GC codes without email-type validation')
else ok('Customer login input accepts GC codes')
if (!read('customer-portal.html').includes("window.location.replace('/#auth')") || read('customer-portal.html').includes('gc-csp-scripts/customer-portal-inline-1.js')) fail('Legacy customer portal must redirect to the unified customer entry')
else ok('Legacy customer portal redirects to the unified customer entry')
if (!read('functions/_middleware.js').includes('gc-account-entry.js?v=20261014-1')) fail('Customer GC login helper cache-buster is stale')
const customerGcLogin = read('supabase/functions/customer-gc-login/index.ts')
if (!customerGcLogin.includes('consume_public_message_rate_limit') || !customerGcLogin.includes('MAX_LOGIN_REQUESTS_PER_IP = 40') || !customerGcLogin.includes('MAX_LOGIN_REQUESTS_PER_IP_CODE = 8') || !customerGcLogin.includes('MAX_LOGIN_REQUESTS_PER_GC_CODE = 12') || !customerGcLogin.includes('originAllowed(req)')) fail('GC-code login must apply network/code rate limits and origin validation')
else ok('GC-code login applies server-side attempt limits and origin validation')
const unifiedCustomerAuth = read('gc-csp-scripts/customer-portal-inline-1.js')
if (!read('index.html').includes('gc-csp-scripts/customer-portal-inline-1.js?v=20261016-9')) fail('Unified customer login cache-buster is stale')
if (!unifiedCustomerAuth.includes("$('authForm').addEventListener('submit', async (event) => {") || !unifiedCustomerAuth.includes('event.preventDefault();') || unifiedCustomerAuth.includes("$('signIn').addEventListener('click'")) fail('Customer login must prevent native form navigation and support form submission')
else ok('Customer login is handled as a prevented form submission')
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



if (!staff.includes('staff-os-v5.js?v=20261016-19')) fail('Staff structured cargo editor JavaScript cache-buster is stale')

const mobileLoader = read('staff-os-v5-enhancement-loader.js')
if (!staff.includes('staff-os-v5-enhancement-loader.js?v=20261016-7')) fail('Staff enhancement loader cache-buster is stale')
if (!staff.includes('data-gc-mobile-dock-preload="1"') || !staff.includes('/gc-staff-mobile-dock-20261016.css?v=4')) fail('Mobile dock CSS must be preloaded before the app initializes')
if (mobileLoader.indexOf("'/gc-staff-mobile-dock-20261016.js?v=2'") > mobileLoader.indexOf("'/staff-os-v5-shipment-create-fix.js?v=20260912-2'")) fail('Mobile navigation must initialize before optional staff bridges')
if (!mobileLoader.includes("loadStyle('/gc-staff-mobile-dock-20261016.css?v=4')")) fail('Mobile dock CSS must remain the final responsive override')
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

console.log('')
if (failures) { console.error(`${failures} production contract check(s) failed.`); process.exit(1) }
console.log('All production contract checks passed.')
