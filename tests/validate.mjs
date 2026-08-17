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
} catch {
  console.log('  (skipped — run `npm install` to get the typescript package)');
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
  if (failures === before) ok(`${tsFiles.length} TypeScript files OK`);
}

// 3. Required production files
console.log('Required production files');
const requiredFiles = [
  'index.html', 'sw.js', 'production-bridge.js', 'runtime-guard.js',
  'control-plane.html', 'control-plane.js', 'payment-checkout.html',
  'payment-checkout.js', 'customer-portal.html', 'driver-workspace.html',
  'warehouse-os.html', 'staff-os.html', 'superadmin.html',
  'super-admin-command-center.html', 'supabase/config.toml',
  'functions/_middleware.js', 'functions/health.js',
  'supabase/functions/payment-checkout/index.ts',
  'supabase/functions/payment-webhook/index.ts',
  'supabase/functions/payment-reconcile/index.ts',
  'supabase/functions/notification-dispatch/index.ts',
  'supabase/functions/integration-webhook/index.ts',
  'supabase/functions/logistics-control-plane/index.ts',
  'supabase/functions/document-access/index.ts',
];
for (const file of requiredFiles) {
  if (!existsSync(join(ROOT, file))) fail(`missing required file: ${file}`);
}
if (failures === 0) ok(`${requiredFiles.length} required files present`);

// 4. Public browser code must not contain server secrets.
console.log('Browser secret guard');
const forbiddenSecret = /(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|sb_secret_)/i;
for (const f of jsFiles) {
  const rel = relative(ROOT, f);
  if (rel.startsWith('supabase/functions/')) continue;
  const source = readFileSync(f, 'utf8');
  if (forbiddenSecret.test(source)) fail(`server secret reference in browser JS: ${rel}`);
}
if (failures === 0) ok('no server-secret markers found in browser JS');

// 5. Supabase project and Cloudflare production origin must stay aligned.
const config = readFileSync(join(ROOT, 'supabase/config.toml'), 'utf8');
if (!config.includes('project_id = "ahslifnthiwfkmaswjno"')) fail('Supabase project reference is wrong');
if (!config.includes('site_url = "https://globall-cloud.pages.dev"')) fail('Supabase site_url is not the production Cloudflare Pages site');
if (!config.includes('[functions.notification-dispatch]')) fail('notification-dispatch is missing from Supabase config');
if (!config.includes('[functions.payment-checkout]')) fail('payment-checkout is missing from Supabase config');
if (failures === 0) ok('Supabase production configuration is aligned');

if (failures) {
  console.error(`\n${failures} validation failure(s).`);
  process.exit(1);
}

console.log('PASS: Globall Cloud production validation succeeded.');
