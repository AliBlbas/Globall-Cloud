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
  'index.html','gc-customer-carton-manifest-20261017.js','gc-customer-carton-manifest-20261017.css','gc-staff-carton-tools-20261017.js','gc-staff-command-system-20261017.css','gc-staff-console-elite-20261018.css','gc-staff-land-manifest-20261018.css','gc-staff-land-manifest-20261018.js','gc-customer-warehouse-evidence-20261017.css','gc-customer-experience-signature-20261017.css','gc-ui-integrity-mobile-20261017.css','gc-dashboard-preferences-20261003.js','gc-public-customer-style-loader-20261014.js','staff-os-v5-enhancement-loader-20261017.js','login.html','register.html','customer-access.html','supabase/functions/customer-gc-register/index.ts','accounts-console.html','gc-csp-scripts/accounts-console-inline-1.js','gc-settings-hub.js','gc-unified-customer-experience-20261016.js','sw.js','gc-production-ui-20260927.css','production-bridge.js','runtime-guard.js','_headers','_redirects','functions/api/health.js','functions/api/ready.js',
  'public-route-bootstrap.js','public-runtime-guarantee.js','public-staff-guard-20260909.js','public-premium-mobile-20260909.css','public-premium-mobile-20260909.js',
  'tracking-integration.html','tracking-intelligence.js','tracking-intelligence.css','customer-portal.html','warehouse-os.html','driver-workspace.html',
  'staff-os-v5.html','staff-os-v5.css','gc-staff-ui-refinement-20261019-v4.css','gc-staff-live-workspace-20261019.css','gc-staff-customer-bridge-20261019.js','staff-os-v5.js','gc-shipment-detail-20261016.css','staff-os-v5-rescue.js','staff-logistics-intelligence.js','staff-logistics-intelligence.css',
  'staff-mobile-command-dock.css','staff-mobile-command-dock.js','staff-os-pro-20260909.css','staff-os-pro-20260909.js',
  'staff-shell-polish-20260909.css','staff-shell-polish-20260909.js','staff-premium-mobile-20260909.css','staff-premium-mobile-20260909.js',
  'warehouse-offline-sync.js','gc-platform-vnext.js','gc-platform-vnext-plus.js','gc-runtime-safety-v2026.js','production-brand-repair.js',
  'supabase/config.toml','package.json','scripts/production-contracts.mjs','tests/e2e/run.mjs','supabase/migrations/20261017130000_restrict_customer_request_photo_uploads.sql',
  'supabase/migrations/20261017181111_fix_warehouse_receipt_customer_notifications.sql',
  'supabase/migrations/20261017181944_fix_warehouse_receipt_portal_route.sql',
  'supabase/migrations/20261017182723_warehouse_receipt_respect_in_app_preferences.sql',
  'supabase/migrations/20261018214814_simplify_dubai_receipt_customer_alerts.sql',
  'supabase/migrations/20261017185000_warehouse_receipt_cartons.sql',
  'supabase/migrations/20261017203455_fix_customer_notification_uuid_text_join.sql',
  'supabase/migrations/20261017204122_add_missing_fk_covering_indexes.sql',
  'supabase/migrations/20261017204218_optimize_customer_order_rls_policies.sql',
  'supabase/migrations/20261018173608_dubai_land_manifest_workflow.sql','supabase/migrations/20261018174100_fix_tracking_notification_uuid_cast.sql',
  'supabase/functions/land-manifests/index.ts','supabase/functions/land-manifests/deno.json',
  'supabase/functions/public-config/index.ts',
  'supabase/functions/public-track/index.ts','supabase/functions/system-health/index.ts','supabase/functions/staff-auth-verify/index.ts',
  'supabase/functions/_shared/service-key.ts','supabase/functions/logistics-control-plane/index.ts',
  'supabase/functions/notification-dispatch/index.ts','supabase/functions/warehouse-receiving/index.ts','supabase/functions/warehouse-notify/index.ts',
  'supabase/functions/staff-ops-hub/index.ts','supabase/functions/staff-analytics/index.ts','supabase/functions/invoice-ai/index.ts','supabase/functions/operations-v4/index.ts',
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
  ['land-manifests API requires JWT verification', /^\[functions\.land-manifests\]\s*verify_jwt\s*=\s*true$/m.test(config)],
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
const productionMiddleware = read('functions/_middleware.js')
const unifiedController = read('gc-unified-customer-experience-20261016.js')
const customerNavigation = read('gc-dashboard-preferences-20261003.js')
const customerStyleLoader = read('gc-public-customer-style-loader-20261014.js')
const customerDockStyles = read('gc-customer-mobile-dock-20261016.css')
const customerWorkspaceStyles = read('gc-customer-workspace-elite-20261014.css')
const customerSignatureStyles = read('gc-customer-experience-signature-20261017.css')
const customerPortalAuth = read('gc-csp-scripts/customer-portal-inline-20261017.js')
const customerSettingsHub = read('gc-settings-hub.js')
const customerSelfSource = read('supabase/functions/customer-self/index.ts')
const operationsV4Source = read('supabase/functions/operations-v4/index.ts')
const invoiceAiSource = read('supabase/functions/invoice-ai/index.ts')
const publicConfigSource = read('supabase/functions/public-config/index.ts')
const publicTrackSource = read('supabase/functions/public-track/index.ts')
const systemHealthSource = read('supabase/functions/system-health/index.ts')
const staffAuthVerifySource = read('supabase/functions/staff-auth-verify/index.ts')
const staffShipmentSource = read('supabase/functions/staff-shipment-v5/index.ts')
const staffShipmentControlSource = read('supabase/functions/staff-shipment-control/index.ts')
const shipmentCustomerLinksMigration = read('supabase/migrations/20261017120000_staff_customer_unified_shipment_links.sql')
const notificationIndexMigration = read('supabase/migrations/20261017040435_customer_notification_idempotency_unique_index.sql')
const customerPortalSource = read('gc-csp-scripts/customer-portal-inline-20261017.js')
const customerPortalVersionedScript = read('gc-csp-scripts/customer-portal-inline-20261017.js')
const customerRequestController = read('gc-customer-request-20261003.js')
const customerPhotoBucketMigration = read('supabase/migrations/20261017130000_restrict_customer_request_photo_uploads.sql')
const staffConsoleVersionedScript = read('staff-os-v5-20261017.js')
const staffCustomerBridgeScript = read('gc-staff-customer-bridge-20261019.js')
const staffUnifiedStyles = read('gc-staff-ui-refinement-20261019-v4.css')
const staffOpsHubSource = read('supabase/functions/staff-ops-hub/index.ts')
const landManifestSource = read('supabase/functions/land-manifests/index.ts')
const landManifestMigration = read('supabase/migrations/20261018173608_dubai_land_manifest_workflow.sql')
const trackingNotificationCastMigration = read('supabase/migrations/20261018174100_fix_tracking_notification_uuid_cast.sql')
const staffLandManifestUI = read('gc-staff-land-manifest-20261018.js')
const staffLandManifestCss = read('gc-staff-land-manifest-20261018.css')
const customerAccountEntry = read('gc-account-entry.js')
const accountAdminSource = read('supabase/functions/account-admin/index.ts')
const customerDockStart = unifiedShell.indexOf('<nav class="mobile-dock"')
const customerDockEnd = unifiedShell.indexOf('</nav>', customerDockStart)
const customerDockMarkup = customerDockStart >= 0 && customerDockEnd > customerDockStart ? unifiedShell.slice(customerDockStart, customerDockEnd + 6) : ''
const customerDockCount = (customerDockMarkup.match(/data-dock-tab=/g) || []).length
const customerDockTabs = [...customerDockMarkup.matchAll(/data-dock-tab="([^"]+)"/g)].map((match) => match[1])
const unifiedContracts = [
  ['customer shipment requests validate photo type/size and upload to the private bucket', unifiedShell.includes('id="requestImage"') && unifiedShell.includes('accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif"') && customerRequestController.includes("storage?.from?.('customer-request-photos')") && customerRequestController.includes('cargo_image_path: uploadedPath') && customerRequestController.includes('maxImageBytes = 10 * 1024 * 1024') && customerSelfSource.includes('pathParts[0] !== user.id') && customerSelfSource.includes('cargo_image_path: cargoImagePath') && customerPhotoBucketMigration.includes('file_size_limit = 10485760') && customerPhotoBucketMigration.includes('allowed_mime_types')],
  ['staff request inbox shows cargo details and uses temporary private image URLs', accountAdminSource.includes('request_type,cargo_country,cargo_description,cargo_image_path') && staffConsoleVersionedScript.includes('createSignedUrl(q.cargo_image_path, 300)') && staffConsoleVersionedScript.includes('data-request-photo')],
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
  ['shipment owner counts combine links, primary customer identity, and actual cargo owners', customerSelfSource.includes('const ownersByShipment = new Map<string, Set<string>>()') && customerSelfSource.includes('for (const item of shipmentRows) addOwner(item.id, item.directory_customer_id)') && customerSelfSource.includes('for (const item of cargoOwnershipRows) addOwner(item.shipment_id, item.customer_directory_id)')],
  ['legacy invoice/document rows are only attached to single-owner shipments', customerSelfSource.includes('documentsByUser') && customerSelfSource.includes('invoicesByUser') && customerSelfSource.includes(".is('customer_user_id',null).eq('is_public',true)") && customerSelfSource.includes('soloInvoicesResult') && customerSelfSource.includes('owners===1||(owners===0&&directOwnedShipmentIds.has(String(item.id)))')],
  ['Super Admin account binding refreshes shipment memberships', accountAdminSource.includes("from('shipment_customer_links').update({customer_user_id:userId")],
  ['Super Admin customer binding presents one-time GC credentials in a copyable modal, not a blocking alert', staffConsoleVersionedScript.includes("openModal('هەژماری کڕیار ئامادەیە'") && staffConsoleVersionedScript.includes('copyCustomerGc') && staffConsoleVersionedScript.includes('copyCustomerPassword') && staffConsoleVersionedScript.includes('navigator.clipboard?.writeText') && !staffConsoleVersionedScript.includes("window.alert('هەژماری کڕیار ئامادەیە")],
  ['Super Admin account binding backfills owner-scoped notifications for existing warehouse receipts', accountAdminSource.includes('queueExistingWarehouseReceiptNotifications') && accountAdminSource.includes(".eq('directory_customer_id', customerDirectoryId)") && accountAdminSource.includes("onConflict: 'customer_user_id,event_key', ignoreDuplicates: true") && accountAdminSource.includes('existing_receipt_notifications_queued: receiptNotifications.queued') && staffConsoleVersionedScript.includes('receipt_notifications_queued') && staffConsoleVersionedScript.includes('receipt_notifications_checked')],
  ['Super Admin can export an unlinked-customer identity review CSV with formula-safe fields', staffConsoleVersionedScript.includes('downloadUnlinkedCustomerReport') && staffConsoleVersionedScript.includes('exportUnlinkedCustomers') && staffConsoleVersionedScript.includes('Needs identity verification') && staffConsoleVersionedScript.includes('URL.revokeObjectURL(url)') && staffConsoleVersionedScript.includes("state.staff?.role !== 'super_admin'")],
  ['staff customer account binding shows shipment-link refresh status or warning', staffConsoleVersionedScript.includes('shipmentLinkStatus') && staffConsoleVersionedScript.includes('shipment_links_updated') && staffConsoleVersionedScript.includes('پێویستە لەلایەن Super Admin ـەوە بپشکنرێت')],
  ['warehouse receipt detail exposes a Super Admin-only account bind action and refuses ambiguous GC matches', staffShipmentScript.includes("state.staff?.role==='super_admin'?'<button class=\"btn primary\" id=\"bindReceiptCustomer\"") && staffShipmentScript.includes('const directoryId=String(r.directory_customer_id||\'\').trim()') && staffShipmentScript.includes('if(matches.length!==1)') && staffShipmentScript.includes('await bindCustomerLogin(String(matches[0].id))')],
  ['staff customer table distinguishes Auth-linked from unlinked customer accounts', staffConsoleVersionedScript.includes("x.auth_user_id?'هەژمار بەستراوە':'هەژمار پەیوەست نییە'")],
  ['customer console displays tracking IDs and customer cargo', customerPortalSource.includes('item.tracking_id||item.tracking_number||item.customer_gc_code||item.id') && customerPortalSource.includes('renderShipments(rows, dashboard.cargo_items || [])')],
  ['customer finance ledger is scoped to canonical GC and customer-facing transaction types', customerSelfSource.includes(".eq('gc_code',financeCode).in('type',['customer_charge','customer_payment','refund','adjustment'])") && customerSelfSource.includes('customer_transactions:customerTransactions.data||[]')],
  ['staff finance charge/payment creates and updates send deduplicated customer notifications', staffOpsHubSource.includes('async function notifyCustomerFinance') && staffOpsHubSource.includes("onConflict:'customer_user_id,event_key'") && staffOpsHubSource.includes("notifyCustomerFinance(a,created,'created')") && staffOpsHubSource.includes("notifyCustomerFinance(a,updated,'updated')")],
  ['customer portal displays only returned customer finance transaction history', customerPortalSource.includes('customerTransactions = []') && customerPortalSource.includes('dashboard.customer_transactions || []') && customerPortalSource.includes('customer_charge')],
  ['customer portal uses a versioned filename and includes cargo/finance integration', unifiedShell.includes('/gc-csp-scripts/customer-portal-inline-20261017.js?v=20261017-13') && customerPortalVersionedScript.includes('dashboard.customer_transactions || []') && customerPortalVersionedScript.includes('renderShipments(rows, dashboard.cargo_items || [])')],
  ['shipment membership migration is locked to service role and backfills cargo owners', shipmentCustomerLinksMigration.includes('shipment_customer_links_shipment_customer_key') && shipmentCustomerLinksMigration.includes('revoke all on table public.shipment_customer_links from anon, authenticated') && shipmentCustomerLinksMigration.includes('from public.shipment_cargo_items ci')],
  ['customer notification upsert conflict target has a matching full unique index', notificationIndexMigration.includes('create unique index if not exists customer_notifications_event_key_full_uidx') && notificationIndexMigration.includes('rename to customer_notifications_event_key_uidx')],
  ['customer navigation initializes all declared icons without runtime reference errors', customerNavigation.includes('const mountIcons = (root = document) =>') && customerNavigation.includes('node.innerHTML = icons[key]') && ['user','wallet','documents','moving','warehouse','route','send','lock','logout'].every(icon => customerNavigation.includes(icon + ':'))],
  ['customer view controller includes dynamically-mounted account settings', customerNavigation.includes("const allSections = () => [...main.querySelectorAll(':scope > section')]") && customerNavigation.includes('allSections().forEach(section =>')],
  ['staff console is visible only after backend role verification', customerSettingsHub.includes("/functions/v1/account-self-profile") && customerSettingsHub.includes("profile?.kind === 'staff'") && customerSettingsHub.includes("STAFF_ROLES.has(profile.role)") && customerSettingsHub.includes("if (staffAccessVerified) window.location.assign('/staff')")],
  ['premium homepage keeps public dock off the content on mobile', customerStyleLoader.includes('gc-homepage-signature-20261016.css?v=10') && customerWorkspaceStyles.includes('gc-customer-service-card') && read('gc-homepage-signature-20261016.css').includes('body:not(.gc-customer-app) .gc-mobile-dock-v3{display:none!important')],
  ['premium hero uses existing logistics imagery', read('gc-homepage-signature-20261016.css').includes("url('/assets/gc-air-freight-hero-1440.webp')")],
  ['mobile homepage is compact and does not float over form inputs', read('gc-homepage-signature-20261016.css').includes('#gcApp .gc-announcement { display:none!important; }') && read('gc-homepage-signature-20261016.css').includes('body .gc-whatsapp-float {display:none!important;}') && read('gc-homepage-signature-20261016.css').includes('#gcApp {padding-bottom:0!important;}')],
  ['customer transport cards use real air sea and land images', ['gc-air-freight-hero-640.webp','gc-sea-freight-hero-640.webp','gc-land-freight-hero-640.webp'].every(image => customerWorkspaceStyles.includes(image))],
  ['customer content clears the five-tab mobile navigation', customerWorkspaceStyles.includes('padding-bottom:calc(132px + env(safe-area-inset-bottom))') && customerDockStyles.includes('padding-bottom:calc(136px + env(safe-area-inset-bottom))')],
  ['current premium styles are cache-busted in the index', unifiedShell.includes('gc-homepage-signature-20261016.css?v=10') && unifiedShell.includes('gc-live-mobile-v3.css?v=20261017-2') && unifiedShell.includes('gc-customer-mobile-dock-20261016.css?v=5') && unifiedShell.includes('gc-public-customer-style-loader-20261014.js?v=24')],
  ['customer route scripts are cache-busted after navigation fixes', unifiedShell.includes('gc-settings-hub.js?v=20261017-13') && unifiedShell.includes('gc-dashboard-preferences-20261003.js?v=20261017-3') && unifiedShell.includes('gc-unified-customer-experience-20261016.js?v=20261017-1')],
  ['middleware refreshes the versioned settings and injected assets', productionMiddleware.includes("const VERSION = '20261017-13';") && productionMiddleware.includes('/gc-settings-hub.js?v=${VERSION}') && productionMiddleware.includes('/gc-settings-hub.css?v=${VERSION}')],
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
  ['style loader script is cache-busted in index', unifiedShell.includes('gc-public-customer-style-loader-20261014.js?v=24')],
  ['signature customer layer is loaded after the mobile dock', unifiedShell.includes('gc-customer-experience-signature-20261017.css?v=2') && customerStyleLoader.includes('gc-customer-experience-signature-20261017.css?v=2')],
  ['customer home has three direct paths to shipments, billing, and support', (unifiedShell.match(/class="gc-quick-action"/g)||[]).length === 3 && unifiedShell.includes('href="#shipmentsSection"') && unifiedShell.includes('href="#records"') && unifiedShell.includes('href="#support"')],
  ['customer home uses real air freight artwork and responsive hero styling', customerSignatureStyles.includes("url('/assets/gc-air-freight-hero-960.webp')") && customerSignatureStyles.includes("url('/assets/gc-air-freight-hero-640.webp')") && customerSignatureStyles.includes('@media(max-width:900px)')],
  ['support remains reachable from account settings', read('gc-settings-hub.js').includes("gcSelectCustomerView('support')")],
  ['legacy GC sign-in explains secure staff linking', unifiedShell.includes('gc-auth-support-note') && unifiedShell.includes('wa.me/9647507577137')],
  ['signed-out claim prompt offers support without self-linking', customerPortalAuth.includes('gc-account-help-action') && customerSelfSource.includes('self-service linking is disabled')],
  ['customer signup remains staff-provisioned', customerAccountEntry.includes('does not expose') && accountAdminSource.includes("Only Super Admin can bind customer accounts")],
  ['customer auth-help assets have matching cache references', unifiedShell.includes('gc-customer-workspace-elite-20261014.css?v=23') && unifiedShell.includes('/gc-csp-scripts/customer-portal-inline-20261017.js?v=20261017-13')],
  ['public customer registration endpoint is retired', !retiredRegisterFunction.includes('SUPABASE_SERVICE_ROLE_KEY') && !retiredRegisterFunction.includes('createUser(') && !retiredRegisterFunction.includes('register_customer_with_gc') && retiredRegisterFunction.includes('CUSTOMER_REGISTRATION_DISABLED')],
  ['retired registration function requires JWT at gateway', supabaseAuthConfig.includes('[functions.customer-gc-register]\nverify_jwt = true')],
  ['GC-code login remains public for its credential check', supabaseAuthConfig.includes('[functions.customer-gc-login]\nverify_jwt = false') && read('supabase/functions/customer-gc-login/index.ts').includes('signInWithPassword')],
  ['customer login prevents native form navigation', customerPortalAuth.includes("$('authForm').addEventListener('submit', async (event) => {") && customerPortalAuth.includes('event.preventDefault();') && !customerPortalAuth.includes("$('signIn').addEventListener('click'")],
  ['legacy login, registration, and customer-access files redirect into the one page', [legacyLoginPage, legacyRegisterPage, legacyAccessPage].every(page => page.includes("window.location.replace('/#auth')") && !page.includes('customer-gc-register') && !page.includes('loginForm'))],
  ['legacy auth paths redirect to the unified customer entry', ['/login /#auth 302','/login/ /#auth 302','/login.html /#auth 302','/register /#auth 302','/register/ /#auth 302','/register.html /#auth 302','/customer-access /#auth 302','/customer-access/ /#auth 302','/customer-access.html /#auth 302'].every(route => authRedirects.includes(route))],
  ['staff console exposes customer linkage filters', accountsConsoleHtml.includes('id="customerLinkFilter"') && accountsConsoleHtml.includes('value="unlinked"') && accountsConsoleHtml.includes('value="linked"') && accountsConsoleHtml.includes('value="inactive-unlinked"')],
  ['customer linkage filter is functional', accountsConsoleScript.includes("customerLinkFilter')?.addEventListener('change', renderList)") && accountsConsoleScript.includes("linkFilter === 'unlinked' ? (!linked && active)") && accountsConsoleScript.includes("linkFilter === 'inactive-unlinked' ? (!linked && !active)")],
  ['customer linkage summary warns Super Admin to verify identity', accountsConsoleScript.includes('دوای پشتڕاستکردنەوەی ناسنامە') && accountAdminSource.includes('Only Super Admin can bind customer accounts')],
  ['staff console script cache is refreshed', accountsConsoleHtml.includes('gc-csp-scripts/accounts-console-inline-1.js?v=20261016-5')],
  ['main Staff OS shows customer identity-linking guidance', staffConsoleScript.includes('customer-link-guidance') && staffConsoleScript.includes('پێش Bind، ناسنامەی کڕیار پشتڕاست بکەرەوە')],
  ['main Staff OS filters inactive unlinked customers', staffConsoleScript.includes("filter==='inactive-unlinked'?x.is_active===false&&!x.auth_user_id:true") && staffConsoleScript.includes('value="inactive-unlinked"')],
  ['customer binding stays Super Admin only', staffConsoleScript.includes("state.staff?.role !== 'super_admin'") && accountAdminSource.includes('Only Super Admin can bind customer accounts')],
  ['customer account binding requires Super Admin identity verification and an exact GC-code re-entry on the server', accountAdminSource.includes("payload.identity_verified !== true") && accountAdminSource.includes("normalizeGcCode(payload.confirmed_gc_code)") && accountAdminSource.includes('identity_verified_by: actor.id') && staffConsoleVersionedScript.includes('confirmed_gc_code: confirmedCode') && accountsConsoleScript.includes('confirmed_gc_code: confirmedCode')],
  ['customer account binding instructs GC-code login without exposing the internal auth email', staffConsoleScript.includes('GC Code / Login ID: ${result.gc_code || code}') && !staffConsoleScript.includes('Login: ${result.login_email}') && staffConsoleScript.includes('پێویست نییە ئیمەیل بنووسێت')],
  ['staff console uses a versioned filename and the GC-code login instructions', staffConsoleHtml.includes('/staff-os-v5-20261017.js?v=20261019-9') && staffConsoleVersionedScript.includes('customerAccessGc') && staffConsoleVersionedScript.includes('customerAccessPassword') && staffConsoleVersionedScript.includes('copyCustomerAccess') && !staffConsoleVersionedScript.includes('Login: ${result.login_email}')],
  ['main Staff OS loads current customer filter assets', staffConsoleHtml.includes('staff-os-v5.css?v=20261019-4') && staffConsoleHtml.includes('staff-os-v5-20261017.js?v=20261019-9') && staffConsoleStyles.includes('.customer-link-guidance')],
  ['main Staff OS loads the guided shared customer-account bridge', staffConsoleHtml.includes('/gc-staff-customer-bridge-20261019.js?v=1') && staffCustomerBridgeScript.includes("SUPABASE_URL + '/functions/v1/account-admin'") && staffCustomerBridgeScript.includes('identity_verified: true') && staffCustomerBridgeScript.includes('confirmed_gc_code: confirmedCode') && staffCustomerBridgeScript.includes('event.stopImmediatePropagation()')],
  ['staff and customer account bridge share responsive visual components', staffUnifiedStyles.includes('.gc-customer-bridge-panel') && staffUnifiedStyles.includes('.gc-customer-bind-modal') && staffUnifiedStyles.includes('@media (max-width: 760px)')],
]
for (const [label, passed] of unifiedContracts) {
  if (passed) ok(label)
  else fail(label)
}

