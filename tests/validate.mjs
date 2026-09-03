#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = join(new URL('.', import.meta.url).pathname, '..');
let failures = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); failures++; };
const ok = (msg) => console.log(`  ✓ ${msg}`);
function walk(dir, exts, out = []) { for (const entry of readdirSync(dir)) { if (entry === '.git' || entry === 'node_modules') continue; const p = join(dir, entry); const s = statSync(p); if (s.isDirectory()) walk(p, exts, out); else if (exts.includes(extname(p))) out.push(p); } return out; }

console.log('JavaScript syntax');
const jsFiles = walk(ROOT, ['.js']);
for (const f of jsFiles) { try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { fail(`${relative(ROOT, f)}\n${e.stderr?.toString().trim()}`); } }
if (!failures) ok(`${jsFiles.length} files OK`);

console.log('TypeScript syntax');
const tsFiles = walk(join(ROOT, 'supabase', 'functions'), ['.ts']);
let ts;
try { ts = await import('typescript'); } catch { fail('TypeScript validator unavailable; run `npm ci` before validation'); }
if (ts) { const before = failures; for (const f of tsFiles) { const result = ts.transpileModule(readFileSync(f, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true }); const errs = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error); if (errs.length) fail(`${relative(ROOT, f)}: ${errs.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`); } if (failures === before) ok(`${tsFiles.length} files OK`); }

