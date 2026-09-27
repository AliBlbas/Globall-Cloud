import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
])

function headers(req: Request, requestId: string) {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-ID': requestId,
    ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'content-type, x-request-id, apikey, authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Vary': 'Origin',
  }
}

const response = (req: Request, requestId: string, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: headers(req, requestId) })

Deno.serve(async (req) => {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(req, requestId) })
  if (req.method !== 'GET') return response(req, requestId, { error: 'Method not allowed' }, 405)

  const started = performance.now()
  try {
    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
    const publicKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    if (!url || !serviceKey || !publicKey) {
      return response(req, requestId, { ok: false, status: 'degraded', request_id: requestId }, 503)
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const configPromise = fetch(url + '/functions/v1/public-config?key=usd_iqd_rate', {
      headers: { apikey: publicKey, Accept: 'application/json', 'x-request-id': requestId },
      cache: 'no-store',
    }).then(async (r) => {
      const body = await r.json().catch(() => ({}))
      return r.ok && body?.key === 'usd_iqd_rate' && body?.value != null
    }).catch(() => false)
    const probes = await Promise.all([
      configPromise,
      admin.from('shipments').select('id').limit(1).then((r) => !r.error),
      admin.from('shipment_status_history').select('id').limit(1).then((r) => !r.error),
      admin.from('shipment_packages').select('id').limit(1).then((r) => !r.error),
      admin.from('shipment_route_legs').select('id').limit(1).then((r) => !r.error),
      admin.from('warehouse_receipts').select('id').limit(1).then((r) => !r.error),
      admin.from('warehouse_movements').select('id').limit(1).then((r) => !r.error),
      admin.from('notification_outbox').select('id').limit(1).then((r) => !r.error),
      admin.from('integration_inbox').select('id').limit(1).then((r) => !r.error),
      admin.from('payment_sessions').select('id').limit(1).then((r) => !r.error),
      admin.from('payment_webhook_events').select('id').limit(1).then((r) => !r.error),
      admin.from('shipment_documents').select('id').limit(1).then((r) => !r.error),
      admin.from('customer_directory').select('id').limit(1).then((r) => !r.error),
    ])
    const [configuration, shipments, statusHistory, packages, routeLegs, receipts, movements, notifications, integrations, payments, paymentWebhooks, documents, customerDirectory] = probes
    const checks = {
      database: configuration,
      logistics: shipments && statusHistory && packages && routeLegs,
      warehouse: receipts && movements,
      notifications: notifications && integrations,
      payments: payments && paymentWebhooks,
      documents,
      customer_directory: customerDirectory,
    }
    const ok = Object.values(checks).every(Boolean)
    return response(req, requestId, {
      ok, status: ok ? 'ready' : 'degraded', service: 'globall-cloud', checks,
      request_id: requestId, timestamp: new Date().toISOString(),
      total_ms: Math.round(performance.now() - started),
    }, ok ? 200 : 503)
  } catch {
    return response(req, requestId, {
      ok:false, status:'degraded', service:'globall-cloud',
      request_id:requestId, timestamp:new Date().toISOString(),
      total_ms:Math.round(performance.now()-started),
    }, 503)
  }
})
