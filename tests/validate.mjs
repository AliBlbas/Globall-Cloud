#!/usr/bin/env node
// Local pre-push validation for Globall Cloud.
// Fast syntax + structural sanity checks. The full invariant suite
// lives in .github/workflows/production-integrity.yml and runs in CI.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = join(new URL('.', import.meta.url).pathname, '..');
let failures = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); failures++; };
const ok = (msg) => console.log(`  ✓ ${msg}`);

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules' || entry === '.release') continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, exts, out);
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

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

console.log('TypeScript syntax (edge functions)');
const tsFiles = walk(join(ROOT, 'supabase', 'functions'), ['.ts']);
try {
  const ts = await import('typescript');
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
} catch {
  console.log('  (skipped — run `npm install` to enable TypeScript syntax validation)');
}

console.log('Required production files');
const requiredFiles = [
  'index.html', 'sw.js', 'production-bridge.js', 'runtime-guard.js',
  'control-plane.html', 'control-plane.js', 'payment-checkout.html',
  'payment-checkout.js', 'customer-portal.html', 'driver-workspace.html',
  'warehouse-os.html', 'staff-os.html', 'superadmin.html',
  'super-admin-command-center.html', 'supabase/config.toml',
  'functions/_middleware.js', 'functions/health.js',
];
for (const file of requiredFiles) if (!existsSync(join(ROOT, file))) fail(`missing required file: ${file}`);
if (failures === 0) ok(`${requiredFiles.length} required files present`);

console.log('Unified release package');
const archive = join(ROOT, 'Globall-Cloud-Unified.zip');
if (!existsSync(archive)) {
  fail('Globall-Cloud-Unified.zip is missing');
} else {
  try {
    const listing = execSync(`unzip -Z1 "${archive}"`, { encoding: 'utf8' });
    for (const file of [
      'supabase/functions/document-access/index.ts',
      'supabase/functions/logistics-control-plane/index.ts',
      'supabase/functions/notification-dispatch/index.ts',
      'supabase/functions/integration-webhook/index.ts',
      'supabase/functions/payment-checkout/index.ts',
      'supabase/functions/payment-webhook/index.ts',
      'supabase/functions/payment-reconcile/index.ts',
      'supabase/functions/_shared/payment-providers.ts',
    ]) {
      if (!listing.split('\n').includes(file)) fail(`unified package missing ${file}`);
    }
    if (failures === 0) ok('unified package contains advanced Edge Functions');
  } catch (error) {
    fail(`unable to inspect unified release package: ${error.message}`);
  }
}

console.log('Browser secret guard');
const forbiddenSecret = /(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|sb_secret_)/i;
for (const f of jsFiles) {
  const rel = relative(ROOT, f);
  if (rel.startsWith('supabase/functions/')) continue;
  const source = readFileSync(f, 'utf8');
  if (forbiddenSecret.test(source)) fail(`server secret reference in browser JS: ${rel}`);
}
if (failures === 0) ok('no server-secret markers found in browser JS');

const config = readFileSync(join(ROOT, 'supabase/config.toml'), 'utf8');
if (!config.includes('project_id = "ahslifnthiwfkmaswjno"')) fail('Supabase project reference is wrong');
if (!config.includes('site_url = "https://globall-cloud.pages.dev"')) fail('Supabase site_url is not the production Cloudflare Pages site');
for (const name of ['public-track','public-config','public-message','system-health','logistics-control-plane','document-access','notification-dispatch','integration-webhook','payment-checkout','payment-webhook','payment-reconcile']) {
  if (!config.includes(`[functions.${name}]`)) fail(`Supabase function ${name} is missing from config`);
}
if (failures === 0) ok('Supabase production configuration is aligned');

if (failures) {
  console.error(`\n${failures} validation failure(s).`);
  process.exit(1);
}

console.log('PASS: Globall Cloud production validation succeeded.');
