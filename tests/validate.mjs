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

// 4. Migration filenames follow the Supabase CLI timestamp convention.
// Supabase accepts both legacy 8-digit versions already applied remotely and
// the current 14-digit timestamp format for new migrations.
console.log('Migration filenames');
const migDir = join(ROOT, 'supabase', 'migrations');
const beforeMig = failures;
if (existsSync(migDir)) {
  const migFiles = readdirSync(migDir).filter((f) => f.endsWith('.sql'));
  for (const f of migFiles) {
    if (!/^(?:\d{8}|\d{14})_[a-z0-9_]+\.sql$/.test(f)) fail(`bad migration filename: ${f}`);
  }
  if (failures === beforeMig) ok(`${migFiles.length} migrations OK`);
}

console.log('');
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log('All checks passed.');
}
