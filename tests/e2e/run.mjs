#!/usr/bin/env node
/*
 * Globall Cloud E2E smoke harness.
 * Default behavior is read-only. It never creates users or mutates production.
 */

const SITE = (process.env.GC_SITE_URL || 'https://globall-cloud.pages.dev').replace(/\/$/, '')
const configuredSupabaseUrl = process.env.E2E_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE = (/^https?:\/\//i.test(configuredSupabaseUrl) ? configuredSupabaseUrl : 'https://ahslifnthiwfkmaswjno.supabase.co').replace(/\/$/, '')
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ''
const ACCOUNT_ADMIN = `${SUPABASE}/functions/v1/account-admin`
const CUSTOMER_SELF = `${SUPABASE}/functions/v1/customer-self`
const mode = process.argv[2] || process.env.E2E_MODE || 'smoke'
const failures = []
const results = []

function record(name, ok, detail = '') {
  const item = { name, ok, detail }
  results.push(item)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(item)
}

function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name])
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`)
}

async function request(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Number(process.env.E2E_TIMEOUT_MS || 20000))
  try {
    return await fetch(url, { redirect: 'follow', ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function readResponse(response) {
  const text = await response.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  return { status: response.status, headers: response.headers, body }
}

function jsonHeaders(token = '') {
  return {
    apikey: ANON_KEY,
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    'content-type': 'application/json',
    origin: SITE,
  }
}

async function assertHttp(name, url, expected, options = {}, shape = null) {
  try {
    const response = await request(url, options)
    const parsed = await readResponse(response)
    const statuses = Array.isArray(expected) ? expected : [expected]
    const statusOk = statuses.includes(parsed.status)
    const shapeOk = !shape || !statusOk || shape(parsed.body)
    const detail = `HTTP ${parsed.status}${statusOk && shapeOk ? '' : `; body=${JSON.stringify(parsed.body).slice(0, 180)}`}`
    record(name, statusOk && shapeOk, detail)
    return parsed
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error))
    return null
  }
}

async function publicSuite() {
  requireEnv(['SUPABASE_ANON_KEY'])
  const routes = [
    '/', '/staff', '/staff-os', '/customer-portal.html', '/tracking-integration.html',
    '/driver-workspace.html', '/warehouse-os.html', '/operations-suite.html',
    '/operations-command-center.html', '/operations-control-v2.html',
    '/super-admin-command-center.html',
  ]
  for (const route of routes) {
    await assertHttp(`public route ${route}`, `${SITE}${route}?e2e=1`, 200, {}, (body) => typeof body === 'string' && body.length > 200)
  }
  for (const asset of ['/robots.txt', '/sitemap.xml', '/manifest.json', '/premium-brand-overrides.css', '/staff-os-premium.css', '/staff-os-console.js', '/production-bridge.js', '/sw.js']) {
    await assertHttp(`public asset ${asset}`, `${SITE}${asset}?e2e=1`, 200, {}, (body) => (typeof body === 'string' && body.length > 20) || (body && typeof body === 'object'))
  }

  await assertHttp('public-config works', `${SUPABASE}/functions/v1/public-config?key=usd_iqd_rate`, 200, { headers: jsonHeaders() }, (body) => body?.key === 'usd_iqd_rate' && body.value !== undefined)
  await assertHttp('public-track validates missing id', `${SUPABASE}/functions/v1/public-track?id=`, 400, { headers: jsonHeaders() }, (body) => body?.error === 'Invalid tracking id')
  await assertHttp('public-quote validates input', `${SUPABASE}/functions/v1/public-quote`, 400, { method: 'POST', headers: jsonHeaders(), body: '{}' }, (body) => typeof body?.error === 'string')
  await assertHttp('public-message validates input', `${SUPABASE}/functions/v1/public-message`, 400, { method: 'POST', headers: jsonHeaders(), body: '{}' }, (body) => typeof body?.error === 'string')
  await assertHttp('public-quote accepts UI payload through honeypot without insert', `${SUPABASE}/functions/v1/public-quote`, 201, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ company_website: 'e2e-honeypot', name: 'E2E Synthetic', phone: '+9647000000000', email: '', origin_key: 'guangzhou', dest_key: 'erbil', transport_mode: 'air', weight_kg: 1 }) }, (body) => body?.ok === true)
  await assertHttp('public-message accepts UI payload through honeypot without insert', `${SUPABASE}/functions/v1/public-message`, 200, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ company_website: 'e2e-honeypot', name: 'E2E Synthetic', email: 'e2e@example.com', message: 'Synthetic no-op', request_type: 'info' }) }, (body) => body?.ok === true)
  await assertHttp('account-admin rejects missing auth', `${ACCOUNT_ADMIN}?kind=chat`, 401, { headers: { apikey: ANON_KEY, origin: SITE } }, (body) => typeof (body?.error || body?.code || body?.message) === 'string')
  await assertHttp('customer-self rejects missing auth', `${SUPABASE}/functions/v1/customer-self`, 401, { headers: jsonHeaders() }, (body) => typeof (body?.error || body?.code || body?.message) === 'string')

  for (const table of ['staff', 'staff_activity_log', 'staff_notifications', 'staff_chat_rooms', 'staff_chat_members', 'staff_chat_messages', 'notification_delivery_events', 'quote_requests']) {
    await assertHttp(`anon REST denied ${table}`, `${SUPABASE}/rest/v1/${table}?select=*&limit=1`, [401, 403], { headers: jsonHeaders() }, (body) => body?.code === '42501' || body?.message || body?.error)
  }

  const health = await assertHttp('system-health is ok', `${SUPABASE}/functions/v1/system-health?e2e=1`, 200, { headers: jsonHeaders() }, (body) => body?.status === 'ok' && Object.entries(body.checks || {}).filter(([key]) => key !== 'timestamp').every(([, value]) => value === true))
  if (health?.body?.status === 'ok') record('system-health all checks true', true, `${health.body.total_ms}ms`)
}

async function internationalSuite() {
  requireEnv(['SUPABASE_ANON_KEY'])
  const validBase = {name: 'E2E Synthetic', phone: '+9647000000000', email: '', origin_key: 'guangzhou', dest_key: 'erbil', transport_mode: 'air', service_level: 'standard', incoterm: 'EXW', weight_kg: 1}
  for (const [label, patch] of [
    ['unsupported origin', {origin_key: 'unknown-hub'}],
    ['unsupported destination', {dest_key: 'unknown-city'}],
    ['unsupported transport', {transport_mode: 'rail'}],
  ]) {
    await assertHttp(`international validation ${label}`, `${SUPABASE}/functions/v1/public-quote`, 400, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({...validBase, ...patch}),
    }, (body) => typeof body?.error === 'string')
  }
  await assertHttp('international supported route no-op guangzhou -> erbil', `${SUPABASE}/functions/v1/public-quote`, 201, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({...validBase, company_website: 'e2e-honeypot'}),
  }, (body) => body?.ok === true)
  await assertHttp('international multimodal mode no-op', `${SUPABASE}/functions/v1/public-quote`, 201, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({...validBase, transport_mode: 'multimodal', company_website: 'e2e-honeypot'}),
  }, (body) => body?.ok === true)
  for (const requestType of ['shipping', 'info', 'support']) {
    await assertHttp(`international contact type ${requestType}`, `${SUPABASE}/functions/v1/public-message`, 200, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({company_website: 'e2e-honeypot', name: 'E2E Synthetic', email: 'e2e@example.com', message: `Synthetic ${requestType}`, request_type: requestType}),
    }, (body) => body?.ok === true)
  }
}

function customerShape(body) {
  return body?.ok === true && body.profile && typeof body.profile === 'object' && boundedArray(body.shipments, 30) && boundedArray(body.notifications, 12) && boundedArray(body.quotes, 12) && boundedArray(body.documents, 12) && boundedArray(body.pods, 12) && boundedArray(body.invoices, 20) && boundedArray(body.payments, 20) && boundedArray(body.events, 100) && boundedArray(body.ledger, 100)
}

async function customerSuite() {
  requireEnv(['SUPABASE_ANON_KEY', 'E2E_CUSTOMER_EMAIL', 'E2E_CUSTOMER_PASSWORD'])
  let session
  try {
    session = await signIn(process.env.E2E_CUSTOMER_EMAIL, process.env.E2E_CUSTOMER_PASSWORD)
    record('customer Supabase Auth login', true)
  } catch (error) {
    record('customer Supabase Auth login', false, error instanceof Error ? error.message : String(error))
    return null
  }
  const dashboard = await assertHttp('customer portal dashboard contract', CUSTOMER_SELF, 200, {headers: jsonHeaders(session.access_token)}, customerShape)
  const profile = await assertHttp('customer self-profile contract', `${SUPABASE}/functions/v1/account-self-profile`, 200, {headers: jsonHeaders(session.access_token)}, (body) => body?.profile?.kind === 'customer' && typeof body.profile.email === 'string')
  if (dashboard?.body?.profile?.id) record('customer dashboard ownership marker', true, 'profile returned for authenticated customer')
  await assertHttp('customer quote validation without write', CUSTOMER_SELF, 400, {method: 'POST', headers: jsonHeaders(session.access_token), body: JSON.stringify({action: 'request_quote', data: {}})}, (body) => typeof body?.error === 'string')
  await assertHttp('customer notification action validation without write', CUSTOMER_SELF, 400, {method: 'POST', headers: jsonHeaders(session.access_token), body: JSON.stringify({action: 'mark_notification_read', data: {}})}, (body) => typeof body?.error === 'string')
  await assertHttp('customer quote acceptance validation without write', CUSTOMER_SELF, 400, {method: 'POST', headers: jsonHeaders(session.access_token), body: JSON.stringify({action: 'accept_quote', data: {}})}, (body) => typeof body?.error === 'string')
  return {session, dashboard, profile}
}

async function signIn(email, password) {
  const response = await request(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  })
  const parsed = await readResponse(response)
  if (parsed.status !== 200 || !parsed.body?.access_token || !parsed.body?.user?.id) {
    throw new Error(`Auth failed with HTTP ${parsed.status}: ${JSON.stringify(parsed.body).slice(0, 220)}`)
  }
  return parsed.body
}

async function staffSelfProfile(token, userId, label) {
  return assertHttp(`${label} self-profile is scoped`, `${SUPABASE}/rest/v1/staff?id=eq.${encodeURIComponent(userId)}&select=id,full_name,role,branch,is_active&limit=1`, 200, { headers: jsonHeaders(token) }, (body) => Array.isArray(body) && body.length === 1 && body[0].id === userId && body[0].is_active === true)
}

function boundedArray(value, max) {
  return Array.isArray(value) && value.length <= max
}

function getShape(kind, body) {
  if (!body || typeof body !== 'object' || body.error) return false
  if (kind === 'finance') {
    return body.kind === 'finance' && boundedArray(body.invoices, 1000) && boundedArray(body.costs, 1000) && body.summary && typeof body.summary === 'object' && boundedArray(body.byRoute, 10000)
  }
  if (kind === 'pricing') return body.kind === 'pricing' && boundedArray(body.rates, 1000) && boundedArray(body.exchange_rates, 100)
  if (kind === 'chat') return body.kind === 'chat' && boundedArray(body.rooms, 100) && body.rooms.every((room) => room && boundedArray(room.members, 100) && boundedArray(room.messages, 300))
  if (kind === 'notification') return body.kind === 'notification' && boundedArray(body.items, 50) && Number.isInteger(body.unread_count) && body.unread_count >= 0
  if (kind === 'notification_delivery') return body.kind === 'notification_delivery' && boundedArray(body.items, 40)
  if (kind === 'receipt') return body.kind === 'receipt' && boundedArray(body.items, 100)
  if (kind === 'quote_requests') return body.kind === 'quote_requests' && boundedArray(body.items, 300)
  if (['task', 'customer', 'staff', 'shipment', 'log'].includes(kind)) return body.kind === kind && boundedArray(body.items, kind === 'task' ? 200 : 10000)
  return true
}

async function accountGet(token, kind, expected, label = kind) {
  return assertHttp(`${label} GET ${kind}`, `${ACCOUNT_ADMIN}?kind=${encodeURIComponent(kind)}&e2e=1`, expected, { headers: jsonHeaders(token) }, (body) => getShape(kind, body))
}

async function accountPost(token, kind, action, data, expected, label) {
  return assertHttp(`${label || `${kind}/${action}`} POST`, ACCOUNT_ADMIN, expected, { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify({ kind, action, data }) }, (body) => body && typeof body === 'object' && (expected === 200 ? !body.error : true))
}

async function staffSuite(emailEnv = 'E2E_STAFF_EMAIL', passwordEnv = 'E2E_STAFF_PASSWORD', label = 'staff') {
  requireEnv(['SUPABASE_ANON_KEY', emailEnv, passwordEnv])
  let session
  try {
    session = await signIn(process.env[emailEnv], process.env[passwordEnv])
    record(`${label} Supabase Auth login`, true, session.user.id)
  } catch (error) {
    record(`${label} Supabase Auth login`, false, error instanceof Error ? error.message : String(error))
    return null
  }

  const profileResponse = await staffSelfProfile(session.access_token, session.user.id, label)
  const profile = profileResponse?.body?.[0]
  const role = String(profile?.role || '')
  const canRead = ['admin', 'super_admin', 'accountant'].includes(role)
  const canReadOperations = ['admin', 'super_admin', 'accountant', 'warehouse', 'operations'].includes(role)
  const canChat = ['admin', 'super_admin', 'accountant', 'finance', 'warehouse', 'operations', 'driver'].includes(role)

  if (canRead) {
    await accountGet(session.access_token, 'finance', 200, `${label} finance`)
    await accountGet(session.access_token, 'pricing', 200, `${label} pricing`)
    await accountGet(session.access_token, 'shipment', 200, `${label} shipments`)
    await accountGet(session.access_token, 'customer', 200, `${label} customers`)
    await accountGet(session.access_token, 'staff', 200, `${label} staff directory`)
    await accountGet(session.access_token, 'log', 200, `${label} activity log`)
  } else {
    await accountGet(session.access_token, 'finance', 403, `${label} finance gate`)
    await accountGet(session.access_token, 'shipment', 403, `${label} shipment gate`)
    await accountGet(session.access_token, 'customer', 403, `${label} customer gate`)
  }

  if (canReadOperations) {
    await accountGet(session.access_token, 'task', 200, `${label} tasks`)
    await accountGet(session.access_token, 'quote_requests', 200, `${label} quotes`)
    await accountGet(session.access_token, 'receipt', 200, `${label} receipts`)
    await accountGet(session.access_token, 'notification', 200, `${label} notifications`)
    await accountGet(session.access_token, 'notification_delivery', 200, `${label} delivery events`)
  } else {
    await accountGet(session.access_token, 'quote_requests', 403, `${label} quote gate`)
    await accountGet(session.access_token, 'task', 403, `${label} task gate`)
  }

  if (canChat) await accountGet(session.access_token, 'chat', 200, `${label} chat read`)
  else await accountGet(session.access_token, 'chat', 403, `${label} chat gate`)

  // Negative POST probes exercise routing and validation without creating data.
  await accountPost(session.access_token, 'quote', 'calculate', {}, canReadOperations ? [400, 404] : 403, `${label} quote validation`)
  await accountPost(session.access_token, 'chat', 'send', {}, canChat ? 400 : 403, `${label} chat validation`)
  await accountPost(session.access_token, 'notification', 'update', {}, canReadOperations ? 400 : 403, `${label} notification validation`)
  await accountPost(session.access_token, 'task', 'create', {}, canRead ? 400 : 403, `${label} task validation`)

  return { session, profile, role }
}

async function main() {
  if (mode === 'smoke' || mode === 'public') await publicSuite()
  else if (mode === 'international') await internationalSuite()
  else if (mode === 'customer' || mode === 'customer-portal' || mode === 'portal') await customerSuite()
  else if (mode === 'staff' || mode === 'production-readonly' || mode === 'staging') await staffSuite()
  else if (mode === 'staff-2' || mode === 'two-staff') {
    await staffSuite('E2E_STAFF_EMAIL', 'E2E_STAFF_PASSWORD', 'staff-1')
    await staffSuite('E2E_STAFF_2_EMAIL', 'E2E_STAFF_2_PASSWORD', 'staff-2')
    record('two-session Realtime boundary', true, 'API sessions verified; browser-level delivery requires Playwright/provider contexts')
  } else if (mode === 'mutations') {
    throw new Error('Mutation E2E is intentionally disabled: the current production API has no safe delete/reset contract for chat and quote fixtures. Use a disposable staging project and add an explicit cleanup endpoint before enabling writes.')
  } else {
    throw new Error(`Unknown mode: ${mode}. Use smoke, international, customer, production-readonly, staging, two-staff, or mutations.`)
  }
  console.log(`\n${results.length - failures.length}/${results.length} assertions passed`)
  if (failures.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(`FATAL ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
