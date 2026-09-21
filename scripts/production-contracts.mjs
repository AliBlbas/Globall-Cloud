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

const config = read('supabase/config.toml')
if (/^project_id\s*=\s*"ahslifnthiwfkmaswjno"$/m.test(config)) ok('Supabase production project is pinned')
else fail('Supabase project_id is not pinned to production')

const sw = read('sw.js')
const cacheName = sw.match(/const CACHE_NAME\s*=\s*['"]([^'"]+)['"]/)?.[1]
if (cacheName && /^globall-cloud-v\d+-\d{8,}$/.test(cacheName)) ok(`Service-worker cache is versioned: ${cacheName}`)
else fail('sw.js does not use a versioned Globall Cloud cache name')
if (sw.includes("fetch(request, { cache: 'no-store' })") && sw.includes('self.skipWaiting()') && sw.includes('self.clients.claim()')) ok('Service worker is network-first and self-updating')
else fail('Service Worker network-first/lifecycle contract is incomplete')

const required = [
  'index.html','sw.js','production-bridge.js','runtime-guard.js','_headers','_redirects','public-route-bootstrap.js','public-runtime-guarantee.js',
  'public-staff-guard-20260909.js','public-premium-mobile-20260909.css','public-premium-mobile-20260909.js','tracking-integration.html','tracking-intelligence.js',
  'tracking-intelligence.css','customer-portal.html','warehouse-os.html','driver-workspace.html','staff-os-v5.html','staff-os-v5.css','staff-os-v5.js',
  'staff-os-v5-rescue.js','staff-logistics-intelligence.css','staff-logistics-intelligence.js','staff-mobile-command-dock.css','staff-mobile-command-dock.js',
  'staff-os-pro-20260909.css','staff-os-pro-20260909.js','staff-shell-polish-20260909.css','staff-shell-polish-20260909.js',
  'staff-premium-mobile-20260909.css','staff-premium-mobile-20260909.js','warehouse-offline-sync.js','production-mobile-ux-v2026.css','gc-platform-vnext.js',
  'gc-platform-vnext-plus.js','gc-runtime-safety-v2026.js','production-brand-repair.js','gc-csp-scripts/logistics-pricing-ui.js','supabase/config.toml',
  'package.json','supabase/functions/_shared/service-key.ts','supabase/functions/logistics-control-plane/index.ts',
  'supabase/functions/notification-dispatch/index.ts','supabase/functions/warehouse-receiving/index.ts','supabase/functions/warehouse-notify/index.ts',
  'supabase/functions/staff-ops-hub/index.ts','supabase/functions/staff-analytics/index.ts','supabase/functions/invoice-ai/index.ts',
  'supabase/functions/customer-debt-assistant/index.ts','supabase/functions/fx-refresh/index.ts','supabase/functions/public-config/index.ts',
  'supabase/functions/public-message/index.ts','supabase/functions/public-quote/index.ts','supabase/functions/public-pricing/index.ts',
  'supabase/functions/public-track/index.ts','supabase/functions/customer-self/index.ts','supabase/functions/payment-webhook/index.ts',
  'supabase/functions/_shared/payment-providers.ts','tests/validate.mjs','tests/e2e/run.mjs'
]
const missing = required.filter((path) => !exists(path))
if (missing.length) missing.forEach((path) => fail(`missing critical production file: ${path}`))
else ok(`${required.length} critical production files are present`)

const extensions = new Set(['.js','.mjs','.ts','.tsx','.html','.css','.json','.toml','.yml','.yaml'])
const files = walk(ROOT).filter((file) => extensions.has(file.slice(file.lastIndexOf('.'))))
const staleProjectRef = 'swptmhhwhdtyrrfzetam'
let staleHits = 0
let secretHits = 0
const secretPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?:eyJ|sb_secret_)[A-Za-z0-9._-]{10,}/i,
  /service[_-]?role[_-]?key\s*[:=]\s*["'](?:eyJ|sb_secret_)[A-Za-z0-9._-]{10,}/i,
  /CLOUDFLARE_API_TOKEN\s*[:=]\s*["'][A-Za-z0-9._-]{20,}/i,
]
for (const file of files) {
  const source = readFileSync(file, 'utf8')
  if (source.includes(staleProjectRef)) { staleHits += 1; fail(`stale Supabase project reference in ${relative(ROOT, file)}`) }
  if (secretPatterns.some((pattern) => pattern.test(source))) { secretHits += 1; fail(`secret-like credential literal detected in ${relative(ROOT, file)}`) }
}
if (!staleHits) ok('No stale Supabase project reference detected')
if (!secretHits) ok('No secret-like service credential detected in source')

const headers = read('_headers')
const redirects = read('_redirects')
if (!headers.includes('Content-Security-Policy:') || /script-src[^\n;]*unsafe-inline/.test(headers) || !headers.includes('Strict-Transport-Security:') || !headers.includes('X-Content-Type-Options: nosniff')) fail('security header contract is incomplete')
else ok('Security headers are present')
for (const route of ['/track /tracking-integration.html 200','/staff /staff-os-v5.html 200','/staff/ /staff-os-v5.html 200','/staff-os /staff-os-v5.html 200']) if (!redirects.includes(route)) fail(`route contract missing: ${route}`)
if (!failures) ok('Core public/staff routes are wired')

const bridge = read('production-bridge.js')
const staff = read('staff-os-v5.html')
const publicIndex = read('gc-csp-scripts/index-inline-2.js')
const publicBootstrap = read('public-route-bootstrap.js')
const publicRuntime = read('public-runtime-guarantee.js')
if (!bridge.includes('https://ahslifnthiwfkmaswjno.supabase.co')) fail('production bridge points at the wrong Supabase project')
if (!bridge.includes('SUPABASE_PUBLISHABLE_KEY')) fail('production bridge publishable key marker missing')
if (!staff.includes('staff-premium-mobile-20260909.css?v=')) fail('Staff premium mobile CSS is not loaded')
if (!staff.includes('staff-premium-mobile-20260909.js?v=')) fail('Staff premium mobile JS is not loaded')
if (!staff.includes('mobile-premium-responsive-v2026.css?v=')) fail('Staff responsive CSS is not loaded')
if (!staff.includes('staff-os-pro-20260909.css?v=') || !staff.includes('staff-shell-polish-20260909.css?v=')) fail('Staff shell polish assets are not loaded')
if (!publicIndex.includes('functions/v1/public-quote')) fail('public quote endpoint is not wired')
if (!publicIndex.includes('functions/v1/public-message')) fail('public message endpoint is not wired')
if (!publicBootstrap.includes('/public-runtime-guarantee.js')) fail('public runtime guarantee is not loaded')
if (!publicRuntime.includes('renderEmergencyShell')) fail('public emergency shell is missing')
if (staff.includes('YOUR_PROJECT_ID') || staff.includes('YOUR_ANON_KEY')) fail('Staff OS still contains placeholder Supabase configuration')

const publicFns = ['public-config','public-message','public-quote','public-pricing','public-track','customer-self','staff-directory']
for (const fn of publicFns) {
  const block = new RegExp(`\\[functions\\.${fn}\\][\\s\\S]*?verify_jwt\\s*=\\s*(true|false)`).exec(config)
  if (!block) fail(`missing explicit verify_jwt setting for ${fn}`)
  else if (block[1] !== 'false') fail(`${fn} must be publicly callable`)
}
if (!failures) ok('Public function JWT posture is explicit')

console.log('')
if (failures) { console.error(`${failures} production contract check(s) failed.`); process.exit(1) }
console.log('All production contract checks passed.')
