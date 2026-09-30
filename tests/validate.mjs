#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, relative } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let failures = 0
const fail = (msg) => { console.error(`  ✗ ${msg}`); failures++ }
const ok = (msg) => console.log(`  ✓ ${msg}`)
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

function walk(dir, exts = null, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules' || entry === '.wrangler' || entry === '.pages-dist') continue
    const p = join(dir, entry)
    let s
    try { s = statSync(p) } catch { continue }
    if (s.isDirectory()) walk(p, exts, out)
    else if (!exts || exts.includes(extname(p))) out.push(p)
  }
  return out
}

console.log('JavaScript syntax')
const jsFiles = walk(ROOT, ['.js'])
for (const f of jsFiles) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }) }
  catch (e) { fail(`${relative(ROOT, f)}\n${e.stderr?.toString().trim() || e.message}`) }
}
if (!failures) ok(`${jsFiles.length} JavaScript files OK`)

console.log('TypeScript syntax')
let ts
try { ts = await import('typescript') } catch { fail('TypeScript validator unavailable; run npm ci before validation') }
if (ts) {
  const compiler = ts.default || ts
  const tsFiles = walk(join(ROOT, 'supabase', 'functions'), ['.ts'])
  const before = failures
  for (const f of tsFiles) {
    const result = ts.transpileModule(readFileSync(f, 'utf8'), {
      compilerOptions: { target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext },
      reportDiagnostics: true,
    })
    const errs = (result.diagnostics || []).filter((d) => d.category === compiler.DiagnosticCategory.Error)
    if (errs.length) fail(`${relative(ROOT, f)}: ${errs.map((d) => compiler.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`)
  }
  if (failures === before) ok(`${tsFiles.length} TypeScript files OK`)
}