console.log('Mobile UI integrity contracts')
const mobileUiCss = read('gc-ui-integrity-mobile-20261017.css')
const customerViewScript = read('gc-dashboard-preferences-20261003.js')
const staffEnhancementLoader = read('staff-os-v5-enhancement-loader-20261017.js')
const staffMobileDockSource = read('gc-staff-mobile-dock-20261016.js')
const staffRescueScript = read('staff-os-v5-rescue.js')
const staffConsoleEliteCss = read('gc-staff-console-elite-20261018.css')
const staffOsHtml = read('staff-os-v5.html')
const staffShipmentScript = read('staff-os-v5-20261017.js')

const warehouseReceivingSource = read('supabase/functions/warehouse-receiving/index.ts')
const warehouseNotifySource = read('supabase/functions/warehouse-notify/index.ts')
const warehouseReceiptNotificationMigration = read('supabase/migrations/20261017181111_fix_warehouse_receipt_customer_notifications.sql')
const warehouseReceiptPortalRouteMigration = read('supabase/migrations/20261017181944_fix_warehouse_receipt_portal_route.sql')
const warehouseReceiptPreferenceMigration = read('supabase/migrations/20261017182723_warehouse_receipt_respect_in_app_preferences.sql')
const customerNotificationFanoutMigration = read('supabase/migrations/20261017203455_fix_customer_notification_uuid_text_join.sql')
const fkIndexMigration = read('supabase/migrations/20261017204122_add_missing_fk_covering_indexes.sql')
const rlsOptimizationMigration = read('supabase/migrations/20261017204218_optimize_customer_order_rls_policies.sql')
const customerWarehouseEvidenceCss = read('gc-customer-warehouse-evidence-20261017.css')

