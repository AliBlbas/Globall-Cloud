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
  const tsFiles = walk(join(ROOT, 'supabase', 'functions'), ['.ts'])
  const before = failures
  for (const f of tsFiles) {
    const result = ts.transpileModule(readFileSync(f, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      reportDiagnostics: true,
    })
    const errs = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error)
    if (errs.length) fail(`${relative(ROOT, f)}: ${errs.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`)
  }
  if (failures === before) ok(`${tsFiles.length} TypeScript files OK`)
}

console.log('Required production files')
const required = [
  'index.html','sw.js','production-bridge.js','runtime-guard.js','_headers','_redirects',
  'public-route-bootstrap.js','public-staff-guard-20260909.js','public-premium-mobile-20260909.css','public-premium-mobile-20260909.js',
  'tracking-integration.html','tracking-intelligence.js','tracking-intelligence.css','customer-portal.html','warehouse-os.html','driver-workspace.html',
  'staff-os-v5.html','staff-os-v5.css','staff-os-v5.js','staff-logistics-intelligence.js','staff-logistics-intelligence.css',
  'staff-mobile-command-dock.css','staff-mobile-command-dock.js','staff-os-pro-20260909.css','staff-os-pro-20260909.js',
  'staff-shell-polish-20260909.css','staff-shell-polish-20260909.js','staff-premium-mobile-20260909.css','staff-premium-mobile-20260909.js',
  'warehouse-offline-sync.js','gc-platform-vnext.js','gc-platform-vnext-plus.js','gc-runtime-safety-v2026.js','production-brand-repair.js',
  'supabase/config.toml','package.json','package-lock.json','scripts/production-contracts.mjs','tests/e2e/run.mjs',
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
const stale = ['swptmhhwhdtyrrf', 'zetam'].join('')
let staleHits = 0
for (const f of runtimeFiles) {
  const text = readFileSync(f, 'utf8')
  if (text.includes(stale)) { staleHits++; fail(`stale Supabase project reference in ${relative(ROOT, f)}`) }
}
if (!staleHits) ok('Live Supabase reference is consistent')

console.log('Public integration guards')
const publicIndex = read('gc-csp-scripts/index-inline-2.js')
const guards = [
  ['quote uses public-quote', publicIndex.includes('functions/v1/public-quote')],
  ['quote avoids direct shipment write', !/from\(['"]shipments['"]\)\.insert|saveShipment/.test(publicIndex)],
  ['contact uses public-message', publicIndex.includes('functions/v1/public-message')],
  ['contact avoids direct messages insert', !/from\(['"]messages['"]\)\.insert/.test(publicIndex)],
  ['production bridge uses live project', read('production-bridge.js').includes('ahslifnthiwfkmaswjno.supabase.co')],
  ['staff route is isolated', read('_redirects').includes('/staff /staff-os-v5.html 200')],
  ['staff entry has mobile shell', read('staff-os-v5.html').includes('staff-premium-mobile-20260909.css?v=20260909-1')],
]
for (const [label, passed] of guards) if (!passed) fail(label)
if (!failures) ok('Public and Staff integration guards OK')

console.log('Migration naming and presence')
const migDir = join(ROOT, 'supabase', 'migrations')
const migrations = readdirSync(migDir).filter((x) => x.endsWith('.sql'))
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

console.log('')
if (failures) { console.error(`${failures} check(s) failed.`); process.exit(1) }
console.log('All repository validation checks passed.')
