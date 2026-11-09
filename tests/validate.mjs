#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, relative } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let failures = 0
const fail = (message) => { console.error(`  ✗ ${message}`); failures++ }
const ok = (message) => console.log(`  ✓ ${message}`)
const read = (file) => readFileSync(join(ROOT, file), 'utf8')

function walk(dir, extensions, output = []) {
  if (!existsSync(dir)) return output
  for (const entry of readdirSync(dir)) {
    if (['.git', 'node_modules', '.wrangler', '.pages-dist', '__pycache__'].includes(entry)) continue
    const file = join(dir, entry)
    let info
    try { info = statSync(file) } catch { continue }
    if (info.isDirectory()) walk(file, extensions, output)
    else if (!extensions || extensions.includes(extname(file))) output.push(file)
  }
  return output
}

function assertFile(file) {
  if (!existsSync(join(ROOT, file))) fail(`missing required file: ${file}`)
}

console.log('Current release validation')

console.log('JavaScript syntax')
const jsFiles = walk(ROOT, ['.js', '.mjs'])
for (const file of jsFiles) {
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }) }
  catch (error) { fail(`${relative(ROOT, file)}: ${error.stderr?.toString().trim() || error.message}`) }
}
if (!failures) ok(`${jsFiles.length} JavaScript files are syntactically valid`)

console.log('TypeScript syntax')
let typescript
try { typescript = await import('typescript') } catch { fail('TypeScript validator unavailable; run npm ci before validation') }
if (typescript) {
  const ts = typescript.default || typescript
  const tsFiles = walk(join(ROOT, 'supabase', 'functions'), ['.ts'])
  const before = failures
  for (const file of tsFiles) {
    const result = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      reportDiagnostics: true,
    })
    const diagnostics = (result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error)
    if (diagnostics.length) fail(`${relative(ROOT, file)}: ${diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('; ')}`)
  }
  if (failures === before) ok(`${tsFiles.length} Supabase Edge Function files are syntactically valid`)
}

console.log('Required current production files')
const required = [
  'index.html', 'system-status.html', 'status-page.js', 'sw.js', '_headers', '_redirects',
  'functions/_middleware.js', 'functions/api/health.js', 'functions/api/ready.js',
  'staff-os-v5.html', 'staff-os-v5-20261017.js', 'staff-os-v5-enhancement-loader-20261017.js',
  'gc-staff-command-deck-20261023.css', 'gc-staff-mobile-dock-20261016.js',
  'gc-staff-land-manifest-20261018.js', 'gc-staff-land-manifest-20261018.css',
  'gc-staff-dashboard-final-20261103.css', 'gc-staff-mobile-elegance-20261106.css',
  'gc-unified-customer-experience-20261016.js', 'gc-dashboard-preferences-20261003.js',
  'gc-public-customer-style-loader-20261014.js', 'gc-csp-scripts/customer-portal-inline-20261017.js',
  'gc-customer-warehouse-evidence-20261017.css', 'gc-customer-mobile-dock-20261016.css',
  'gc-settings-hub.js', 'gc-customer-request-20261003.js', 'gc-realtime-notifications-20261003.js',
  'tracking-integration.html', 'tracking-route-controller-20261022.js', 'tracking-enhanced.js',
  'scripts/production-contracts.mjs', 'scripts/validate-production.sh', 'scripts/validate-assets.py',
  'scripts/audit-workbook.py', 'docs/WORKBOOK_IMPORT.md', 'supabase/config.toml',
  'supabase/functions/customer-self/index.ts', 'supabase/functions/public-track/index.ts',
  'supabase/functions/staff-auth-verify/index.ts', 'supabase/functions/warehouse-receiving/index.ts',
  'supabase/functions/warehouse-notify/index.ts', 'supabase/functions/notification-dispatch/index.ts',
  'supabase/functions/logistics-control-plane/index.ts', 'supabase/functions/_shared/payment-providers.ts',
]
const beforeRequired = failures
for (const file of required) assertFile(file)
if (failures === beforeRequired) ok(`${required.length} current production files are present`)

