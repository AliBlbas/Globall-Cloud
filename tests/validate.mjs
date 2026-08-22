#!/usr/bin/env node
// Local pre-push validation for Globall Cloud.
// Fast syntax + structural sanity checks. The full invariant suite
// (CSP, secrets, migration filenames, live smoke test) lives in
// .github/workflows/production-integrity.yml and runs in CI — this
// script is meant to catch the same class of mistakes in ~2 seconds
// on your own machine before you push.
//
// Run: npm test  (or) node tests/validate.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = join(new URL('.', import.meta.url).pathname, '..');
let failures = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); failures++; };
const ok = (msg) => console.log(`  ✓ ${msg}`);

function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, exts, out);
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

// 1. JS syntax check
console.log('JavaScript syntax (node --check)');
const jsFiles = walk(ROOT, ['.js']);
for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    fail(`${relative(ROOT, f)}\n${e.stderr?.toString().trim()}`);
  }
}
if (failures === 0) ok(`${jsFiles.length} files OK`);

// 2. TS syntax check (edge functions) — syntax only, no module
//    resolution, so Deno's npm:/jsr: specifiers don't need to resolve.
console.log('TypeScript syntax (edge functions)');
const tsFiles = walk(join(ROOT, 'supabase', 'functions'), ['.ts']);
let ts;
try {
  ts = await import('typescript');
} catch (error) {
  fail('TypeScript validator unavailable; run `npm ci` before validation');
}
if (ts) {
  const before = failures;
  for (const f of tsFiles) {
    const code = readFileSync(f, 'utf8');
    const result = ts.transpileModule(code, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      reportDiagnostics: true,
    });
    const syntaxErrors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (syntaxErrors.length) {
      const msgs = syntaxErrors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ');
      fail(`${relative(ROOT, f)}: ${msgs}`);
    }
  }
  if (failures === before) ok(`${tsFiles.length} files OK`);
}

// 3. Core production files present
console.log('Core production files');
const required = [
  'index.html', 'sw.js', 'production-bridge.js', 'runtime-guard.js', 'functions/_middleware.js',
  'control-plane.html', 'control-plane.js', 'payment-checkout.html', 'payment-checkout.js',
  'customer-portal.html', 'driver-workspace.html', 'warehouse-os.html', 'staff-os.html',
  'superadmin.html', 'super-admin-command-center.html',
  'supabase/config.toml',
  'supabase/functions/payment-checkout/index.ts',
  'supabase/functions/payment-webhook/index.ts',
  'supabase/functions/notification-dispatch/index.ts',
  'supabase/functions/logistics-control-plane/index.ts',
  'supabase/functions/_shared/payment-providers.ts',
];
const beforeReq = failures;
for (const rel of required) {
  if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`);
}
if (failures === beforeReq) ok(`${required.length} files present`);

// 4. Migration filenames follow the Supabase CLI timestamp convention
console.log('Migration filenames');
const migDir = join(ROOT, 'supabase', 'migrations');
const beforeMig = failures;
if (existsSync(migDir)) {
  const migFiles = readdirSync(migDir).filter((f) => f.endsWith('.sql'));
  for (const f of migFiles) {
    if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(f)) fail(`bad migration filename: ${f}`);
  }
  if (failures === beforeMig) ok(`${migFiles.length} migrations OK`);
}

// 5. Role-policy regression guards
console.log('Role-policy guards');
const roleSource = readFileSync(join(ROOT, 'supabase', 'functions', '_shared', 'roles.ts'), 'utf8');
const operationsSource = readFileSync(join(ROOT, 'supabase', 'functions', 'operations-admin', 'index.ts'), 'utf8');
const roleGuards = [
  ['canonical role list', /CANONICAL_ROLES\s*=.*customer.*driver.*warehouse.*operations.*finance.*admin/s],
  ['legacy super_admin alias', /super_admin:\s*'admin'/],
  ['legacy accountant alias', /accountant:\s*'finance'/],
  ['driver shipment scope', /assigned_staff_id/],
  ['driver non-shipment denial', /a\.role==='driver'&&!\['shipments','events'\]\.includes\(kind\)/],
  ['event role guard', /canWriteEvents/],
];
const beforeRoles = failures;
for (const [label, pattern] of roleGuards) {
  if (!pattern.test(label === 'canonical role list' || label.includes('alias') ? roleSource : operationsSource)) fail(`missing role guard: ${label}`);
}
if (failures === beforeRoles) ok(`${roleGuards.length} role guards OK`);

// 6. Core logistics workflow guards
console.log('Core workflow guards');
const controlPlaneSource = [readFileSync(join(ROOT, 'supabase', 'functions', 'logistics-control-plane', 'index.ts'), 'utf8'), ...walk(join(ROOT, 'supabase', 'migrations'), ['.sql']).map((file) => readFileSync(file, 'utf8'))].join('\n');
const workflowGuards = [
  ['shipment transition RPC', /transition_shipment|shipment_status_history/],
  ['package traceability', /shipment_packages/],
  ['warehouse movement ledger', /warehouse_movements|movement/],
  ['customs workflow', /customs/],
  ['delivery proof', /delivery_proofs|proof_of_delivery/],
  ['staff audit trail', /staff_activity_log/],
];
const beforeWorkflow = failures;
for (const [label, pattern] of workflowGuards) {
  if (!pattern.test(controlPlaneSource)) fail(`missing core workflow guard: ${label}`);
}
if (failures === beforeWorkflow) ok(`${workflowGuards.length} core workflow guards OK`);

// 7. Role-surface accessibility guards
console.log('Role-surface accessibility guards');
const driverSurface = readFileSync(join(ROOT, 'driver-workspace.html'), 'utf8');
const warehouseSurface = readFileSync(join(ROOT, 'warehouse-os.html'), 'utf8');
const surfaceGuards = [
  ['driver status live region', /id="msg"[^>]*role="status"[^>]*aria-live="polite"/],
  ['POD status live region', /id="podMsg"[^>]*role="status"[^>]*aria-live="polite"/],
  ['receiver name required', /id="receiver"[^>]*required/],
  ['driver mobile focus styles', /button:focus-visible,input:focus-visible,textarea:focus-visible/],
  ['warehouse live status', /id="msg"[^>]*role="status"[^>]*aria-live="polite"/],
  ['warehouse receipt batch required', /id="batch"[^>]*required/],
];
const beforeSurface = failures;
for (const [label, pattern] of surfaceGuards) {
  const source = label.startsWith('warehouse') ? warehouseSurface : driverSurface;
  if (!pattern.test(source)) fail(`missing role-surface guard: ${label}`);
}
if (failures === beforeSurface) ok(`${surfaceGuards.length} role-surface guards OK`);

console.log('');
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log('All checks passed.');
}