const mobileUiContracts = [
  ['customer workspace references the final mobile integrity CSS', publicShell.includes('gc-ui-integrity-mobile-20261017.css?v=6')],
  ['customer style loader puts integrity CSS after signature styles', customerStyleLoader.indexOf('gc-ui-integrity-mobile-20261017.css?v=6') > customerStyleLoader.indexOf('gc-customer-experience-signature-20261017.css?v=2')],
  ['Staff OS references the current integrity CSS and cache-busted loader', staffOsHtml.includes('gc-ui-integrity-mobile-20261017.css?v=6') && staffOsHtml.includes('staff-os-v5-enhancement-loader-20261017.js?v=18')],
  ['Staff mobile dock prioritizes the Dubai manifest while keeping Customers in the full module drawer', staffMobileDockSource.includes("['land-manifests', 'مانيفێست', 'package']") && !staffMobileDockSource.includes("['customers', 'کڕیاران', 'users']") && staffConsoleVersionedScript.includes("['customers','کڕیاران','']") && staffEnhancementLoader.includes('/gc-staff-mobile-dock-20261016.js?v=6')],
  ['Dubai-to-Erbil land manifest is loaded into Staff OS with Excel support', staffOsHtml.includes('gc-staff-land-manifest-20261018.css?v=1') && staffOsHtml.includes('gc-staff-land-manifest-20261018.js?v=2') && staffOsHtml.includes('xlsx@0.18.5/dist/xlsx.full.min.js') && staffOsHtml.indexOf('staff-os-v5-20261017.js') < staffOsHtml.indexOf('xlsx@0.18.5') && staffOsHtml.indexOf('xlsx@0.18.5') < staffOsHtml.indexOf('gc-staff-land-manifest-20261018.js?v=1')],
  ['Dubai-to-Erbil land manifest imports Excel with exact manifest columns', ['customer_name:', 'shipment_date:', 'cargo_type:', 'box_count:', 'quantity_pc:', 'weight_kg:', 'sell_price:'].every(key => staffLandManifestUI.includes(key)) && ['name','date','type','box','pcs','kg','sell price'].every(header => staffLandManifestUI.toLowerCase().includes(header)) && staffLandManifestUI.includes('XLSX.read(data,{type:\'array\',cellDates:true})')],
  ['Land manifest numeric cell parser is declared exactly once', (staffLandManifestUI.match(/const numCell\s*=/g)||[]).length === 1],
  ['Land manifest saves each line transactionally through a staff-only database RPC', landManifestSource.includes("SUPABASE_SERVICE_ROLE_KEY") && landManifestSource.includes("admin.rpc('create_dubai_land_manifest'") && landManifestSource.includes("admin.rpc('set_dubai_land_manifest_status'") && landManifestSource.includes("admin.rpc('update_dubai_land_manifest_row'") && landManifestSource.includes("admin.rpc('archive_dubai_land_manifest_row'") && landManifestMigration.includes('SECURITY DEFINER') && landManifestMigration.includes('GRANT EXECUTE ON FUNCTION public.create_dubai_land_manifest')],
  ['Land manifest validates GC codes and counts unresolved rows for manual review', landManifestSource.includes("/^GC-[A-Z0-9-]{2,30}$/") && landManifestMigration.includes("'linked_rows',v_linked") && landManifestMigration.includes("'unlinked_rows',v_count-v_linked") && staffLandManifestUI.includes('normalizeGC') && staffLandManifestUI.includes('پێویستی بە پشکنینی GC')],
  ['Land manifest transitions create tracking events and customer notifications without UUID/text casts', landManifestMigration.includes("INSERT INTO public.shipment_tracking_events") && trackingNotificationCastMigration.includes("WHERE id::text = NULLIF(BTRIM(NEW.shipment_id), '')") && trackingNotificationCastMigration.includes('s.id,')],
  ['Land manifest dates are rendered in Erbil local time to preserve the Excel calendar day', staffLandManifestUI.includes("timeZone: 'Asia/Baghdad'") && staffLandManifestUI.includes("const date=dateOnly(m.actual_departure||m.planned_departure||m.created_at||'');")],
  ['API returns the land manifest shipment date in Erbil local time', landManifestSource.includes('const dateOnlyBaghdad = (value: unknown)') && landManifestSource.includes('shipment_date: dateOnlyBaghdad(row.dispatched_at || row.created_at || \'\')')],
  ['Dubai/Erbil manifest reads are restricted by operational staff branch', landManifestSource.includes("const canRead = global || ['accountant','finance'].includes(role) || dubaiScope || erbilScope") && landManifestSource.includes('if (!ctx.canRead) throw new HttpError')],
  ['Land manifest UI has responsive mobile cards and line editors', staffLandManifestCss.includes('@media(max-width:760px)') && staffLandManifestCss.includes('.gc-land-line-fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}') && staffLandManifestCss.includes('.gc-land-manifest-card')],
    ['Admin Staff OS exposes manual in-app notification queue processing only', staffShipmentScript.includes('logistics-control-plane') && staffShipmentScript.includes("action:'process_outbox'") && staffShipmentScript.includes('data-process-in-app-outbox') && staffShipmentScript.includes("item.channel === 'in_app'") && staffShipmentScript.includes("action:'cancel_outbox'") && staffShipmentScript.includes('ageHours(item) >= 24') && staffShipmentScript.includes('gcOutboxConfirmProcess') && read('supabase/functions/logistics-control-plane/index.ts').includes("action === 'cancel_outbox'")],
  ['Staff dashboard account-link shortcut opens the active unlinked customer filter', staffShipmentScript.includes('data-customer-status-filter="unlinked"') && staffShipmentScript.includes("await loadTab(x.dataset.jump)") && staffShipmentScript.includes("status.dispatchEvent(new Event('change',{bubbles:true}))")],
['Staff Console pins the unified v5 visual layer after compatibility styles', staffOsHtml.includes('gc-staff-console-elite-20261018.css?v=6') && staffOsHtml.includes('gc-staff-polish-mobile-20261019.css?v=6') && staffOsHtml.includes('gc-staff-ui-refinement-20261019-v4.css?v=4') && staffOsHtml.includes('gc-staff-live-workspace-20261019.css?v=4') && read('gc-staff-live-workspace-20261019.css').includes('.gc-live-wh-list') && read('gc-staff-ui-refinement-20261019-v4.css').includes('@media (max-width: 760px)') && staffOsHtml.includes('staff-os-v5-enhancement-loader-20261017.js?v=18') && staffEnhancementLoader.indexOf("loadStyle('/gc-staff-polish-mobile-20261019.css?v=6')") > staffEnhancementLoader.indexOf("loadStyle('/gc-staff-console-elite-20261018.css?v=6')") && staffEnhancementLoader.includes("const href = '/gc-staff-live-workspace-20261019.css?v=4'") && productionMiddleware.includes('gc-staff-polish-mobile-20261019.css?v=6') && productionMiddleware.includes('gc-staff-console-elite-20261018.css?v=6') && productionMiddleware.includes('eliteThemeLink + finalRepairLink') && productionMiddleware.includes('finalDesignLink + finalWorkspaceLink')],
  ['Staff workspace v3 supports dark tables, forms, dialogs and RTL/LTR data', read('gc-staff-live-workspace-20261019.css').includes('Locale-safe operations data and consistent dark/light workspace surfaces (v3).') && read('gc-staff-live-workspace-20261019.css').includes('unicode-bidi: isolate') && read('gc-staff-live-workspace-20261019.css').includes('html[data-gc-theme="dark"] body.gc-staff-os-shell #app .table-wrap') && read('gc-staff-live-workspace-20261019.css').includes('html[data-gc-theme="dark"] body.gc-staff-os-shell .modal')],
  ['Premium Staff Console has a distinct light work surface with dark rail and a mobile five-action dock', staffConsoleEliteCss.includes('background:rgba(255,255,255,.97) !important') && staffConsoleEliteCss.includes('linear-gradient(165deg,#17384f 0%,#102a3d 55%,#0b2031 100%)') && staffConsoleEliteCss.includes('grid-template-columns:repeat(5,minmax(0,1fr))!important') && staffConsoleEliteCss.includes('@media(max-width:760px)')],
  ['Staff recovery handles errors from the versioned bundle and waits beyond Supabase startup', staffRescueScript.includes("includes('staff-os-v5-20261017.js')") && staffRescueScript.includes('>= 18000') && staffOsHtml.includes('staff-os-v5-rescue.js?v=20261019-4')],
  ['Recovery and loading screens are styled by the final premium staff theme', staffConsoleEliteCss.includes('.gc-rescue-shell') && staffConsoleEliteCss.includes('.gc-rescue-card') && staffConsoleEliteCss.includes('background:#ffffff!important')],
  ['Staff shipment cards and filter controls have isolated, responsive mobile layouts', staffConsoleEliteCss.includes('.shipment-card-head {') && staffConsoleEliteCss.includes('grid-template-columns:minmax(0,1fr)!important') && staffConsoleEliteCss.includes('body.gc-staff-os-shell #app .toolbar') && staffConsoleEliteCss.includes('@media(max-width:760px)') && staffOsHtml.includes('gc-staff-console-elite-20261018.css?v=6')],
  ['middleware re-appends the Staff Console elite theme after legacy staff CSS injections', productionMiddleware.includes('Staff UI styles are injected by compatibility layers above.') && productionMiddleware.indexOf('href="/gc-staff-console-elite-20261018.css?v=6"') > productionMiddleware.indexOf('href="/staff-login-polish.css') && productionMiddleware.lastIndexOf('Staff UI styles are injected by compatibility layers above.') < productionMiddleware.indexOf('const headers=applySecurityHeaders')],
  ['Staff intake records photo time and captures GPS only after a user action', staffShipmentScript.includes('receiptGpsBtn') && staffShipmentScript.includes('navigator.geolocation.getCurrentPosition') && staffShipmentScript.includes('name="photo_taken_at"') && staffShipmentScript.includes('name="location_captured_at"') && staffShipmentScript.includes('new Date(position.timestamp||Date.now()).toISOString()')],
  ['staff receipt intake previews selected photos and rejects oversize evidence before upload', staffShipmentScript.includes('id="receiptPhotoPreview"') && staffShipmentScript.includes('URL.createObjectURL(file)') && staffShipmentScript.includes('file.size>12*1024*1024') && staffShipmentScript.includes('totalBytes>48*1024*1024') && staffShipmentScript.includes('URL.revokeObjectURL')],
  ['Staff receipt detail displays GPS evidence and actual customer login-link state', staffShipmentScript.includes('r.account_linked') && staffShipmentScript.includes('md.location_captured_at') && staffShipmentScript.includes('customerAccountLinked')],
  ['Warehouse receipt table shows each customer portal-link state and opens the owner record', staffShipmentScript.includes('هەژماری Portal') && staffShipmentScript.includes('openReceiptCustomer') && staffShipmentScript.includes("await loadTab('customers')")],
  ['Staff scan normalizes generated carton barcodes to the owning GC code', staffShipmentScript.includes('const suffix=fullCode.match') && staffShipmentScript.includes('fullCode.slice(0,suffix.index)') && staffShipmentScript.includes('tracking:suffix?fullCode:raw') && staffShipmentScript.includes('receipt.cartons||[]')],
  ['Warehouse intake warns that mixed customer codes must be received separately', staffShipmentScript.includes('receipt-owner-routing-hint') && staffShipmentScript.includes('هەر کۆدێک بە جیا تۆمار بکە')],
  ['Admin and Super Admin must choose the actual receiving warehouse explicitly', staffShipmentScript.includes("(['super_admin','admin'].includes(staffRole)?'':'Dubai')") && staffShipmentScript.includes('یەکەم کۆگای وەرگرتن هەڵبژێرە')],
  ['Final Staff command styles include clear GC ownership guidance for mobile', read('gc-staff-command-system-20261017.css').includes('.receipt-owner-routing-hint') && read('gc-staff-command-system-20261017.css').includes('max-width: 760px')],

  ['Warehouse receipt details visibly warn when photo signing needs retry', staffShipmentScript.includes('r.photo_signing_warning') && staffShipmentScript.includes('دروستکردنی لینک سەرکەوتوو نەبوو')],
  ['Warehouse upload size is bounded before writing photos', warehouseReceivingSource.includes('MAX_RECEIPT_TOTAL_PHOTO_BYTES=48*1024*1024') && warehouseReceivingSource.includes('All receipt photos together must be 48 MB or smaller')],
  ['Private Storage bucket MIME/size limits are tracked by migration', read('supabase/migrations/20261017195000_harden_warehouse_receipt_photo_bucket.sql').includes('file_size_limit = 12582912') && read('supabase/migrations/20261017195000_harden_warehouse_receipt_photo_bucket.sql').includes('public IS FALSE')],

  ['Warehouse uploads whitelist safe image formats and roll back partial uploads', warehouseReceivingSource.includes('PHOTO_MIME_BY_EXTENSION') && warehouseReceivingSource.includes('Unsupported photo type. Use JPEG, PNG, WebP or HEIC/HEIF images.') && warehouseReceivingSource.includes('partial photo cleanup failed')],
  ['Photo URL signing failures do not make saved warehouse receipts look like failed inserts', warehouseReceivingSource.includes('saved receipt photo signing failed') && warehouseReceivingSource.includes('list photo signing failed')],
  ['Warehouse API preserves GPS capture timestamp and validates latitude/longitude ranges', warehouseReceivingSource.includes('location_captured_at:timestampIso') && warehouseReceivingSource.includes("coordinate(form.get('latitude'),-90,90)") && warehouseReceivingSource.includes("coordinate(form.get('longitude'),-180,180)")],
  ['Warehouse receipt listing exposes only a boolean account-link status, not an auth user ID', warehouseReceivingSource.includes('account_linked:customerLinks.get') && !warehouseReceivingSource.includes('account_linked:customerLinks.get(String(item.directory_customer_id))||null')],
  ['Previously delivered receipt alerts stay marked sent after preferences change', warehouseReceivingSource.indexOf(":delivered?'notified'") < warehouseReceivingSource.indexOf(":inAppDisabledUsers.has(authId)?'in_app_disabled'")],
  ['Warehouse receipt listing reports the owner-matched in-app notification state without exposing Auth IDs', warehouseReceivingSource.includes(".select('event_key,customer_user_id')") && warehouseReceivingSource.includes(".eq('kind','warehouse_received')") && warehouseReceivingSource.includes("'account_unlinked'") && warehouseReceivingSource.includes("'in_app_disabled'") && warehouseReceivingSource.includes("'notified'") && warehouseReceivingSource.includes('notification_status:notificationStatus') && staffShipmentScript.includes("notification_status==='pending'") && staffShipmentScript.includes("notification_status==='notified'") && staffShipmentScript.includes('ئاگاداری نێردراوە') && staffShipmentScript.includes('چاوەڕوانی ئاگاداری') && staffShipmentScript.includes('receipt بێ هەژمار') && staffConsoleHtml.includes('ئاگاداری') && staffConsoleHtml.includes('staff-os-v5-20261017.js?v=20261019-9')],
  ['Carton label printing exposes the Code 128 barcode action', read('gc-staff-carton-tools-20261017.js').includes('CODE128') && staffOsHtml.includes('gc-staff-carton-tools-20261017.js?v=2')],

  ['customer portal loads the cache-busted warehouse evidence renderer', unifiedShell.includes('gc-csp-scripts/customer-portal-inline-20261017.js?v=20261017-13') && customerPortalVersionedScript.includes('warehouse-receipt-evidence')],
  ['customer notification history shows only a short receipt message and sends evidence to Shipments', unifiedShell.includes('gc-csp-scripts/customer-portal-inline-20261017.js?v=20261019-2') && unifiedShell.includes('gc-customer-warehouse-evidence-20261017.css?v=6') && customerPortalVersionedScript.includes('وردەکاری، وێنە و ژمارەی کارتۆن لە بەشی بارەکان ببینە') && !customerPortalVersionedScript.includes('gc-notification-photo-strip') && !customerPortalVersionedScript.includes('const receiptPhotos = isReceiptNotice') && !customerPortalVersionedScript.includes('const photoMarkup = visibleReceiptPhotos') && !customerPortalVersionedScript.includes('notification-receipt-photo-grid') && customerWarehouseEvidenceCss.includes('.warehouse-receipt-evidence') && customerWarehouseEvidenceCss.includes('.photo-grid') && !customerWarehouseEvidenceCss.includes('.notification-receipt-photo-grid') && !customerWarehouseEvidenceCss.includes('.notification-receipt-meta')],
  ['warehouse receipt endpoint creates unique batches and queues owner-account alerts', read('supabase/functions/warehouse-receiving/index.ts').includes('async function queueReceiptNotifications') && read('supabase/functions/warehouse-receiving/index.ts').includes('submittedBatchCode') && read('supabase/functions/warehouse-receiving/index.ts').includes('warehouse.receipt.created')],
  ['warehouse notification retry is idempotent and only retries failed/cancelled queue items', read('supabase/functions/warehouse-notify/index.ts').includes('async function queueOutboxChannel') && read('supabase/functions/warehouse-notify/index.ts').includes("['failed','cancelled'].includes")],
  ['warehouse receipt only queues WhatsApp/email after explicit opt-in and respects quiet hours', read('supabase/functions/warehouse-receiving/index.ts').includes('preferences?.whatsapp_enabled===true') && read('supabase/functions/warehouse-receiving/index.ts').includes('preferences?.email_enabled===true') && read('supabase/functions/warehouse-receiving/index.ts').includes('nextDeliveryTimeOutsideQuietHours')],
  ['manual warehouse notification retry also honors channel opt-in and quiet hours', read('supabase/functions/warehouse-notify/index.ts').includes('preferences?.whatsapp_enabled === true') && read('supabase/functions/warehouse-notify/index.ts').includes('preferences?.email_enabled === true') && read('supabase/functions/warehouse-notify/index.ts').includes('nextDeliveryTimeOutsideQuietHours')],

  ['customer-self signs private receipt photos for the verified owner account', read('supabase/functions/customer-self/index.ts').includes('createSignedUrls(paths, WAREHOUSE_RECEIPT_SIGNED_URL_TTL)') && read('supabase/functions/customer-self/index.ts').includes('receipts:customerReceipts')],
  ['customer portal shows warehouse, time, weight, individual carton codes and evidence photos in Shipments', customerPortalVersionedScript.includes('item.photo_taken_at') && customerPortalVersionedScript.includes('item.carton_count') && customerPortalVersionedScript.includes('carton-manifest-list') && customerPortalVersionedScript.includes('carton.code') && customerPortalVersionedScript.includes('warehouse-receipt-evidence') && customerWarehouseEvidenceCss.includes('.carton-manifest-row') && unifiedShell.includes('gc-csp-scripts/customer-portal-inline-20261017.js?v=20261019-2')],
  ['root customer workspace loads concise real-time receipt alerts without photos', unifiedShell.includes('gc-realtime-notifications-20261003.js?v=7') && read('gc-realtime-notifications-20261003.js').includes("page === '/' && Boolean(document.querySelector('#gcCustomerWorkspace'))") && !read('gc-realtime-notifications-20261003.js').includes('fetchReceiptPhotoPreview') && !read('gc-realtime-notifications-20261003.js').includes('gcReceiptToastPhotoGrid') && read('gc-realtime-notifications-20261003.js').includes('وردەکاری، وێنە و ژمارەی کارتۆن لە بەشی بارەکان ببینە') && read('gc-realtime-notifications-20261003.js').includes("n.kind === 'warehouse_received'")],
  ['Staff OS uses the same real-time bridge version as the customer workspace for session-bound alerts', staffOsHtml.includes('gc-realtime-notifications-20261003.js?v=7') && !staffOsHtml.includes('gc-realtime-notifications-20261003.js?v=3')],
  ['warehouse intake does not insert an undefined created_at column', !read('supabase/functions/warehouse-receiving/index.ts').includes('created_at:receivedAt') && !read('supabase/functions/warehouse-receiving/index.ts').includes('receipt.received_at||receipt.created_at')],
  ['warehouse retry function does not select non-existent receipt created_at', !read('supabase/functions/warehouse-notify/index.ts').includes('received_at,created_at')],
  ['real-time bridge subscribes after sign-in and cleans up after sign-out', read('gc-realtime-notifications-20261003.js').includes('client.auth.onAuthStateChange') && read('gc-realtime-notifications-20261003.js').includes("event === 'SIGNED_OUT'")],
  ['staff warehouse table uses schema-backed warehouse and timestamp fields', staffShipmentScript.includes('x.location||x.source_warehouse||x.warehouse') && staffShipmentScript.includes('x.received_at||x.scanned_at||x.updated_at')],
  ['customer receipt renderer falls back to source warehouse and receipt photo time', customerPortalVersionedScript.includes('item.location || item.source_warehouse || item.warehouse') && customerPortalVersionedScript.includes('item.received_at || item.photo_taken_at')],
  ['warehouse receipt API persists a unique record per carton before shipment linking', warehouseReceivingSource.includes('ensureReceiptCartons') && warehouseReceivingSource.includes('cartonManifest=await ensureReceiptCartons') && warehouseReceivingSource.includes('p_package_code:String(carton.carton_code)')],
  ['carton manifest table keeps direct public/authenticated reads revoked', read('supabase/migrations/20261017185000_warehouse_receipt_cartons.sql').includes('REVOKE ALL ON TABLE public.warehouse_receipt_cartons FROM PUBLIC, anon, authenticated') && read('supabase/migrations/20261017185000_warehouse_receipt_cartons.sql').includes('ENABLE ROW LEVEL SECURITY')],
  ['customer self API filters carton manifest by the owning directory record', read('supabase/functions/customer-self/index.ts').includes(".eq('customer_directory_id', customer.id)") && read('supabase/functions/customer-self/index.ts').includes('cartonsByReceipt.get(String(receipt.id))')],
  ['customer notification includes carton codes only for its receipt owner', warehouseNotifySource.includes('.eq(\'customer_directory_id\', customer.id)') && warehouseNotifySource.includes('carton_codes: cartonCodes') && warehouseReceivingSource.includes('carton_codes:cartonCodes')],
  ['customer receipt UI adds a per-carton manifest from the authenticated dashboard event', read('gc-customer-carton-manifest-20261017.js').includes("window.addEventListener('gc:customer-loaded'") && read('gc-customer-carton-manifest-20261017.js').includes('warehouse-carton-manifest')],
  ['staff receipt detail can print Code 128 labels for each GC carton', staffShipmentScript.includes('warehouse-carton-manifest-card') && read('gc-staff-carton-tools-20261017.js').includes('CODE128') && staffOsHtml.includes('gc-staff-carton-tools-20261017.js?v=2')],



  ['Staff OS loads the scoped command-system design layer', staffOsHtml.includes('gc-staff-command-system-20261017.css?v=2') && staffOsHtml.includes('<body class="gc-staff-os-shell">')],
  ['Staff auth persistence is isolated from customer portal sessions', staffShipmentScript.includes("storageKey: 'gc-staff-os-auth-v5-ahslifnthiwfkmaswjno'")],
  ['Staff overview connects to the shared customer workspace', staffShipmentScript.includes('const customerBridgePanel =') && staffShipmentScript.includes('${customerBridgePanel}') && staffShipmentScript.includes('CUSTOMER WORKSPACE · SHARED DATA')],
  ['Staff overview shows failed backend feeds instead of silently reporting empty data and 100% health', staffShipmentScript.includes('const failedFeeds = results.flatMap') && staffShipmentScript.includes('const serviceHealthPanel = failedFeeds.length ?') && staffShipmentScript.includes('Math.min(baseHealth, 60)') && staffShipmentScript.includes('data-overview-retry') && staffShipmentScript.includes('const exceptionCount = openAlerts + stale.length + overdue.length + failedFeeds.length') && staffOsHtml.includes('staff-os-v5-20261017.js?v=20261019-9')],
  ['Staff and customer consoles expose a direct safe portal handoff', staffOsHtml.includes('href="/#auth"') && staffShipmentScript.includes('gc-customer-console-link')],
  ['Mobile staff drawer reuses the core navigation SVG icons', staffEnhancementLoader.includes("'/gc-staff-mobile-dock-20261016.js?v=6'") && staffEnhancementLoader.includes("loadStyle('/gc-staff-command-system-20261017.css?v=2')")],

  ['staff enhancement loader loads integrity CSS after the mobile dock', staffEnhancementLoader.indexOf("loadStyle('/gc-ui-integrity-mobile-20261017.css?v=6')") > staffEnhancementLoader.indexOf("loadStyle('/gc-staff-mobile-dock-20261016.css?v=5')")],
  ['Staff enhancements survive slow logins and attach only after the shell mounts', staffEnhancementLoader.includes('window.__gcStaffShellWaitObserver') && staffEnhancementLoader.includes('new MutationObserver(() => { attemptLoad(); })') && staffEnhancementLoader.includes('Observe the app instead of stopping after 12 seconds') && !staffEnhancementLoader.includes('tries >= 120')],
  ['Mobile staff dock hides during logout and rebinds to the new shell and sidebar after login', staffMobileDockSource.includes('const syncShell = () =>') && staffMobileDockSource.includes('dock.hidden = !shellExists') && staffMobileDockSource.includes('menuObserver')===false && staffMobileDockSource.includes('const currentNav = document.querySelector(\'.gc-side .nav\')') && staffMobileDockSource.includes('shellObserver.observe(appRoot, {childList:true,subtree:true})') && !staffMobileDockSource.includes('setTimeout(() => observer.disconnect(), 15000)')],
  ['customer view selector includes the toolbar and isolated section views', customerViewScript.includes("const allSections = () => [...main.querySelectorAll(':scope > section, :scope > .workspace-toolbar')]") && customerViewScript.includes("settings: ['gcAccountSettings']") && customerViewScript.includes("shipments: ['shipmentsSection']") && customerViewScript.includes("requests: ['quotesPanel', 'newRequest']") && customerViewScript.includes("'#commercial': ['commercial']") && customerViewScript.includes("'#records': ['records']")],
  ['customer dock declares five separate destinations', ['home','shipments','requests','notifications','settings'].every(key => publicShell.includes('data-dock-tab="' + key + '"'))],
  ['orders and requests expose distinct secondary screens', publicShell.includes('href="#records">بەڵگە و پارەدان') && publicShell.includes('href="#commercial">حیسابکردنی نرخ')],
  ['Staff shipment summary updates from the active filtered rows', staffShipmentScript.includes('const summaryMetrics = { total: rows.length, air: 0, land: 0, sea: 0, customers: 0, pieces: 0, cartons: 0 }') && staffShipmentScript.includes('rows.forEach((shipment) =>') && staffShipmentScript.includes('if (MODES.includes(mode)) summaryMetrics[mode] += 1;') && staffShipmentScript.includes('id="shipmentSummaryGrid"')],
  ['Staff shipment summary includes Air, Land, Sea, customer and cargo totals', ['Air · ئاسمانی','Land · وشکانی','Sea · دەریایی','دانەی کاڵا','کارتۆن'].every(label => staffShipmentScript.includes(label))],
  ['Staff shipment summary has two-column mobile styles', mobileUiCss.includes('.shipment-summary-grid') && mobileUiCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr))') && mobileUiCss.includes('.shipment-summary-note')],
  ['Staff Intelligence chat has a dedicated flexible message row', mobileUiCss.includes('grid-template-rows: auto auto auto minmax(0, 1fr) auto !important') && mobileUiCss.includes('#gcStaffAiPanel .gc-ai-messages')],
  ['only the active customer dock destination receives the bright active treatment', mobileUiCss.includes('.dock-primary:not(.active)') && mobileUiCss.includes('button[aria-current="page"]')],
  ['Customer workspace renders the receipt list target used by the evidence renderer', publicShell.includes('id="receipts"') && customerPortalVersionedScript.includes("setHtml('receipts'")],
  ['warehouse receipt alerts link to Shipments', warehouseReceivingSource.includes("const actionUrl='/#shipmentsSection'") && warehouseNotifySource.includes("const actionUrl = '/#shipmentsSection'")],
  ['receipt trigger is idempotent and routes concise alerts to Shipments', read('supabase/migrations/20261018214814_simplify_dubai_receipt_customer_alerts.sql').includes('ON CONFLICT (customer_user_id, event_key) DO NOTHING') && read('supabase/migrations/20261018214814_simplify_dubai_receipt_customer_alerts.sql').includes("'/#shipmentsSection'") && read('supabase/migrations/20261018214814_simplify_dubai_receipt_customer_alerts.sql').includes('وردەکاری، وێنە و ژمارەی کارتۆن لە بەشی بارەکان ببینە')],
  ['customer notification fan-out safely matches UUID shipments to legacy text notification ids', customerNotificationFanoutMigration.includes("s.id::text = NULLIF(BTRIM(NEW.shipment_id), '')") && customerNotificationFanoutMigration.includes('CREATE OR REPLACE FUNCTION public.fanout_customer_notification()')],
  ['staff quote calculator handles numeric/volumetric weights server-side and requires staff access', operationsV4Source.includes("if(action==='quote_calculate')") && operationsV4Source.includes('length*width*height/6000') && operationsV4Source.includes('Invalid quote calculation input') && operationsV4Source.includes('Staff permission required')],
  ['unsupported operations actions return a client error instead of 500', operationsV4Source.includes('Invalid|Unsupported action/i.test(m)')],
  ['production advisor foreign-key indexes are covered idempotently', ['customer_legacy_code_review_reviewed_by_idx','financial_records_gc_code_idx','shop_order_items_product_id_idx','warehouse_items_gc_code_idx','warehouse_receipt_cartons_created_by_idx'].every(name => fkIndexMigration.includes('CREATE INDEX IF NOT EXISTS ' + name))],
  ['customer/staff order RLS policies evaluate auth.uid through a scalar subquery', ['gc_customer_shipments_select','shop_orders_customer_read','shop_order_items_customer_read'].every(name => rlsOptimizationMigration.includes('ALTER POLICY ' + name)) && (rlsOptimizationMigration.match(/\(SELECT auth\.uid\(\)\)/g)||[]).length >= 5],
  ['invoice OCR uses an image-capable documented model with the Responses API', invoiceAiSource.includes("Deno.env.get('INVOICE_AI_MODEL')||'gpt-4.1-mini'") && invoiceAiSource.includes("type:'input_image'") && invoiceAiSource.includes('https://api.openai.com/v1/responses')],
  ['invoice OCR requires a server-side OpenAI key and an active staff role', invoiceAiSource.includes("Deno.env.get('OPENAI_API_KEY')") && invoiceAiSource.includes("Deno.env.get('OPENAI_SECRET_KEY')") && invoiceAiSource.includes('Staff role required')],
  ['public-config preflight returns an empty 204 response body', publicConfigSource.includes("new Response(null, { status: 204, headers: headers(origin) })") && !publicConfigSource.includes("new Response('ok', { status: 204")],
  ['all live 204 preflight handlers return null bodies', [publicConfigSource,publicTrackSource,systemHealthSource,staffAuthVerifySource].every(source => /new Response\(null,\s*\{\s*status:\s*204/.test(source))],
  ['customer warehouse evidence styles include responsive photo proof cards', customerWarehouseEvidenceCss.includes('.warehouse-receipt-evidence') && customerWarehouseEvidenceCss.includes('.photo-grid')],
  ['receipt evidence styles contain no notification-card photo or metadata rules', customerWarehouseEvidenceCss.includes('.warehouse-receipt-evidence') && customerWarehouseEvidenceCss.includes('.photo-grid') && !customerWarehouseEvidenceCss.includes('.notification-receipt-photo-grid') && !customerWarehouseEvidenceCss.includes('.notification-receipt-meta')],
  ['owner-scoped receipt photos and carton details stay in Shipments, not notification cards', customerSelfSource.includes("receiptsById.get(eventKey.slice(prefix.length))") && customerSelfSource.includes("action_url: '/#shipmentsSection'") && customerSelfSource.includes('receipts:customerReceipts') && customerPortalVersionedScript.includes("setHtml('receipts'") && customerPortalVersionedScript.includes('warehouse-receipt-evidence') && !customerPortalVersionedScript.includes('gc-notification-photo-strip') && !customerPortalVersionedScript.includes('notification-receipt-photo-grid') && !customerPortalVersionedScript.includes('notification-receipt-meta') && unifiedShell.indexOf('id="shipmentsSection"') < unifiedShell.indexOf('gc-customer-warehouse-evidence-panel') && unifiedShell.indexOf('gc-customer-warehouse-evidence-panel') < unifiedShell.indexOf('id="activity"')],
  ['customer receipt notification route matches Shipments in DB and API', read('supabase/migrations/20261018214814_simplify_dubai_receipt_customer_alerts.sql').includes("'/#shipmentsSection'") && customerSelfSource.includes("action_url: '/#shipmentsSection'")],
  ['warehouse receipt trigger respects in-app opt-out and defaults missing preferences to enabled', warehouseReceiptPreferenceMigration.includes('COALESCE(p.in_app_enabled, TRUE)') && warehouseReceiptPreferenceMigration.includes('v_in_app_enabled IS FALSE')],
  ['branch-scoped warehouse staff are offered only the authorized warehouse location', staffShipmentScript.includes("const availableLocations=roleLocation[state.staff?.role]?[roleLocation[state.staff.role]]:['China','Dubai','Erbil','USA'];") && staffShipmentScript.includes('${availableLocations.map(location =>')],
]
for (const [label, passed] of mobileUiContracts) {
  if (passed) ok(label)
  else fail(label)
}


console.log('Super Admin write-path contracts')
const superAdminUi = read('super-admin-live-control-v2.js')
const superAdminMain = read('super-admin-command-center.js')
const superAdminHtml = read('super-admin-command-center.html')
const accountAdmin = read('supabase/functions/account-admin/index.ts')
const superAdminContracts = [
  ['protected account-admin supports POST list for staff, customers and pricing',
    accountAdmin.includes("if (action === 'list')") &&
    accountAdmin.includes("return json(await listStaff(serviceClient)") &&
    accountAdmin.includes("return json(await listCustomers(serviceClient)") &&
    accountAdmin.includes("return json(await listPricing(serviceClient)")],
  ['protected account-admin supports creating and editing pricing rates',
    accountAdmin.includes('async function createPricing') &&
    accountAdmin.includes('async function updatePricing') &&
    accountAdmin.includes("if (action === 'create') return json(await createPricing")],
  ['USD/IQD update keeps exchange_rates and legacy app_settings synchronized server-side',
    accountAdmin.includes('usd_to_iqd: rate') &&
    accountAdmin.includes("from('app_settings').upsert") &&
    accountAdmin.includes('synchronized_app_setting: true')],
  ['Super Admin exposes add/edit/activate actions for pricing rows',
    superAdminUi.includes('function pricingForm(existing={})') &&
    superAdminUi.includes('data-edit-price=') &&
    superAdminUi.includes('data-toggle-price=') &&
    superAdminUi.includes("api('pricing',existing.id?'update':'create'")],
  ['Super Admin staff/customer refresh uses the protected Edge Function list contract',
    superAdminUi.includes("api('staff','list')") &&
    superAdminUi.includes("api('customer','list')") &&
    accountAdmin.includes("if (action === 'list')")],
  ['USD/IQD is saved via account-admin, not a browser-side app_settings write',
    superAdminMain.includes("functions.invoke('account-admin'") &&
    !superAdminMain.includes("state.db.from('app_settings').upsert") &&
    !superAdminUi.includes("db.from('app_settings').upsert")],
  ['Super Admin script URLs are cache-busted and customer add button IDs are unique',
    superAdminHtml.includes('super-admin-live-control-v2.js?v=20261019-1') &&
    superAdminHtml.includes('super-admin-command-center.js?v=20261019-1') &&
    superAdminHtml.includes('id="gcAddCustomerHeader"') &&
    !/\bid="gcAddCustomer"/.test(superAdminHtml)],
]
for (const [label, passed] of superAdminContracts) {
  if (passed) ok(label)
  else fail(label)
}

console.log('')
if (failures) { console.error(`${failures} check(s) failed.`); process.exit(1) }
console.log('All repository validation checks passed.')