console.log('Required production files')
const required = [
  'index.html','sw.js','gc-production-ui-20260927.css','production-bridge.js','runtime-guard.js','_headers','_redirects','functions/api/health.js','functions/api/ready.js',
  'public-route-bootstrap.js','public-runtime-guarantee.js','public-staff-guard-20260909.js','public-premium-mobile-20260909.css','public-premium-mobile-20260909.js',
  'tracking-integration.html','tracking-intelligence.js','tracking-intelligence.css','customer-portal.html','warehouse-os.html','driver-workspace.html',
  'staff-os-v5.html','staff-os-v5.css','staff-os-v5.js','staff-os-v5-rescue.js','staff-logistics-intelligence.js','staff-logistics-intelligence.css',
  'staff-mobile-command-dock.css','staff-mobile-command-dock.js','staff-os-pro-20260909.css','staff-os-pro-20260909.js',
  'staff-shell-polish-20260909.css','staff-shell-polish-20260909.js','staff-premium-mobile-20260909.css','staff-premium-mobile-20260909.js',
  'warehouse-offline-sync.js','gc-platform-vnext.js','gc-platform-vnext-plus.js','gc-runtime-safety-v2026.js','production-brand-repair.js',
  'supabase/config.toml','package.json','scripts/production-contracts.mjs','tests/e2e/run.mjs',
  'supabase/functions/_shared/service-key.ts','supabase/functions/logistics-control-plane/index.ts',
  'supabase/functions/notification-dispatch/index.ts','supabase/functions/warehouse-receiving/index.ts','supabase/functions/warehouse-notify/index.ts',
  'supabase/functions/staff-ops-hub/index.ts','supabase/functions/staff-analytics/index.ts','supabase/functions/invoice-ai/index.ts',
  'supabase/functions/customer-debt-assistant/index.ts','supabase/functions/fx-refresh/index.ts','supabase/functions/_shared/payment-providers.ts',
]
const beforeReq = failures
for (const rel of required) if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`)
if (failures === beforeReq) ok(`${required.length} critical files present`)

console.log('Production project reference')
const config = read('supabase/config.toml')
if (!/^project_id\s*=\s*"ahslifnthiwfkmaswjno"$/m.test(config)) fail('supabase/config.toml is not pinned to production')
const runtimeFiles = walk(ROOT, ['.js','.mjs','.ts','.tsx','.html','.css','.json','.toml'])
const staleProjectRef = ['swptm', 'hhwhdtyrrfzetam'].join('')
let staleHits = 0
for (const f of runtimeFiles) {
  const text = readFileSync(f, 'utf8')
  if (text.includes(staleProjectRef)) { staleHits++; fail(`stale Supabase project reference in ${relative(ROOT, f)}`) }
}
if (!staleHits) ok('Live Supabase reference is consistent')

console.log('Public integration guards')
const publicShell = read('index.html')
const publicIndex = read('gc-csp-scripts/index-inline-2.js')
const publicBootstrap = read('public-route-bootstrap.js')
const publicRuntime = read('public-runtime-guarantee.js')
const configContracts = [
  ['customer-self requires JWT verification', /^\[functions\.customer-self\]\s*verify_jwt\s*=\s*true$/m.test(config)],
  ['public-health is public', /^\[functions\.public-health\]\s*verify_jwt\s*=\s*false$/m.test(config)],
]
for (const [label, passed] of configContracts) if (!passed) fail(label)
if (configContracts.every(([, passed]) => passed)) ok('Auth function JWT contracts aligned')

const guards = [
  ['quote uses public-quote', publicIndex.includes('functions/v1/public-quote')],
  ['quote avoids direct shipment write', !/from\([\'"]shipments[\'"]\)\.insert|saveShipment/.test(publicIndex)],
  ['contact uses public-message', publicIndex.includes('functions/v1/public-message')],
  ['contact avoids direct messages insert', !/from\([\'"]messages[\'"]\)\.insert/.test(publicIndex)],
  ['production bridge uses live project', read('production-bridge.js').includes('ahslifnthiwfkmaswjno.supabase.co')],
  ['ready endpoint uses public-health', read('functions/api/ready.js').includes('/functions/v1/public-health')],
  ['health endpoint is present', existsSync(join(ROOT, 'functions/api/health.js'))],
  ['staff route is isolated', read('_redirects').includes('/staff /staff-os-v5.html 200')],
  ['staff entry has final mobile shell', /gc-staff-final-20260922\.js\?v=/.test(read('staff-os-v5.html'))],
  ['staff entry has no competing legacy mobile JS', !/staff-reference-mobile-20260922\.js\?v=|staff-premium-mobile-20260909\.js\?v=/.test(read('staff-os-v5.html'))],
  ['staff loader has no legacy mobile command dock', !/staff-mobile-command-dock\.js\?v=/.test(read('staff-os-v5-enhancement-loader.js'))],
  ['active homepage uses current experience script', publicShell.includes('/globall-redesign-20260922.js')],
  ['public production UI layer loaded', publicShell.includes('/gc-production-ui-20260927.css?v=1')],
  ['staff production UI layer loaded', read('staff-os-v5.html').includes('/gc-production-ui-20260927.css?v=1')],
  ['customer production UI layer loaded', read('customer-portal.html').includes('/gc-production-ui-20260927.css?v=1')],
  ['active homepage avoids legacy monolithic script', !publicShell.includes('gc-csp-scripts/index-inline-2.js')],
  ['public bootstrap loads runtime guarantee', publicBootstrap.includes('/public-runtime-guarantee.js')],
  ['public runtime has emergency fallback', publicRuntime.includes('renderEmergencyShell')],
]
for (const [label, passed] of guards) if (!passed) fail(label)
if (!failures) ok('Public and Staff integration guards OK')

console.log('Customer API request handling')
const customerSelf = read('supabase/functions/customer-self/index.ts')
const customerSelfBodyParses = [...customerSelf.matchAll(/await req\.json\(\)/g)].length
if (customerSelfBodyParses !== 1) fail(`customer-self must parse the request body once; found ${customerSelfBodyParses} parses`)
else ok('customer-self parses the request body once')

console.log('Customer profile edit flow')
const customerAccount = read('gc-customer-account-20260923.js')
const profileSave = customerAccount.match(/async function saveProfile\(\)\s*\{([\s\S]*?)\n\s*async function changePassword\(/)?.[1] || ''
const profileRenderAt = profileSave.indexOf('render()')
const statusAfterRenderAt = profileSave.indexOf("const savedStatus = $('#gcProfileMsg')", profileRenderAt)
const profileEditChecks = [
  ['customer portal loads the account editor', read('customer-portal.html').includes('/gc-customer-account-20260923.js?v=')],
  ['profile save calls the supported update_profile action', profileSave.includes("action: 'update_profile'") && customerSelf.includes("action === 'update_profile'")],
  ['profile success status is restored after render', profileRenderAt >= 0 && statusAfterRenderAt > profileRenderAt],
  ['profile save clears busy state on the current button', profileSave.includes("const currentButton = $('#gcSaveProfile') || button;") && profileSave.includes("currentButton.removeAttribute('aria-busy')")],
]
for (const [label, passed] of profileEditChecks) if (!passed) fail(label)
if (profileEditChecks.every(([, passed]) => passed)) ok('Customer profile edit UI/backend feedback contract OK')

console.log('Staff customer management edit permissions')
const staffUi = read('staff-os-v5.js')
const staffCustomerEdit = staffUi.match(/function editCustomer\(id\) \{([\s\S]*?)\n  async function customerCode/)?.[1] || ''
const accountAdmin = read('supabase/functions/account-admin/index.ts')
const updateCustomer = accountAdmin.match(/async function updateCustomer\([\s\S]*?\n}\n\nasync function archiveCustomer/)?.[0] || ''
const staffCustomerEditChecks = [
  ['customer editor calls the account-admin update action', staffCustomerEdit.includes("account('customer', 'update', d)")],
  ['email and masked password controls are Super Admin-only', staffCustomerEdit.includes("state.staff?.role === 'super_admin'") && staffCustomerEdit.includes('name="password" type="password"') && staffCustomerEdit.includes('Email changes require Super Admin')],
  ['backend permits unchanged email while protecting identity changes', updateCustomer.includes('const emailChanged =') && updateCustomer.includes("!actor.isSuperAdmin && (emailChanged || txt(payload.password) !== null || codeChanged)") && updateCustomer.includes("select('id,auth_user_id,code,gc_code,email')")],
]
for (const [label, passed] of staffCustomerEditChecks) if (!passed) fail(label)
if (staffCustomerEditChecks.every(([, passed]) => passed)) ok('Staff customer edit permissions and identity controls OK')

console.log('Staff quote inbox, rate calculation, and approval flow')
const staffQuoteFlow = staffUi.match(/async function renderRequests\(\) \{[\s\S]*?\n  async function renderActivity\(\)/)?.[0] || ''
const quoteActionNormalizer = accountAdmin.match(/function normalizeAction\(value: unknown\): Action \{[\s\S]*?\n}/)?.[0] || ''
const quoteCalculator = accountAdmin.match(/async function calculateQuote\([\s\S]*?\n}\nasync function listQuoteRequests/)?.[0] || ''
const logisticsControl = read('supabase/functions/logistics-control-plane/index.ts')
const quoteFlowChecks = [
  ['staff quote calculator calls the quote endpoint and action', staffUi.includes("account('quote', 'calculate'") && quoteActionNormalizer.includes("action === 'calculate'")],
  ['quote calculator supports stored CBM for customer requests', accountAdmin.includes('directVolumeProvided') && accountAdmin.includes("unit === 'cbm' ? volumeCbm : billableWeight")],
  ['finance role can calculate a suggestion without broad operations access', accountAdmin.includes('!canReadOperations && !canReadFinance')],
  ['quote inbox returns email and supports account prefill', accountAdmin.includes('customer_phone,customer_email,origin_key') && staffQuoteFlow.includes("['name', q.customer_name], ['phone', q.customer_phone], ['email', q.customer_email]")],
  ['staff quote review uses the existing secured approval endpoint', staffQuoteFlow.includes('data-quote-review') && staffQuoteFlow.includes("action: 'approve_quote'") && staffQuoteFlow.includes('FN.logisticsControl') && logisticsControl.includes("service.rpc('approve_quote_request'")],
  ['quote approval is limited by status and validity checks', staffQuoteFlow.includes("['pending', 'reviewing', 'quoted'].includes(status)") && staffQuoteFlow.includes('validUntil.getTime() <= Date.now()')],
  ['only Super Admin sees customer-account creation from the inbox', staffQuoteFlow.includes("const canCreateAccount = state.staff?.role === 'super_admin'")],
]
for (const [label, passed] of quoteFlowChecks) if (!passed) fail(label)
if (quoteFlowChecks.every(([, passed]) => passed)) ok('Staff quote inbox, pricing suggestion, and approval contracts OK')

console.log('Finance role separation and customer 360 data')
const operationsV4 = read('supabase/functions/operations-v4/index.ts')
const logisticsTower = read('supabase/functions/logistics-control-tower/index.ts')
const operationsAdmin = read('supabase/functions/operations-admin/index.ts')
const financeAccessChecks = [
  ['finance ledger is restricted to the finance role group on both APIs', operationsV4.includes("const FINANCE_ROLES = new Set(['super_admin','admin','accountant','finance'])") && operationsV4.includes('Finance permission required') && accountAdmin.includes('canReadFinance') && accountAdmin.includes("if (kind === 'finance' && canReadFinance)")],
  ['non-finance shipment list and detail omit amounts and ledger rows', operationsV4.includes('delete row.total_amount;delete row.paid_amount') && operationsV4.includes('delete safeShipment.total_amount;delete safeShipment.paid_amount') && operationsV4.includes('includeFinance?(ledger.data||[]):[]')],
  ['logistics risk tower hides outstanding amounts and payment risk from non-finance roles', logisticsTower.includes('const FINANCE_ROLES=') && logisticsTower.includes('payment_risk:financeVisible?') && logisticsTower.includes('...(financeVisible?{outstanding:s._outstanding}:{})')],
  ['logistics control-plane grants invoice/payment reads to finance and redacts shipment amounts otherwise', logisticsControl.includes("requireRole(staff, ['admin', 'super_admin', 'accountant', 'finance'])") && logisticsControl.includes('kind === \'shipments\' && !FINANCE_ROLES.has(staff.role)') && logisticsControl.includes("message.startsWith('Role required:') ? 403")],
  ['control-plane reads enforce roles and branch/driver scope', logisticsControl.includes('READ_ROLES.has(staff.role)') && logisticsControl.includes("query.eq('assigned_staff_id', staff.id)") && logisticsControl.includes('query.in(\'shipment_id\', ids)')],
  ['legacy operations-admin restricts shipment amount writes and read projections', operationsAdmin.includes('canManageFinance(a.role)') && operationsAdmin.includes('Finance permission required') && operationsAdmin.includes('shipmentProjection(r.data,a)') && operationsAdmin.includes('Finance permission required|Role cannot change shipments|Forbidden/i.test(message)?403')],
  ['customer summary view restores shipment counts and hides balances for non-finance staff', operationsV4.includes("from('customer_directory_accounts')") && operationsV4.includes('const {total_amount,outstanding_amount,...safe}=row')],
  ['staff finance navigation, overview metrics, and API requests are role-gated', staffUi.includes("const FINANCE_ROLES = ['super_admin','admin','accountant','finance']") && staffUi.includes('financeTabVisible') && staffUi.includes('financeRequest = canViewFinance ? ops(\'finance\')') && staffUi.includes('const financeKpis = canViewFinance ?')],
  ['customer and shipment details do not render financial balances for other roles', staffUi.includes("const financeRows = canViewFinance ?") && staffUi.includes("canViewFinance ? money(x.outstanding_amount||0) : '—'") && staffUi.includes("canViewFinance?`<strong class=\"mono\">")],
  ['customer edit/create controls match the backend write-role policy', staffUi.includes("const canManageCustomers = ['admin','super_admin']") && staffUi.includes('canManageCustomers ? `<button class=\"btn\" data-customer-edit=')],
]
for (const [label, passed] of financeAccessChecks) if (!passed) fail(label)
if (financeAccessChecks.every(([, passed]) => passed)) ok('Finance role separation and customer 360 data contracts OK')

