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
  'index.html','gc-customer-experience-signature-20261017.css','login.html','register.html','customer-access.html','supabase/functions/customer-gc-register/index.ts','accounts-console.html','gc-csp-scripts/accounts-console-inline-1.js','gc-settings-hub.js','gc-unified-customer-experience-20261016.js','sw.js','gc-production-ui-20260927.css','production-bridge.js','runtime-guard.js','_headers','_redirects','functions/api/health.js','functions/api/ready.js',
  'public-route-bootstrap.js','public-runtime-guarantee.js','public-staff-guard-20260909.js','public-premium-mobile-20260909.css','public-premium-mobile-20260909.js',
  'tracking-integration.html','tracking-intelligence.js','tracking-intelligence.css','customer-portal.html','warehouse-os.html','driver-workspace.html',
  'staff-os-v5.html','staff-os-v5.css','staff-os-v5.js','gc-shipment-detail-20261016.css','staff-os-v5-rescue.js','staff-logistics-intelligence.js','staff-logistics-intelligence.css',
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
  ['unified customer workspace UI layer loaded', publicShell.includes('gc-customer-workspace-elite-20261014.css?v=23')],
  ['legacy customer portal redirects to the unified customer entry', read('customer-portal.html').includes("window.location.replace('/#auth')") && !read('customer-portal.html').includes('gc-csp-scripts/customer-portal-inline-1.js')],
  ['customer-access has no independent login form', legacyAccessPage.includes("window.location.replace('/#auth')") && !legacyAccessPage.includes('id="loginForm"') && !legacyAccessPage.includes('functions/v1/customer-gc-login')],
  ['active homepage avoids legacy monolithic script', !publicShell.includes('gc-csp-scripts/index-inline-2.js')],
  ['public bootstrap loads runtime guarantee', publicBootstrap.includes('/public-runtime-guarantee.js')],
  ['public runtime has emergency fallback', publicRuntime.includes('renderEmergencyShell')],
]
for (const [label, passed] of guards) if (!passed) fail(label)
if (!failures) ok('Public and Staff integration guards OK')

console.log('Customer identity claim normalization')
const customerIdentitySource = read('supabase/functions/customer-self/index.ts')
const identityPatterns = [
  ['remove GC-code whitespace', String.raw`replace(/\s+/g, '')`, String.raw`replace(/\\s+/g, '')`],
  ['GC-123 format', String.raw`/^GC-\d+$/.test(raw)`, String.raw`/^GC-\\d+$/.test(raw)`],
  ['GC123 format', String.raw`/^GC\d+$/.test(raw)`, String.raw`/^GC\\d+$/.test(raw)`],
  ['numeric GC input', String.raw`/^\d+$/.test(raw)`, String.raw`/^\\d+$/.test(raw)`],
  ['phone digit normalization', String.raw`replace(/\D/g, '')`, String.raw`replace(/\\D/g, '')`],
  ['mobile prefix normalization', String.raw`else if (/^7\d{9}$/.test(digits)) digits = '0' + digits`, String.raw`else if (/^7\\d{9}$/.test(digits)) digits = '0' + digits`],
]
let identityPatternsPassed = true
for (const [label, expected, legacy] of identityPatterns) {
  if (!customerIdentitySource.includes(expected) || customerIdentitySource.includes(legacy)) {
    fail(`customer-self identity normalization: ${label}`)
    identityPatternsPassed = false
  }
}
const normalizeTestGcCode = (value) => {
  const raw = String(value ?? '').trim().slice(0, 50).toUpperCase().replace(/\s+/g, '')
  if (/^GC-\d+$/.test(raw)) return raw
  if (/^GC\d+$/.test(raw)) return 'GC-' + raw.slice(2)
  if (/^\d+$/.test(raw)) return 'GC-' + raw
  return ''
}
const normalizeTestPhone = (value) => {
  let digits = String(value ?? '').trim().slice(0, 50).replace(/\D/g, '')
  if (digits.startsWith('00964')) digits = digits.slice(2)
  if (digits.startsWith('964')) digits = '0' + digits.slice(3)
  else if (/^7\d{9}$/.test(digits)) digits = '0' + digits
  return digits
}
const identityCases = [
  ['GC-123 stays canonical', normalizeTestGcCode('GC-123') === 'GC-123'],
  ['GC123 gains the dash', normalizeTestGcCode('GC123') === 'GC-123'],
  ['numeric code gains GC prefix', normalizeTestGcCode('123') === 'GC-123'],
  ['spaced GC code normalizes', normalizeTestGcCode(' GC - 123 ') === 'GC-123'],
  ['+964 mobile matches local format', normalizeTestPhone('+964 750 123 4567') === '07501234567'],
  ['00964 mobile matches local format', normalizeTestPhone('00964 750 123 4567') === '07501234567'],
  ['mobile without leading zero normalizes', normalizeTestPhone('750 123 4567') === '07501234567'],
]
for (const [label, passed] of identityCases) if (!passed) { fail(`identity regression: ${label}`); identityPatternsPassed = false }
if (identityPatternsPassed) ok('Customer GC-code and Iraq-phone normalization contracts OK')