console.log('Required production files');
const required = [
  'index.html','sw.js','production-bridge.js','runtime-guard.js','functions/_middleware.js',
  'control-plane.html','control-plane.js','payment-checkout.html','payment-checkout.js','customer-portal.html','driver-workspace.html','warehouse-os.html','staff-os.html','staff-os-compat.js',
  'staff-os-enhancements-v2.js','staff-os-fx.js','staff-os-warehouse-notify.js','staff-os-dashboard.js','staff-os-ai-tools.js','warehouse-offline-sync.js','tracking-integration.html',
  'supabase/config.toml','supabase/migrations/20260903010000_production_security_hardening.sql','supabase/migrations/20260903005006_lock_bootstrap_admin_rpc.sql','supabase/migrations/20260903005417_customer_account_created_notifications.sql','supabase/migrations/20260903005518_fix_shein_quote_fx_schema_v2.sql',
  'supabase/functions/payment-checkout/index.ts','supabase/functions/payment-webhook/index.ts','supabase/functions/notification-dispatch/index.ts','supabase/functions/logistics-control-plane/index.ts','supabase/functions/customer-self/index.ts','supabase/functions/staff-analytics/index.ts','supabase/functions/staff-ops-hub/index.ts','supabase/functions/warehouse-notify/index.ts','supabase/functions/invoice-ai/index.ts','supabase/functions/customer-debt-assistant/index.ts','supabase/functions/customer-receipt-evidence/index.ts','supabase/functions/fx-refresh/index.ts','supabase/functions/_shared/payment-providers.ts',
];
const beforeReq = failures; for (const rel of required) if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`); if (failures === beforeReq) ok(`${required.length} files present`);

console.log('Public integration guards');
const publicIndexSource = readFileSync(join(ROOT, 'gc-csp-scripts', 'index-inline-2.js'), 'utf8');
const requestBlock = publicIndexSource.match(/async function handleRequestSubmit\(e\)\{[\s\S]*?\n\}\nfunction resetRequestForm/)?.[0] || '';
const contactBlock = publicIndexSource.match(/async function handleContactSubmit\(e\)\{[\s\S]*?\n\}\n\n\/\* ================= I18N APPLY/)?.[0] || '';
const publicGuards = [['quote uses public-quote',requestBlock.includes('functions/v1/public-quote')],['quote no direct shipment write',!requestBlock.includes('saveShipment')&&!requestBlock.includes("from('shipments')")],['contact uses public-message',contactBlock.includes('functions/v1/public-message')],['contact no direct messages insert',!contactBlock.includes("from('messages').insert")]];
const beforePublic=failures; for(const [label,passed] of publicGuards) if(!passed) fail(label); if(failures===beforePublic) ok('Public form guards OK');

console.log('Migration filenames');
const migDir=join(ROOT,'supabase','migrations'); const beforeMig=failures; if(existsSync(migDir)){for(const f of readdirSync(migDir).filter(x=>x.endsWith('.sql'))) if(!/^\d{14}_[a-z0-9_]+\.sql$/.test(f)) fail(`bad migration filename: ${f}`);} if(failures===beforeMig) ok('Migration naming OK');

console.log('Core workflow guards');
const workflowSource=[readFileSync(join(ROOT,'supabase','functions','logistics-control-plane','index.ts'),'utf8'),...walk(migDir,['.sql']).map(f=>readFileSync(f,'utf8'))].join('\n');
const workflowGuards=[['transition history',/transition_shipment|shipment_status_history/],['packages',/shipment_packages/],['warehouse movements',/warehouse_movements/],['customs',/customs/],['delivery proof',/delivery_proofs|proof_of_delivery/],['audit',/staff_activity_log/],['photos',/warehouse-receipts|photos/],['consolidation',/consolidation/],['insurance',/shipment_insurance/],['account-created notification',/account\.created/],['FX schema alignment',/er\.usd_to_iqd/]];
const beforeWorkflow=failures; for(const [label,pattern] of workflowGuards) if(!pattern.test(workflowSource)) fail(`missing workflow guard: ${label}`); if(failures===beforeWorkflow) ok(`${workflowGuards.length} core workflow guards OK`);

console.log('Role and surface guards');
const roleSource=readFileSync(join(ROOT,'supabase','functions','_shared','roles.ts'),'utf8');
const operationsSource=readFileSync(join(ROOT,'supabase','functions','operations-admin','index.ts'),'utf8');
const staffConsoleSource=readFileSync(join(ROOT,'staff-os-console.js'),'utf8');
const staffCompatSource=readFileSync(join(ROOT,'staff-os-compat.js'),'utf8');
const driverSurface=readFileSync(join(ROOT,'driver-workspace.html'),'utf8');
const warehouseSurface=readFileSync(join(ROOT,'warehouse-os.html'),'utf8');
const trackingSurface=readFileSync(join(ROOT,'tracking-integration.html'),'utf8');
const roleGuards=[['canonical roles',/CANONICAL_ROLES\s*=.*customer.*driver.*warehouse.*operations.*finance.*admin/s,roleSource],['staff role nav',/function visibleTabs\(\)[\s\S]*allowed\.add\('chat'\)/,staffConsoleSource],['self-only compatibility',/self_only:true/,staffCompatSource],['super_admin alias',/super_admin:\s*'admin'/,roleSource],['accountant alias',/accountant:\s*'finance'/,roleSource],['driver scope',/assigned_staff_id/,operationsSource],['event guard',/canWriteEvents/,operationsSource],['driver status region',/id="msg"[^>]*role="status"[^>]*aria-live="polite"/,driverSurface],['warehouse receipt required',/id="batch"[^>]*required/,warehouseSurface],['tracking form',/id="gcTrackingForm"/,trackingSurface],['tracking map',/id="liveMapContainer"/,trackingSurface]];
const beforeRoles=failures; for(const [label,pattern,source] of roleGuards) if(!pattern.test(source)) fail(`missing guard: ${label}`); if(failures===beforeRoles) ok(`${roleGuards.length} role/surface guards OK`);

console.log('Reliability, provider and FX guards');
const dispatchSource=readFileSync(join(ROOT,'supabase','functions','notification-dispatch','index.ts'),'utf8');
const readmeSource=readFileSync(join(ROOT,'README.md'),'utf8');
const runtimeSource=readFileSync(join(ROOT,'runtime-guard.js'),'utf8');
const offlineSource=readFileSync(join(ROOT,'warehouse-offline-sync.js'),'utf8');
const fxSource=readFileSync(join(ROOT,'supabase','functions','fx-refresh','index.ts'),'utf8');
const fxUi=readFileSync(join(ROOT,'staff-os-fx.js'),'utf8');
const relGuards=[['worker secret',/NOTIFICATION_WORKER_SECRET/,dispatchSource],['external claim',/claim_notification_outbox_external/,dispatchSource],['retry completion',/complete_notification_outbox/,dispatchSource],['recovery runbook',/Reliability and recovery runbook/,readmeSource],['backup guidance',/Supabase backup|point-in-time recovery/,readmeSource],['secret manager guidance',/platform secret manager/,readmeSource],['runtime staff gating',/gc:staff-auth-ready/,runtimeSource],['offline IndexedDB',/globall-cloud-offline/,offlineSource],['offline replay',/entriesToForm/,offlineSource],['offline idempotency',/idempotency_key/,offlineSource],['FX market provider',/open\.er-api\.com\/v6\/latest\/USD/,fxSource],['FX CBI provider',/api\.frankfurter\.dev\/v2\/rate\/USD\/IQD\?providers=CBI/,fxSource],['FX apply option',/apply===true/,fxSource],['FX UI button',/هێنانی نرخی بازاڕ/,fxUi],['FX UI CBI',/هێنانی نرخی CBI/,fxUi]];
const beforeRel=failures; for(const [label,pattern,source] of relGuards) if(!pattern.test(source)) fail(`missing reliability/provider guard: ${label}`); if(failures===beforeRel) ok(`${relGuards.length} reliability/provider guards OK`);

console.log('Security hardening guards');
const hardening=readFileSync(join(ROOT,'supabase','migrations','20260903010000_production_security_hardening.sql'),'utf8');
const bootstrap=readFileSync(join(ROOT,'supabase','migrations','20260903005006_lock_bootstrap_admin_rpc.sql'),'utf8');
const hardeningGuards=[['trigger RPC lock',/guard_payment_session_update\(\)[\s\S]*revoke all[\s\S]*grant execute[\s\S]*service_role/,hardening],['warehouse WhatsApp lock',/queue_warehouse_whatsapp\(\)[\s\S]*revoke all[\s\S]*grant execute[\s\S]*service_role/,hardening],['admin shopping lock',/admin_update_shopping_status\(uuid,text\)[\s\S]*revoke all[\s\S]*grant execute[\s\S]*service_role/,hardening],['super admin customer lock',/super_admin_update_customer\([\s\S]*?\)[\s\S]*revoke all[\s\S]*grant execute[\s\S]*service_role/,hardening],['search path pinned',/calculate_chargeable_weight\(numeric,numeric,numeric,numeric\)[\s\S]*set search_path = public, pg_temp/,hardening],['bootstrap lock',/bootstrap_first_admin\(\)[\s\S]*revoke all[\s\S]*grant execute[\s\S]*service_role/,bootstrap]];
const beforeHard=failures; for(const [label,pattern,source] of hardeningGuards) if(!pattern.test(source)) fail(`missing security hardening: ${label}`); if(failures===beforeHard) ok(`${hardeningGuards.length} hardening guards OK`);

console.log('');
if(failures){console.error(`${failures} check(s) failed.`);process.exit(1);} console.log('All checks passed.');
