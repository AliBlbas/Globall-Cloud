#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let failures = 0

const fail = (message) => {
  console.error(`  ✗ ${message}`)
  failures += 1
}
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
  if (!/^project_id\s*=\s*"ahslifnthiwfkmaswjno"$/m.test(config)) {
    fail('Supabase project_id is not pinned to the live production project')
  } else ok('Supabase production project is pinned')
} catch (error) {
  fail(`unable to read supabase/config.toml: ${error.message}`)
}

try {
  const sw = read('sw.js')
  const match = sw.match(/const CACHE_VERSION\s*=\s*['"](gc-v\d+)['"]/) || sw.match(/CACHE_VERSION\s*=\s*['"](gc-v\d+)['"]/) 
  if (!match) fail('sw.js does not expose a canonical gc-vNN cache version')
  else {
    const version = match[1]
    const workflows = walk(join(ROOT, '.github', 'workflows')).filter((file) => /\.(yml|yaml)$/.test(file))
    for (const file of workflows) {
      const source = readFileSync(file, 'utf8')
      const hardCodedVersions = [...source.matchAll(/gc-v\d+/g)].map((m) => m[0])
      for (const value of hardCodedVersions) {
        if (value !== version) fail(`${relative(ROOT, file)} contains stale hard-coded cache version ${value}; canonical is ${version}`)
      }
    }
    ok(`Service Worker cache contract is ${version}`)
  }
} catch (error) {
  fail(`service worker contract failed: ${error.message}`)
}

try {
  const sw = read('sw.js')
  const assetBlock = sw.match(/const STATIC_ASSETS=\[(.*?)\];const BROWSER_COMPAT_CSS/s)
  if (!assetBlock) {
    fail('could not parse STATIC_ASSETS from sw.js')
  } else {
    const assets = [...assetBlock[1].matchAll(/['"](\/[^'"]+)['"]/g)].map((m) => m[1])
    for (const asset of assets) {
      const path = asset.split('?')[0]
      if (!exists(path === '/' ? 'index.html' : path.slice(1))) fail(`Service Worker precache asset is missing: ${asset}`)
    }
    ok(`${assets.length} Service Worker precache assets resolve to repository files`)
  }
} catch (error) {
  fail(`Service Worker asset validation failed: ${error.message}`)
}

const required = [
  'index.html',
  'sw.js',
  'production-bridge.js',
  'runtime-guard.js',
  '_headers',
  '_redirects',
  'tracking-integration.html',
  'tracking-intelligence.js',
  'tracking-intelligence.css',
  'customer-portal.html',
  'warehouse-os.html',
  'driver-workspace.html',
  'staff-os-v5.html',
  'staff-logistics-intelligence.js',
  'staff-logistics-intelligence.css',
  'status.html',
  'status-page.js',
  'gc-platform-vnext.js',
  'gc-platform-vnext-plus.js',
  'gc-runtime-safety-v2026.js',
  'production-brand-repair.js',
  'supabase/config.toml',
  'supabase/functions/_shared/service-key.ts',
  'supabase/functions/logistics-control-tower/index.ts',
  'tests/validate.mjs',
  'tests/e2e/run.mjs',
]
for (const path of required) if (!exists(path)) fail(`missing critical production file: ${path}`)
if (!failures) ok(`${required.length} critical production files are present`)

try {
  const files = walk(ROOT).filter((file) => /\.(js|mjs|ts|tsx|html|css|json|toml|yml|yaml)$/.test(file))
  const secretPatterns = [
    /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?:eyJ|sb_secret_)[A-Za-z0-9._-]{10,}/i,
    /service[_-]?role[_-]?key\s*[:=]\s*["'](?:eyJ|sb_secret_)[A-Za-z0-9._-]{10,}/i,
    /CLOUDFLARE_API_TOKEN\s*[:=]\s*["'][A-Za-z0-9._-]{20,}/i,
  ]
  let secretHits = 0
  let staleHits = 0
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    if (source.includes('swptmhhwhdtyrrfzetam')) {
      staleHits += 1
      fail(`stale Supabase project reference in ${relative(ROOT, file)}`)
    }
    for (const pattern of secretPatterns) {
      if (pattern.test(source)) {
        secretHits += 1
        fail(`secret-like credential literal detected in ${relative(ROOT, file)}`)
        break
      }
    }
  }
  if (!secretHits) ok('No service-role/API-token literals detected in source')
  if (!staleHits) ok('No stale Supabase project references detected')
} catch (error) {
  fail(`source hygiene validation failed: ${error.message}`)
}

try {
  const workflowDir = join(ROOT, '.github', 'workflows')
  const workflows = walk(workflowDir).filter((file) => /\.(yml|yaml)$/.test(file))
  for (const file of workflows) {
    const source = readFileSync(file, 'utf8')
    const name = relative(ROOT, file)
    if (/uses:\s+actions\/(checkout|setup-node)@(v\d+|main|master)/.test(source)) {
      fail(`${name} uses an unpinned checkout/setup-node action`)
    }
    if (source.includes('actions/checkout@') && !source.includes('persist-credentials: false')) {
      fail(`${name} checks out code without disabling persisted Git credentials`)
    }
    if (/^permissions:\s*$/m.test(source) && !/contents:\s*read/.test(source)) {
      fail(`${name} does not declare least-privilege contents: read permissions`)
    }
    if (!/concurrency:\s*\n/.test(source)) fail(`${name} is missing concurrency protection`)
  }
  ok(`${workflows.length} GitHub Actions workflows inspected for hardening invariants`)
} catch (error) {
  fail(`GitHub Actions hardening validation failed: ${error.message}`)
}

try {
  const headers = read('_headers')
  const redirects = read('_redirects')
  if (!headers.includes('Content-Security-Policy:')) fail('Content-Security-Policy header is missing')
  if (/script-src[^\n;]*unsafe-inline/.test(headers)) fail('CSP script-src allows unsafe-inline')
  if (!headers.includes('Strict-Transport-Security:')) fail('HSTS is missing')
  if (!headers.includes('X-Content-Type-Options: nosniff')) fail('nosniff is missing')
  if (!redirects.includes('/track /tracking-integration.html 200')) fail('tracking redirect contract missing')
  if (!redirects.includes('/staff /staff-os-v5.html 200')) fail('staff redirect contract missing')
  ok('Security headers and route contracts are present')
} catch (error) {
  fail(`surface security validation failed: ${error.message}`)
}

try {
  const config = read('supabase/config.toml')
  for (const fn of ['public-config', 'public-message', 'public-quote', 'public-pricing', 'public-track']) {
    const re = new RegExp(`\\[functions\\.${fn}\\][\\s\\S]*?verify_jwt\\s*=\\s*(true|false)`)
    const match = config.match(re)
    if (!match) fail(`missing explicit verify_jwt setting for ${fn}`)
    else if (match[1] !== 'false') fail(`${fn} must remain publicly callable by design`)
  }
  for (const fn of ['logistics-control-plane', 'logistics-control-tower', 'document-access', 'warehouse-receiving', 'operations-admin', 'staff-analytics']) {
    const re = new RegExp(`\\[functions\\.${fn}\\][\\s\\S]*?verify_jwt\\s*=\\s*(true|false)`)
    const match = config.match(re)
    if (!match) fail(`missing explicit verify_jwt setting for protected function ${fn}`)
    else if (match[1] !== 'true') fail(`${fn} must require JWT authentication`)
  }
  ok('Public/protected Edge Function JWT posture is explicit')
} catch (error) {
  fail(`JWT posture validation failed: ${error.message}`)
}

console.log('')
if (failures) {
  console.error(`${failures} production contract check(s) failed.`)
  process.exit(1)
}
console.log('All production contract checks passed.')