console.log('Migration naming and presence')
const migDir = join(ROOT, 'supabase', 'migrations')
const migrations = existsSync(migDir) ? readdirSync(migDir).filter((x) => x.endsWith('.sql')) : []
for (const name of migrations) if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(name)) fail(`bad migration filename: ${name}`)
for (const pattern of ['production_security_hardening','fix_alert_monitor_uuid_text_cast_v1','production_runtime_alignment_v1']) {
  if (!migrations.some((name) => name.includes(pattern))) fail(`missing production migration: ${pattern}`)
}
if (!failures) ok('Migration naming/presence OK')

console.log('Security hygiene')
for (const f of runtimeFiles) {
  const text = readFileSync(f, 'utf8')
  if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"](eyJ|sb_secret_)/.test(text)) fail(`service-role key literal found in ${relative(ROOT, f)}`)
}
if (!failures) ok('No service-role secret literal found')

console.log('Production contracts')
try { execFileSync(process.execPath, [join(ROOT, 'scripts', 'production-contracts.mjs')], { stdio: 'inherit' }) }
catch { fail('production contract validation failed') }

console.log('Unified homepage/customer workspace')
const accountsConsoleHtml = read('accounts-console.html')
const retiredRegisterFunction = read('supabase/functions/customer-gc-register/index.ts')
const supabaseAuthConfig = read('supabase/config.toml')
const legacyLoginPage = read('login.html')
const legacyRegisterPage = read('register.html')
const legacyAccessPage = read('customer-access.html')
const authRedirects = read('_redirects')
const accountsConsoleScript = read('gc-csp-scripts/accounts-console-inline-1.js')
const staffConsoleHtml = read('staff-os-v5.html')
const staffConsoleScript = read('staff-os-v5.js')
const staffConsoleStyles = read('staff-os-v5.css')
const unifiedShell = read('index.html')
const unifiedController = read('gc-unified-customer-experience-20261016.js')
const customerNavigation = read('gc-dashboard-preferences-20261003.js')
const customerStyleLoader = read('gc-public-customer-style-loader-20261014.js')
const customerDockStyles = read('gc-customer-mobile-dock-20261016.css')
const customerWorkspaceStyles = read('gc-customer-workspace-elite-20261014.css')
const customerSignatureStyles = read('gc-customer-experience-signature-20261017.css')
const customerPortalAuth = read('gc-csp-scripts/customer-portal-inline-1.js')
const customerSettingsHub = read('gc-settings-hub.js')
const customerSelfSource = read('supabase/functions/customer-self/index.ts')
const staffShipmentSource = read('supabase/functions/staff-shipment-v5/index.ts')
const staffShipmentControlSource = read('supabase/functions/staff-shipment-control/index.ts')
const shipmentCustomerLinksMigration = read('supabase/migrations/20261017120000_staff_customer_unified_shipment_links.sql')
const notificationIndexMigration = read('supabase/migrations/20261017130000_customer_notification_idempotency_unique_index.sql')
const customerPortalSource = read('gc-csp-scripts/customer-portal-inline-1.js')
const customerAccountEntry = read('gc-account-entry.js')
const accountAdminSource = read('supabase/functions/account-admin/index.ts')
const customerDockStart = unifiedShell.indexOf('<nav class="mobile-dock"')
const customerDockEnd = unifiedShell.indexOf('</nav>', customerDockStart)
const customerDockMarkup = customerDockStart >= 0 && customerDockEnd > customerDockStart ? unifiedShell.slice(customerDockStart, customerDockEnd + 6) : ''
const customerDockCount = (customerDockMarkup.match(/data-dock-tab=/g) || []).length
const customerDockTabs = [...customerDockMarkup.matchAll(/data-dock-tab="([^"]+)"/g)].map((match) => match[1])
const unifiedContracts = [
  ['one customer-first shell with old marketing area hidden', (unifiedShell.match(/id="gcApp"/g) || []).length === 1 && (unifiedShell.match(/id="gcCustomerWorkspace"/g) || []).length === 1 && unifiedShell.includes('<body class="gc-customer-app"') && unifiedShell.includes('<div class="gc-app" id="gcApp" hidden>') && unifiedShell.includes('<div id="gcCustomerWorkspace" data-gc-unified-customer="1">') && !unifiedShell.includes('<nav class="gc-mobile-dock-v3"')],
  ['legacy public dock cannot be reinjected', customerStyleLoader.includes('function ensureHomeDock() { return; }') && !customerStyleLoader.includes('dock.innerHTML')],
  ['floating marketing WhatsApp bubble is hidden inside customer app', customerWorkspaceStyles.includes('body.gc-customer-app #gcWhatsAppFloat') && customerWorkspaceStyles.includes('body.gc-customer-app .gc-whatsapp-float')],
  ['homepage links now map inside customer workspace', unifiedController.includes("'#public':'#overview'") && unifiedController.includes("'#services':'#gcCustomerRouteOverview'") && unifiedController.includes("'#track':'#shipmentsSection'") && unifiedController.includes("'#contact':'#support'")],
  ['customer console is the default root and login is ready', unifiedController.includes("window.location.hash || '#auth'") && unifiedShell.includes('<div id="auth" class="app-modal">')],
  ['public services integrated into customer home', unifiedShell.includes('id="gcCustomerRouteOverview"') && unifiedShell.includes('gc-customer-service-grid')],
  ['customer mobile dock has five primary icons', customerDockCount === 5],
  ['customer mobile dock uses Home, Orders, Requests, Notifications, and Settings', customerDockTabs.join(',') === 'home,shipments,requests,notifications,settings'],
  ['customer Home and Notifications are isolated views', customerNavigation.includes("home: ['workspace-toolbar', 'overview', 'homeMetrics', 'gcCustomerRouteOverview']") && customerNavigation.includes("notifications: ['activity']")],
  ['customer Orders includes shipments and related records', customerNavigation.includes("shipments: ['shipmentsSection', 'records']") && customerNavigation.includes("'#records':'shipments'") && unifiedController.includes("'#records':'shipments'")],
  ['customer Settings has profile, avatar, password, and preference controls', customerSettingsHub.includes("section.id = 'gcAccountSettings'") && customerSettingsHub.includes("account-self-password") && customerSettingsHub.includes("sb.storage.from('avatars')") && customerSettingsHub.includes("window.gcSelectCustomerView('shipments')")],
  ['staff shipment creation links trusted directory customers and sends in-app notifications', staffShipmentSource.includes("customer_user_id:customer?.auth_user_id||null") && staffShipmentSource.includes("syncShipmentCustomerLinks(a.db,id,customer.id,a.staff.id,true)") && staffShipmentSource.includes("notifyShipmentCustomers(a.db,linkedCustomers,id,tracking,'created','shipment_created'")],
  ['staff shipment updates reconcile cargo membership and notify only public updates', staffShipmentControlSource.includes('hasCargoItems || hasDeletedCargoIds') && staffShipmentControlSource.includes('syncShipmentCustomerLinks(a.db,id,current.data.directory_customer_id') && staffShipmentControlSource.includes('notifyShipmentCustomers') && staffShipmentControlSource.includes('if (p.is_public !== false)')],
  ['customer self-service filters tracking events to public rows', customerSelfSource.includes(".eq('is_public',true)")],
  ['customer payments are scoped to invoices owned by the authenticated customer', customerSelfSource.includes(".in('invoice_id',invoiceIds)") && customerSelfSource.includes("shipment_customer_links")],
  ['shared shipments hide global totals and return only owned cargo rows', customerSelfSource.includes('is_consolidated:shared') && customerSelfSource.includes('cargo_items:ownCargoRows') && customerSelfSource.includes('total_amount:shared?null')],
  ['Super Admin account binding refreshes shipment memberships', accountAdminSource.includes("from('shipment_customer_links').update({customer_user_id:userId")],
  ['customer console displays tracking IDs and the customer's cargo', customerPortalSource.includes('item.tracking_id || item.tracking_number || item.customer_gc_code || item.id') && customerPortalSource.includes('renderShipments(rows, dashboard.cargo_items || [])')],
  ['modified customer portal script is cache-busted in the active homepage', unifiedShell.includes('gc-csp-scripts/customer-portal-inline-1.js?v=20261017-1')],
  ['shipment membership migration is locked to service role and backfills cargo owners', shipmentCustomerLinksMigration.includes('shipment_customer_links_shipment_customer_key') && shipmentCustomerLinksMigration.includes('revoke all on table public.shipment_customer_links from anon, authenticated') && shipmentCustomerLinksMigration.includes('from public.shipment_cargo_items ci')],
  ['customer notification upsert conflict target has a matching full unique index', notificationIndexMigration.includes('CREATE UNIQUE INDEX IF NOT EXISTS customer_notifications_event_key_full_uidx') && notificationIndexMigration.includes('rename to customer_notifications_event_key_uidx')],
  ['customer navigation initializes all declared icons without runtime reference errors', customerNavigation.includes('const mountIcons = (root = document) =>') && customerNavigation.includes('node.innerHTML = icons[key]') && ['user','wallet','documents','moving','warehouse','route','send','lock','logout'].every(icon => customerNavigation.includes(icon + ':'))],
  ['customer view controller includes dynamically-mounted account settings', customerNavigation.includes("const allSections = () => [...main.querySelectorAll(':scope > section')]") && customerNavigation.includes('allSections().forEach(section =>')],
  ['staff console is visible only after backend role verification', customerSettingsHub.includes("/functions/v1/account-self-profile") && customerSettingsHub.includes("profile?.kind === 'staff'") && customerSettingsHub.includes("STAFF_ROLES.has(profile.role)") && customerSettingsHub.includes("if (staffAccessVerified) window.location.assign('/staff')")],
  ['premium homepage keeps public dock off the content on mobile', customerStyleLoader.includes('gc-homepage-signature-20261016.css?v=10') && customerWorkspaceStyles.includes('gc-customer-service-card') && read('gc-homepage-signature-20261016.css').includes('body:not(.gc-customer-app) .gc-mobile-dock-v3{display:none!important')],
  ['premium hero uses existing logistics imagery', read('gc-homepage-signature-20261016.css').includes("url('/assets/gc-air-freight-hero-1440.webp')")],
  ['mobile homepage is compact and does not float over form inputs', read('gc-homepage-signature-20261016.css').includes('#gcApp .gc-announcement { display:none!important; }') && read('gc-homepage-signature-20261016.css').includes('body .gc-whatsapp-float {display:none!important;}') && read('gc-homepage-signature-20261016.css').includes('#gcApp {padding-bottom:0!important;}')],
  ['customer transport cards use real air sea and land images', ['gc-air-freight-hero-640.webp','gc-sea-freight-hero-640.webp','gc-land-freight-hero-640.webp'].every(image => customerWorkspaceStyles.includes(image))],
  ['customer content clears the five-tab mobile navigation', customerWorkspaceStyles.includes('padding-bottom:calc(132px + env(safe-area-inset-bottom))') && customerDockStyles.includes('padding-bottom:calc(136px + env(safe-area-inset-bottom))')],
  ['current premium styles are cache-busted in the index', unifiedShell.includes('gc-homepage-signature-20261016.css?v=10') && unifiedShell.includes('gc-live-mobile-v3.css?v=20261017-2') && unifiedShell.includes('gc-customer-mobile-dock-20261016.css?v=5') && unifiedShell.includes('gc-public-customer-style-loader-20261014.js?v=21')],
  ['customer route scripts are cache-busted after navigation fixes', unifiedShell.includes('gc-settings-hub.js?v=20261017-12') && unifiedShell.includes('gc-dashboard-preferences-20261003.js?v=20261017-2') && unifiedShell.includes('gc-unified-customer-experience-20261016.js?v=20261017-1')],
  ['tracking URL redirects to the customer shipment view', authRedirects.includes('/track /#shipmentsSection 302') && authRedirects.includes('/track/ /#shipmentsSection 302')],
  ['registration hash stays in customer mode', unifiedController.includes("'#auth':'home'") && unifiedController.includes("'#register':'home'")],
  ['private views require customer authentication', unifiedController.includes('const privateHashes = new Set([') && unifiedController.includes('verifyExistingSession(hash === \'#auth\' || hash === \'#register\' || privateHashes.has(hash))')],
  ['unified customer controller cache key is current', unifiedShell.includes('gc-unified-customer-experience-20261016.js?v=9')],
  ['legacy home/services/request/track/contact routes map into workspace views', unifiedController.includes('const legacyRoutes = {') && unifiedController.includes("'#public':'#overview'") && unifiedController.includes("'#services':'#gcCustomerRouteOverview'") && unifiedController.includes("'#request':'#newRequest'") && unifiedController.includes("'#track':'#shipmentsSection'") && unifiedController.includes("'#contact':'#support'" )],
  ['old separate public mode has been removed', !unifiedController.includes('const syncPublicPageRoute =') && !unifiedController.includes('setPublicMode')],
  ['customer home includes route services and alerts', customerNavigation.includes("'gcCustomerRouteOverview', 'activity'")],
  ['unread alert count is shown on Notifications icon', customerNavigation.includes("const notificationsItem = items.find(item => item.dataset.dockTab === 'notifications'") && customerNavigation.includes("querySelector('[data-dash-icon=\"notifications\"]')") && customerDockStyles.includes('[data-dock-tab=\"notifications\"] [data-dash-icon=\"notifications\"]') && customerNavigation.includes('data-dock-unread')],
  ['customer dock uses five responsive columns', customerDockStyles.includes('repeat(5,minmax(0,1fr))') && !customerDockStyles.includes('repeat(6,minmax(0,1fr))') && !customerWorkspaceStyles.includes('repeat(6,minmax(0,1fr))')],
  ['integrated services have responsive polished styles', customerWorkspaceStyles.includes('.gc-customer-route-overview') && customerWorkspaceStyles.includes('@media (max-width: 900px)')],
  ['style loader references current cache versions', customerStyleLoader.includes('gc-customer-workspace-elite-20261014.css?v=23') && customerStyleLoader.includes('gc-customer-mobile-dock-20261016.css?v=5')],
  ['style loader script is cache-busted in index', unifiedShell.includes('gc-public-customer-style-loader-20261014.js?v=21')],
  ['signature customer layer is loaded after the mobile dock', unifiedShell.includes('gc-customer-experience-signature-20261017.css?v=2') && customerStyleLoader.includes('gc-customer-experience-signature-20261017.css?v=2')],
  ['customer home has three direct paths to shipments, billing, and support', (unifiedShell.match(/class="gc-quick-action"/g)||[]).length === 3 && unifiedShell.includes('href="#shipmentsSection"') && unifiedShell.includes('href="#records"') && unifiedShell.includes('href="#support"')],
  ['customer home uses real air freight artwork and responsive hero styling', customerSignatureStyles.includes("url('/assets/gc-air-freight-hero-960.webp')") && customerSignatureStyles.includes("url('/assets/gc-air-freight-hero-640.webp')") && customerSignatureStyles.includes('@media(max-width:900px)')],
  ['support remains reachable from account settings', read('gc-settings-hub.js').includes("gcSelectCustomerView('support')")],
  ['legacy GC sign-in explains secure staff linking', unifiedShell.includes('gc-auth-support-note') && unifiedShell.includes('wa.me/9647507577137')],
  ['signed-out claim prompt offers support without self-linking', customerPortalAuth.includes('gc-account-help-action') && customerSelfSource.includes('self-service linking is disabled')],
  ['customer signup remains staff-provisioned', customerAccountEntry.includes('does not expose') && accountAdminSource.includes("Only Super Admin can bind customer accounts")],
  ['customer auth-help assets have matching cache references', unifiedShell.includes('gc-customer-workspace-elite-20261014.css?v=23') && unifiedShell.includes('gc-csp-scripts/customer-portal-inline-1.js?v=20261016-10')],
  ['public customer registration endpoint is retired', !retiredRegisterFunction.includes('SUPABASE_SERVICE_ROLE_KEY') && !retiredRegisterFunction.includes('createUser(') && !retiredRegisterFunction.includes('register_customer_with_gc') && retiredRegisterFunction.includes('CUSTOMER_REGISTRATION_DISABLED')],
  ['retired registration function requires JWT at gateway', supabaseAuthConfig.includes('[functions.customer-gc-register]\nverify_jwt = true')],
  ['GC-code login remains public for its credential check', supabaseAuthConfig.includes('[functions.customer-gc-login]\nverify_jwt = false') && read('supabase/functions/customer-gc-login/index.ts').includes('signInWithPassword')],
  ['customer login prevents native form navigation', customerPortalAuth.includes("$('authForm').addEventListener('submit', async (event) => {") && customerPortalAuth.includes('event.preventDefault();') && !customerPortalAuth.includes("$('signIn').addEventListener('click'")],
  ['legacy login, registration, and customer-access files redirect into the one page', [legacyLoginPage, legacyRegisterPage, legacyAccessPage].every(page => page.includes("window.location.replace('/#auth')") && !page.includes('customer-gc-register') && !page.includes('loginForm'))],
  ['legacy auth paths redirect to the unified customer entry', ['/login /#auth 302','/login/ /#auth 302','/login.html /#auth 302','/register /#auth 302','/register/ /#auth 302','/register.html /#auth 302','/customer-access /#auth 302','/customer-access/ /#auth 302','/customer-access.html /#auth 302'].every(route => authRedirects.includes(route))],
  ['staff console exposes customer linkage filters', accountsConsoleHtml.includes('id="customerLinkFilter"') && accountsConsoleHtml.includes('value="unlinked"') && accountsConsoleHtml.includes('value="linked"') && accountsConsoleHtml.includes('value="inactive-unlinked"')],
  ['customer linkage filter is functional', accountsConsoleScript.includes("customerLinkFilter')?.addEventListener('change', renderList)") && accountsConsoleScript.includes("linkFilter === 'unlinked' ? (!linked && active)") && accountsConsoleScript.includes("linkFilter === 'inactive-unlinked' ? (!linked && !active)")],
  ['customer linkage summary warns Super Admin to verify identity', accountsConsoleScript.includes('دوای پشتڕاستکردنەوەی ناسنامە') && accountAdminSource.includes('Only Super Admin can bind customer accounts')],
  ['staff console script cache is refreshed', accountsConsoleHtml.includes('gc-csp-scripts/accounts-console-inline-1.js?v=20261016-4')],
  ['main Staff OS shows customer identity-linking guidance', staffConsoleScript.includes('customer-link-guidance') && staffConsoleScript.includes('پێش Bind، ناسنامەی کڕیار پشتڕاست بکەرەوە')],
  ['main Staff OS filters inactive unlinked customers', staffConsoleScript.includes("filter==='inactive-unlinked'?x.is_active===false&&!x.auth_user_id:true") && staffConsoleScript.includes('value="inactive-unlinked"')],
  ['customer binding stays Super Admin only', staffConsoleScript.includes("state.staff?.role !== 'super_admin'") && accountAdminSource.includes('Only Super Admin can bind customer accounts')],
  ['main Staff OS loads current customer filter assets', staffConsoleHtml.includes('staff-os-v5.css?v=20261016-4') && staffConsoleHtml.includes('staff-os-v5.js?v=20261016-19') && staffConsoleStyles.includes('.customer-link-guidance')],
]
for (const [label, passed] of unifiedContracts) {
  if (passed) ok(label)
  else fail(label)
}

console.log('')
if (failures) { console.error(`${failures} check(s) failed.`); process.exit(1) }
console.log('All repository validation checks passed.')