console.log('Warehouse receipt integrity and status messaging')
const warehouseFn = read('supabase/functions/warehouse-receiving/index.ts')
const warehouseChecks = [
  ['receipt photos are validated before the first upload', warehouseFn.includes('for(const file of files){if(!file.type.startsWith') && warehouseFn.includes('const photoPaths:string[]=[];const receiptKey=')],
  ['partial upload failures remove already-uploaded evidence', warehouseFn.includes('failed to clean partial uploads') && warehouseFn.includes('storage.from(BUCKET).remove(photoPaths)')],
  ['warehouse UI surfaces shipment-chain failures', staffUi.includes("if(!r.chain?.linked)toast(")],
  ['warehouse UI does not claim WhatsApp was queued or sent', !staffUi.includes('پەیامی WhatsApp بۆ queue دانرا') && staffUi.includes('بە شێوەی ئۆتۆماتیکی نەنێردرا')],
]
for (const [label, passed] of warehouseChecks) if (!passed) fail(label)
if (warehouseChecks.every(([, passed]) => passed)) ok('Warehouse evidence and receipt status contracts OK')

console.log('Customer mobile navigation')
const customerDock = read('gc-customer-mobile-dock-20260922.js')
if (!customerDock.includes("if (key === 'home') { window.scrollTo({top:0,behavior:'smooth'}); return; }")) fail('customer mobile Home must stay inside the portal')
else ok('customer mobile Home stays inside the portal')

