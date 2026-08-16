import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`FAIL: ${message}`);
}

function requireFile(path) {
  if (!existsSync(join(root, path))) fail(`missing required file: ${path}`);
}

async function collectJs(dir) {
  const result = [];
  if (!existsSync(dir)) return result;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await collectJs(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) result.push(full);
  }
  return result;
}

const requiredFiles = [
  'index.html', 'sw.js', 'production-bridge.js', 'runtime-guard.js',
  'tracking-enhanced.js', 'mobile-final.css', 'driver-portal.html',
  'driver-portal.js', 'driver-portal-mobile.css', 'customer-portal.html',
  'warehouse-os.html', 'accounts-console.html', 'supabase/config.toml',
  'functions/health.js', '.github/workflows/production-integrity.yml',
];
requiredFiles.forEach(requireFile);

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (packageJson.engines?.node !== '>=20') fail('package.json must require Node >=20');
if (packageJson.scripts?.test !== 'node tests/validate.mjs') fail('package.json test script must run tests/validate.mjs');

const config = readFileSync(join(root, 'supabase/config.toml'), 'utf8');
if (!config.includes('project_id = "ahslifnthiwfkmaswjno"')) fail('Supabase project reference is missing');
if (!config.includes('[functions.account-admin]') || !config.includes('verify_jwt = true')) fail('authenticated Edge Function JWT configuration is missing');

const workflow = readFileSync(join(root, '.github/workflows/production-integrity.yml'), 'utf8');
if (!workflow.includes('node-version: 20')) fail('CI must test with Node 20');
if (!workflow.includes('runs-on: ubuntu-24.04')) fail('CI runner must be pinned to ubuntu-24.04');
if (!workflow.includes('node tests/validate.mjs')) fail('CI must execute the repository validation harness');

const forbidden = /(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|sb_secret_)/i;
const files = await collectJs(root);
for (const file of files) {
  const rel = relative(root, file);
  if (rel.startsWith('.git' + join('/'))) continue;
  const source = readFileSync(file, 'utf8');
  if (forbidden.test(source)) fail(`potential server secret reference in browser/repository JS: ${rel}`);
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) fail(`JavaScript syntax error: ${rel}\n${check.stderr || check.stdout}`);
}

const expectedPublicFunctions = ['public-track', 'public-config', 'public-message', 'system-health'];
const edgeRoot = join(root, 'supabase/functions');
for (const name of expectedPublicFunctions) {
  requireFile(`supabase/functions/${name}/index.ts`);
}

if (!existsSync(edgeRoot)) fail('supabase/functions directory is missing');

if (failures.length) {
  console.error(`\n${failures.length} validation failure(s).`);
  process.exit(1);
}

console.log(`PASS: validated ${files.length} JavaScript files and required production invariants.`);