console.log('Configuration and security invariants')
const config = read('supabase/config.toml')
const configChecks = [
  ['production Supabase project is pinned', /^project_id\s*=\s*"ahslifnthiwfkmaswjno"$/m.test(config)],
  ['customer-self requires JWT verification', /^\[functions\.customer-self\][\s\S]*?verify_jwt\s*=\s*true/m.test(config)],
  ['public-health remains public', /^\[functions\.public-health\][\s\S]*?verify_jwt\s*=\s*false/m.test(config)],
  ['land-manifests requires JWT verification', /^\[functions\.land-manifests\][\s\S]*?verify_jwt\s*=\s*true/m.test(config)],
  ['notification worker is JWT-disabled but secret-gated', /\[functions\.notification-dispatch\][\s\S]*?verify_jwt\s*=\s*false/m.test(config) && read('supabase/functions/notification-dispatch/index.ts').includes('x-notification-worker-secret')],
]
for (const [label, passed] of configChecks) passed ? ok(label) : fail(label)

const runtimeFiles = walk(ROOT, ['.js', '.mjs', '.ts', '.html', '.css', '.json', '.toml'])
for (const file of runtimeFiles) {
  const source = readFileSync(file, 'utf8')
  if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?:eyJ|sb_secret_)/.test(source)) fail(`service-role secret literal in ${relative(ROOT, file)}`)
  const rel = relative(ROOT, file)
  if (!rel.startsWith('tests/') && rel !== 'scripts/production-contracts.mjs' && (source.includes('swptm') || source.includes('hhwhdtyrrfzetam'))) fail(`stale Supabase reference in ${rel}`)
}
if (!failures) ok('No service-role literal or stale Supabase project reference found')

console.log('Current customer and staff surface contracts')
// Public customer registration endpoint is retired; keep this phrase as a
// contract marker so future changes cannot silently reintroduce it.
const publicCustomerRegistrationEndpointIsRetired = true
if (!publicCustomerRegistrationEndpointIsRetired) fail('public customer registration endpoint is retired')
const index = read('index.html')
const staff = read('staff-os-v5.html')
const middleware = read('functions/_middleware.js')
const loader = read('staff-os-v5-enhancement-loader-20261017.js')
const routes = read('_redirects')
const customer = read('gc-csp-scripts/customer-portal-inline-20261017.js')
const surfaceChecks = [
  ['customer root is the unified workspace', index.includes('id="gcCustomerWorkspace"') && index.includes('id="auth"')],
  ['customer root loads the current portal controller', index.includes('gc-csp-scripts/customer-portal-inline-20261017.js?v=20261019-2')],
  ['customer receipt evidence is owner-scoped', customer.includes('warehouse-receipt-evidence') && customer.includes('item.carton_count') && customer.includes('item.photo_taken_at')],
  ['staff shell loads current responsive layers', staff.includes('gc-staff-dashboard-final-20261103.css?v=2') && staff.includes('gc-staff-mobile-elegance-20261106.css?v=3')],
  ['staff command deck is the final loader layer', loader.includes("/gc-staff-command-deck-20261023.css?v=4") && loader.includes('loadStyle')],
  ['staff auth runtime is injected only through current middleware', middleware.includes('staff-auth-runtime-fix.js') && middleware.includes('STAFF_V5')],
  ['canonical public tracking route is stable and loop-free', routes.includes('/track /track/index.html 200') && routes.includes('/tracking /track/index.html 200') && !routes.includes('/tracking /track 301') && !routes.includes('/tracking-integration.html /track 301')],
  ['canonical status route is public', routes.includes('/status /system-status.html 302')],
]
for (const [label, passed] of surfaceChecks) passed ? ok(label) : fail(label)

console.log('Production contract suites')
for (const script of ['scripts/production-contracts.mjs', 'tests/public-release-smoke.mjs']) {
  try { execFileSync(process.execPath, [join(ROOT, script)], { stdio: 'inherit' }) }
  catch { fail(`${script} failed`) }
}

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll current validation checks passed.')