console.log('Homepage trust, transport cards, and tracking separation')
const liveMap = read('live-logistics-map.js')
const homepageBeforeTrackingPage = publicShell.split('<section class="gc-container gc-page" id="page-track"')[0]
const modeSection = homepageBeforeTrackingPage.match(/<section class="gc-container gc-section gc-modes-section"[\s\S]*?<\/section>/)?.[0] || ''
const publicPolish = read('gc-public-app-polish-20260928.css')
const homepageChecks = [
  ['homepage has no embedded tracking panel or tracking prompt', !/gc-track-panel|gc-track-prompt|data-gc-track-form/.test(homepageBeforeTrackingPage)],
  ['dedicated tracking page and site navigation remain available', publicShell.includes('href="/track"') && (publicShell.match(/data-gc-track-form/g) || []).length === 1],
  ['Air, Sea, and Land photo cards use optimized images', ['air-cargo','sea-cargo','land-cargo'].every(mode => modeSection.includes(`/assets/homepage/${mode}.webp`) && existsSync(join(ROOT, 'assets', 'homepage', `${mode}.webp`)))],
  ['transport cards use native accessible disclosure controls', (modeSection.match(/<details class="gc-mode-card">/g) || []).length === 3 && (modeSection.match(/<summary class="gc-mode-summary">/g) || []).length === 3],
  ['public headings retain contrast on the light content canvas', publicPolish.includes('body:has(#gcApp) #gcMain .gc-section-head h2') && publicPolish.includes('body:has(#gcApp) #gcMain .gc-page h1')],
  ['no fabricated active-shipment preview remains', !/ACTIVE SHIPMENT|GLC — LIVE CARGO|ETA: 5 days/.test(publicShell)],
  ['no generic social profile placeholders remain', !/https:\/\/www\.(facebook|instagram)\.com\/?["']/i.test(publicShell)],
  ['homepage does not claim unverified 24/7 support', !/24\/7/i.test(publicShell)],
  ['route map distinguishes a route overview from live tracking', liveMap.includes("'ROUTE OVERVIEW'") && liveMap.includes("'LIVE TRACKING'")],
  ['route map does not synthesize a shipment location', !liveMap.includes('شوێنی پێشبینیکراوی بار')],
  ['mobile menu exposes and synchronizes its expanded state', publicShell.includes('aria-controls="gcMobileMenu"') && publicShell.includes('aria-expanded="false"') && read('gc-final-experience-2026.js').includes("button.setAttribute('aria-expanded', String(open))")],
]
for (const [label, passed] of homepageChecks) if (!passed) fail(label)
if (homepageChecks.every(([, passed]) => passed)) ok('Homepage trust, transport, tracking separation, and navigation checks OK')

console.log('Pages build output protection')
const buildScript = read('scripts/cloudflare-build.mjs')
const skipsLegacyBuild = /const skippedDirectories = new Set\(\[[^\]]*['"]Build['"][^\]]*\]\)/.test(buildScript)
if (!skipsLegacyBuild) fail('legacy Build output is not excluded from Pages bundle input')
else ok('Legacy Build output is excluded from the deployment bundle')

console.log('Migration naming and presence')
const migDir = join(ROOT, 'supabase', 'migrations')
const migrations = existsSync(migDir) ? readdirSync(migDir).filter((x) => x.endsWith('.sql')) : []
for (const name of migrations) if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(name)) fail(`bad migration filename: ${name}`)
for (const pattern of ['production_security_hardening','fix_alert_monitor_uuid_text_cast_v1','production_runtime_alignment_v1']) {
  if (!migrations.some((name) => name.includes(pattern))) fail(`missing production migration: ${pattern}`)
}
if (!failures) ok('Migration naming/presence OK')

console.log('Public pricing RPC permission boundary')
const pricingAccessMigration = migrations.find((name) => name.includes('restrict_direct_pricing_rpc_access_v1'))
const pricingAccessSql = pricingAccessMigration ? read(`supabase/migrations/${pricingAccessMigration}`) : ''
const publicPricingFunction = read('supabase/functions/public-pricing/index.ts')
const pricingRpcProtected = /revoke\s+all\s+on\s+function\s+public\.calculate_logistics_price\s*\([\s\S]*?\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i.test(pricingAccessSql)
  && /grant\s+execute\s+on\s+function\s+public\.calculate_logistics_price\s*\([\s\S]*?\)\s+to\s+service_role/i.test(pricingAccessSql)
  && publicPricingFunction.includes("rpc('calculate_logistics_price'")
  && publicPricingFunction.includes('SUPABASE_SERVICE_ROLE_KEY')
if (!pricingRpcProtected) fail('direct pricing RPC must be restricted to service_role while public pricing uses the protected Edge Function')
else ok('direct pricing RPC is restricted to service_role; public quotes remain routed through the Edge Function')

console.log('Security hygiene')
for (const f of runtimeFiles) {
  const text = readFileSync(f, 'utf8')
  if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"](eyJ|sb_secret_)/.test(text)) fail(`service-role key literal found in ${relative(ROOT, f)}`)
}
if (!failures) ok('No service-role secret literal found')

console.log('Production contracts')
try { execFileSync(process.execPath, [join(ROOT, 'scripts', 'production-contracts.mjs')], { stdio: 'inherit' }) }
catch { fail('production contract validation failed') }

console.log('')
if (failures) { console.error(`${failures} check(s) failed.`); process.exit(1) }
console.log('All repository validation checks passed.')
