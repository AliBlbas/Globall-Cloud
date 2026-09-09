#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let failures = 0
const fail = (message) => { console.error(`  ✗ ${message}`); failures += 1 }
const ok = (message) => console.log(`  ✓ ${message}`)
const read = (path) => readFileSync(join(ROOT, path), 'utf8')
const exists = (path) => existsSync(join(ROOT, path))

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules' || entry === '.wrangler' || entry === '.pages-dist') continue
    const absolute = join(dir, entry)
    let stat
    try { stat = statSync(absolute) } catch { continue }
    if (stat.isDirectory()) walk(absolute, out)
    else out.push(absolute)
  }
  return out
}

console.log('Production contract validation')

try {
  const config = read('supabase/config.toml')
  if (!/^project_id\s*=\s*"ahslifnthiwfkmaswjno"$/m.test(config)) fail('Supabase project_id is not pinned to production')
  else ok('Supabase production project is pinned')
} catch (error) { fail(`unable to read Supabase config: ${error.message}`) }

try {
  const sw = read('sw.js')
  const match = sw.match(/CACHE_VERSION\s*=\s*['"](gc-v\d+)['"]/) 
  if (!match) fail('sw.js has no canonical gc-vNN cache version')
  else ok(`Service Worker cache contract is ${match[1]}`)
} catch (error) { fail(`service worker contract failed: ${error.message}`) }

const required = [
  'index.html','sw.js','production-bridge.js','runtime-guard.js','_headers','_redirects',
  'public-route-bootstrap.js','public-staff-guard-20260909.js','public-premium-mobile-20260909.css',
  'public-premium-mobile-20260909.js','tracking-integration.html','tracking-intelligence.js','tracking-intelligence.css',
  'customer-portal.html','warehouse-os.html','driver-workspace.html','staff-os-v5.html','staff-os-v5.css','staff-os-v5.js',
  'staff-logistics-intelligence.css','staff-logistics-intelligence.js','staff-mobile-command-dock.css','staff-mobile-command-dock.js',
  'staff-os-pro-20260909.css','staff-os-pro-20260909.js','staff-shell-polish-20260909.css','staff-shell-polish-20260909.js',
  'staff-premium-mobile-20260909.css','staff-premium-mobile-20260909.js','warehouse-offline-sync.js',
  'production-mobile-ux-v2026.css','gc-platform-vnext.js','gc-platform-vnext-plus.js','gc-runtime-safety-v2026.js','production-brand-repair.js',
  'gc-csp-scripts/logistics-pricing-ui.js','supabase/config.toml','package.json','package-lock.json',
  'supabase/functions/logistics-control-plane/index.ts','supabase/functions/notification-dispatch/index.ts',
  'supabase/functions/warehouse-receiving/index.ts','supabase/functions/warehouse-notify/index.ts',
  'supabase/functions/staff-ops-hub/index.ts','supabase/functions/staff-analytics/index.ts',
  'supabase/functions/invoice-ai/index.ts','supabase/functions/customer-debt-assistant/index.ts','supabase/functions/fx-refresh/index.ts',
  'supabase/functions/staff-shipment-v5/index.ts','supabase/functions/staff-shipment-control/index.ts',
  'supabase/functions/public-config/index.ts','supabase/functions/public-message/index.ts','supabase/functions/public-quote/index.ts',
  'supabase/functions/public-pricing/index.ts','supabase/functions/public-track/index.ts','supabase/functions/customer-self/index.ts',
  'supabase/functions/payment-webhook/index.ts','supabase/functions/_shared/payment-providers.ts','supabase/functions/_shared/service-key.ts',
  'tests/validate.mjs','tests/e2e/run.mjs'
]
for (const path of required) if (!exists(path)) fail(`missing critical production file: ${path}`)
if (!failures) ok(`${required.length} critical production files are present`)

try {
  const extensions = new Set(['.js','.mjs','.ts','.tsx','.html','.css','.json','.toml','.yml','.yaml'])
  const files = walk(ROOT).filter((file) => extensions.has(file.slice(file.lastIndexOf('.'))))
  const stale = ['swptmhhwhdtyrrf', 'zetam'].join('')
  const secretPatterns = [
    /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?:eyJ|sb_secret_)[A-Za-z0-9._-]{10,}/i,
    /service[_-]?role[_-]?key\s*[:=]\s*["'](?:eyJ|sb_secret_)[A-Za-z0-9._-]{10,}/i,
    /CLOUDFLARE_API_TOKEN\s*[:=]\s*["'][A-Za-z0-9._-]{20,}/i,
  ]
  let staleHits = 0
  let secretHits = 0
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    if (source.includes(stale)) { staleHits += 1; fail(`stale Supabase project reference in ${relative(ROOT, file)}`) }
    if (secretPatterns.some((pattern) => pattern.test(source))) { secretHits += 1; fail(`secret-like credential literal detected in ${relative(ROOT, file)}`) }
  }
  if (!staleHits) ok('No stale Supabase project references detected')
  if (!secretHits) ok('No service-role/API-token literals detected in source')
} catch (error) { fail(`source hygiene validation failed: ${error.message}`) }

try {
  const headers = read('_headers')
  const redirects = read('_redirects')
  if (!headers.includes('Content-Security-Policy:')) fail('CSP header missing')
  if (/script-src[^\n;]*unsafe-inline/.test(headers)) fail('CSP script-src allows unsafe-inline')
  if (!headers.includes('Strict-Transport-Security:')) fail('HSTS missing')
  if (!headers.includes('X-Content-Type-Options: nosniff')) fail('nosniff missing')
  for (const route of ['/track /tracking-integration.html 200','/staff /staff-os-v5.html 200','/staff/ /staff-os-v5.html 200','/staff-os /staff-os-v5.html 200']) if (!redirects.includes(route)) fail(`route contract missing: ${route}`)
  ok('Security headers and route contracts are present')
} catch (error) { fail(`surface security validation failed: ${error.message}`) }

try {
  const config = read('supabase/config.toml')
  for (const fn of ['public-config','public-message','public-quote','public-pricing','public-track','customer-self','staff-directory']) {
    const re = new RegExp(`\\[functions\\.${fn}\\][\\s\\S]*?verify_jwt\\s*=\\s*(true|false)`)
    const match = config.match(re)
    if (!match) fail(`missing explicit verify_jwt setting for ${fn}`)
    else if (match[1] !== 'false') fail(`${fn} must remain publicly callable by design`)
  }
  for (const fn of ['logistics-control-plane','logistics-control-tower','document-access','warehouse-receiving','operations-admin','staff-analytics']) {
    const re = new RegExp(`\\[functions\\.${fn}\\][\\s\\S]*?verify_jwt\\s*=\\s*(true|false)`)
    const match = config.match(re)
    if (!match) fail(`missing explicit verify_jwt setting for protected function ${fn}`)
    else if (match[1] !== 'true') fail(`${fn} must require JWT authentication`)
  }
  ok('Public/protected Edge Function JWT posture is explicit')
} catch (error) { fail(`JWT posture validation failed: ${error.message}`) }

try {
  const bridge = read('production-bridge.js')
  const routes = read('_redirects')
  const staff = read('staff-os-v5.html')
  const mobile = read('staff-premium-mobile-20260909.js')
  if (!bridge.includes('https://ahslifnthiwfkmaswjno.supabase.co')) fail('production bridge points at the wrong Supabase project')
  if (!bridge.includes('SUPABASE_PUBLISHABLE_KEY')) fail('production bridge publishable key marker missing')
  if (!routes.includes('/staff /staff-os-v5.html 200')) fail('staff route missing')
  for (const asset of ['staff-mobile-command-dock.css?v=20260908-1','staff-mobile-command-dock.js?v=20260908-1','mobile-premium-responsive-v2026.css?v=20260908-1','staff-os-pro-20260909.css?v=20260909-1','staff-shell-polish-20260909.css?v=20260909-1','staff-premium-mobile-20260909.css?v=20260909-1','staff-premium-mobile-20260909.js?v=20260909-1']) if (!staff.includes(asset)) fail(`Staff asset missing from entry: ${asset}`)
  if (!mobile.includes('Staff OS')) fail('Staff mobile command dock marker missing')
  if (staff.includes('YOUR_PROJECT_ID') || staff.includes('YOUR_ANON_KEY')) fail('placeholder Supabase configuration remains in Staff OS')
  ok('Staff/public UI release invariants are present')
} catch (error) { fail(`UI release validation failed: ${error.message}`) }

console.log('')
if (failures) { console.error(`${failures} production contract check(s) failed.`); process.exit(1) }
console.log('All production contract checks passed.')
