#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = join(new URL('.', import.meta.url).pathname, '..');
let failures = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); failures++; };
const ok = (msg) => console.log(`  ✓ ${msg}`);
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, exts, out);
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

console.log('JavaScript syntax');
const jsFiles = walk(ROOT, ['.js']);
for (const f of jsFiles) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail(`${relative(ROOT, f)}\n${e.stderr?.toString().trim()}`); }
}
if (!failures) ok(`${jsFiles.length} files OK`);

console.log('TypeScript syntax');
const tsFiles = walk(join(ROOT, 'supabase', 'functions'), ['.ts']);
let ts;
try { ts = await import('typescript'); }
catch { fail('TypeScript validator unavailable; run `npm ci` before validation'); }
if (ts) {
  const before = failures;
  for (const f of tsFiles) {
    const result = ts.transpileModule(readFileSync(f, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      reportDiagnostics: true,
    });
    const errs = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (errs.length) fail(`${relative(ROOT, f)}: ${errs.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`);
  }
  if (failures === before) ok(`${tsFiles.length} files OK`);
}

console.log('Required production files');
const required = [
  'index.html','sw.js','production-bridge.js','runtime-guard.js','_headers','_redirects',
  'tracking-integration.html','customer-portal.html','warehouse-os.html','driver-workspace.html',
  'staff-os.html','super-admin-command-center.html','warehouse-offline-sync.js',
  'supabase/config.toml','package.json','package-lock.json',
  'supabase/functions/logistics-control-plane/index.ts',
  'supabase/functions/notification-dispatch/index.ts',
  'supabase/functions/warehouse-receiving/index.ts',
  'supabase/functions/warehouse-notify/index.ts',
  'supabase/functions/staff-ops-hub/index.ts',
  'supabase/functions/staff-analytics/index.ts',
  'supabase/functions/invoice-ai/index.ts',
  'supabase/functions/customer-debt-assistant/index.ts',
  'supabase/functions/fx-refresh/index.ts',
  'supabase/functions/_shared/payment-providers.ts',
  'tests/e2e/run.mjs',
];
const beforeReq = failures;
for (const rel of required) if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`);
if (failures === beforeReq) ok(`${required.length} files present`);

console.log('Production project reference');
const config = read('supabase/config.toml');
if (!/^project_id\s*=\s*"ahslifnthiwfkmaswjno"$/m.test(config)) fail('supabase/config.toml is not pinned to the live production project');
const runtimeFiles = walk(ROOT, ['.js','.mjs','.ts','.tsx','.html','.css','.json','.toml','.yml','.yaml']);
for (const f of runtimeFiles) {
  const text = readFileSync(f, 'utf8');
  if (text.includes('swptmhhwhdtyrrfzetam')) fail(`stale Supabase project reference in ${relative(ROOT, f)}`);
}
if (!failures) ok('Live Supabase reference is consistent');

console.log('Public integration guards');
const publicIndex = read('gc-csp-scripts/index-inline-2.js');
const publicGuards = [
  ['quote uses public-quote', publicIndex.includes('functions/v1/public-quote')],
  ['quote avoids direct shipment write', !/from\(['"]shipments['"]\)\.insert|saveShipment/.test(publicIndex)],
  ['contact uses public-message', publicIndex.includes('functions/v1/public-message')],
  ['contact avoids direct messages insert', !/from\(['"]messages['"]\)\.insert/.test(publicIndex)],
];
for (const [label, passed] of publicGuards) if (!passed) fail(label);
if (!failures) ok('Public form guards OK');

console.log('Migration naming and presence');
const migDir = join(ROOT, 'supabase', 'migrations');
for (const name of readdirSync(migDir).filter((x) => x.endsWith('.sql'))) {
  if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(name)) fail(`bad migration filename: ${name}`);
}
const migrationNames = readdirSync(migDir);
for (const pattern of ['production_security_hardening', 'fix_alert_monitor_uuid_text_cast_v1', 'production_runtime_alignment_v1']) {
  if (!migrationNames.some((name) => name.includes(pattern))) fail(`missing production migration: ${pattern}`);
}
if (!failures) ok('Migration naming/presence OK');

console.log('Core workflow guards');
const workflowSource = [
  read('supabase/functions/logistics-control-plane/index.ts'),
  ...walk(migDir, ['.sql']).map((f) => readFileSync(f, 'utf8')),
].join('\n');
const workflowGuards = [
  ['shipment status history', /shipment_status_history|transition_shipment/],
  ['shipment packages', /shipment_packages/],
  ['warehouse movements', /warehouse_movements/],
  ['customs', /customs/],
  ['delivery proof', /delivery_proofs|proof_of_delivery/],
  ['audit log', /staff_activity_log/],
  ['shipment photos', /photos|step_photos/],
  ['consolidation', /consolidation/],
  ['insurance', /shipment_insurance/],
  ['account notification', /account\.created/],
  ['FX schema', /er\.usd_to_iqd/],
  ['warehouse idempotency', /idempotency_key/],
  ['alert monitor UUID cast', /shipment_id\s*=\s*s\.id::text/],
];
for (const [label, pattern] of workflowGuards) if (!pattern.test(workflowSource)) fail(`missing workflow guard: ${label}`);
if (!failures) ok(`${workflowGuards.length} workflow guards OK`);

console.log('Security and surface guards');
const roleSource = read('supabase/functions/_shared/roles.ts');
const operationsSource = read('supabase/functions/operations-admin/index.ts');
const staffConsoleSource = read('staff-os-console.js');
const staffCompatSource = read('staff-os-compat.js');
const driverSurface = read('driver-workspace.html');
const warehouseSurface = read('warehouse-os.html');
const trackingSurface = read('tracking-integration.html');
const securityGuards = [
  ['canonical roles', /CANONICAL_ROLES[\s\S]*customer[\s\S]*driver[\s\S]*warehouse[\s\S]*operations[\s\S]*finance[\s\S]*admin/, roleSource],
  ['chat navigation guard', /allowed\.add\('chat'\)/, staffConsoleSource],
  ['self-only compatibility', /self_only:true/, staffCompatSource],
  ['super_admin alias', /super_admin:\s*'admin'/, roleSource],
  ['accountant alias', /accountant:\s*'finance'/, roleSource],
  ['driver scope', /assigned_staff_id/, operationsSource],
  ['event guard', /canWriteEvents/, operationsSource],
  ['driver status region', /aria-live="polite"/, driverSurface],
  ['warehouse batch field', /id="batch"[^>]*required/, warehouseSurface],
  ['tracking form', /id="gcTrackingForm"/, trackingSurface],
  ['tracking map', /id="liveMapContainer"/, trackingSurface],
];
for (const [label, pattern, source] of securityGuards) if (!pattern.test(source)) fail(`missing security/surface guard: ${label}`);
if (!failures) ok(`${securityGuards.length} security/surface guards OK`);

console.log('Reliability and provider guards');
const dispatchSource = read('supabase/functions/notification-dispatch/index.ts');
const readmeSource = existsSync(join(ROOT, 'README.md')) ? read('README.md') : '';
const runtimeSource = read('runtime-guard.js');
const offlineSource = read('warehouse-offline-sync.js');
const fxSource = read('supabase/functions/fx-refresh/index.ts');
const fxUi = read('staff-os-fx.js');
const reliabilityGuards = [
  ['notification worker secret', /NOTIFICATION_WORKER_SECRET/, dispatchSource],
  ['external outbox claim', /claim_notification_outbox_external/, dispatchSource],
  ['notification completion', /complete_notification_outbox/, dispatchSource],
  ['runtime staff gating', /gc:staff-auth-ready/, runtimeSource],
  ['offline IndexedDB', /globall-cloud-offline/, offlineSource],
  ['offline replay', /entriesToForm/, offlineSource],
  ['offline idempotency', /idempotency_key/, offlineSource],
  ['FX market provider', /open\.er-api\.com\/v6\/latest\/USD/, fxSource],
  ['FX CBI provider', /api\.frankfurter\.dev\/v2\/rate\/USD\/IQD\?providers=CBI/, fxSource],
  ['FX safe apply gate', /apply===true/, fxSource],
  ['FX market UI', /هێنانی نرخی بازاڕ/, fxUi],
  ['FX CBI UI', /هێنانی نرخی CBI/, fxUi],
];
for (const [label, pattern, source] of reliabilityGuards) if (!pattern.test(source)) fail(`missing reliability/provider guard: ${label}`);
if (!failures) ok(`${reliabilityGuards.length} reliability/provider guards OK`);

console.log('Security hardening guards');
const allMigrations = walk(migDir, ['.sql']).map((f) => [relative(ROOT, f), readFileSync(f, 'utf8')]);
const securitySource = allMigrations.map(([, text]) => text).join('\n');
const hardeningGuards = [
  ['payment session RPC lock', /guard_payment_session_update\([\s\S]*revoke all[\s\S]*service_role/],
  ['warehouse WhatsApp RPC lock', /queue_warehouse_whatsapp\([\s\S]*revoke all[\s\S]*service_role/],
  ['calculate chargeable weight search path', /calculate_chargeable_weight\([\s\S]*set search_path = public, pg_temp/],
  ['bootstrap admin RPC lock', /bootstrap_first_admin\([\s\S]*revoke all[\s\S]*service_role/],
  ['anonymous business-data isolation', /gc_block_anonymous[\s\S]*is_real_authenticated_session/],
  ['shopping status invoker wrapper', /admin_update_shopping_status\([\s\S]*security invoker/],
];
for (const [label, pattern] of hardeningGuards) if (!pattern.test(securitySource)) fail(`missing hardening guard: ${label}`);
if (!failures) ok(`${hardeningGuards.length} hardening guards OK`);

console.log('Secret hygiene');
for (const f of runtimeFiles) {
  const text = readFileSync(f, 'utf8');
  if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"](eyJ|sb_secret_)/.test(text)) fail(`service-role key literal found in ${relative(ROOT, f)}`);
}
if (!failures) ok('No service-role secret literal found');

console.log('');
if (failures) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log('All repository validation checks passed.');
