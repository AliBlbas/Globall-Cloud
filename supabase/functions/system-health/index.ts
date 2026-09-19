import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
])

function headers(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Vary': 'Origin',
  }
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(req) })
}

function env(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

async function authorizeSuperAdmin(req: Request) {
  const auth = req.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null
  const url = env('SUPABASE_URL')
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!publicKey || !serviceKey) throw new Error('Supabase authentication keys are not configured')

  const authClient = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: auth } },
  })
  const { data: userData, error: userError } = await authClient.auth.getUser()
  if (userError || !userData.user) return null

  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data: staff, error } = await service
    .from('staff')
    .select('id,role,is_active')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (error) throw error
  if (!staff || staff.is_active !== true || staff.role !== 'super_admin') return null
  return { service, userId: userData.user.id }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: headers(req) })
  if (req.method !== 'GET') return json(req, { error: 'Method not allowed' }, 405)

  const auth = await authorizeSuperAdmin(req)
  if (!auth) return json(req, { error: 'Super Admin access required' }, 403)

  const started = performance.now()
  const url = Deno.env.get('SUPABASE_URL')
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')

  if (!url || !publicKey || !serviceKey) {
    return json(req, {
      status: 'down',
      service: 'globall-cloud',
      error: 'server configuration is missing',
      total_ms: Math.round(performance.now() - started),
    }, 503)
  }

  const checks = {
    database: false,
    shipments: false,
    configuration_bridge: false,
    control_plane: false,
    notification_outbox: false,
    integration_inbox: false,
    payment_sessions: false,
    payment_webhook_events: false,
    advanced_workflows: false,
    document_vault: false,
    document_storage: false,
    timestamp: new Date().toISOString(),
  }
  let configError: string | null = null
  let shipmentError: string | null = null
  let controlPlaneError: string | null = null
  let paymentError: string | null = null
  let advancedError: string | null = null

  try {
    const configResponse = await fetch(`${url}/functions/v1/public-config?key=usd_iqd_rate`, {
      headers: { apikey: publicKey, Accept: 'application/json' },
      cache: 'no-store',
    })
    const configBody = await configResponse.json().catch(() => ({})) as Record<string, unknown>
    checks.configuration_bridge = configResponse.ok && configBody.key === 'usd_iqd_rate' && configBody.value !== null && configBody.value !== undefined
    checks.database = checks.configuration_bridge
    if (!checks.configuration_bridge) configError = `public-config returned ${configResponse.status}`
  } catch (error) {
    configError = error instanceof Error ? error.message : 'configuration bridge request failed'
  }

  try {
    const db = auth.service
    const shipmentProbe = await db.from('shipments').select('id').limit(1)
    checks.shipments = !shipmentProbe.error
    if (shipmentProbe.error) shipmentError = shipmentProbe.error.message
    const [historyProbe, packagesProbe, customsProbe, outboxProbe, inboxProbe, paymentSessionsProbe, paymentEventsProbe, movementsProbe, routeLegsProbe, documentsProbe] = await Promise.all([
      db.from('shipment_status_history').select('id').limit(1),
      db.from('shipment_packages').select('id').limit(1),
      db.from('shipment_customs_cases').select('id').limit(1),
      db.from('notification_outbox').select('id').limit(1),
      db.from('integration_inbox').select('id').limit(1),
      db.from('payment_sessions').select('id').limit(1),
      db.from('payment_webhook_events').select('id').limit(1),
      db.from('warehouse_movements').select('id').limit(1),
      db.from('shipment_route_legs').select('id').limit(1),
      db.from('shipment_documents').select('id').limit(1),
    ])
    checks.control_plane = !historyProbe.error && !packagesProbe.error && !customsProbe.error
    checks.notification_outbox = !outboxProbe.error
    checks.integration_inbox = !inboxProbe.error
    checks.payment_sessions = !paymentSessionsProbe.error
    checks.payment_webhook_events = !paymentEventsProbe.error
    checks.advanced_workflows = !movementsProbe.error && !routeLegsProbe.error
    checks.document_vault = !documentsProbe.error
    const storageProbe = await db.storage.from('shipment-documents').list('', { limit: 1 })
    checks.document_storage = !storageProbe.error
    if (!checks.control_plane) controlPlaneError = 'control-plane migration is missing or inaccessible'
    if (!checks.payment_sessions || !checks.payment_webhook_events) paymentError = 'payment migration is missing or inaccessible'
    if (!checks.advanced_workflows || !checks.document_vault || !checks.document_storage) advancedError = 'advanced logistics or document-vault/storage migration is missing or inaccessible'
  } catch (error) {
    shipmentError = error instanceof Error ? error.message : 'server probe failed'
  }

  const ok = checks.database && checks.shipments && checks.control_plane && checks.notification_outbox && checks.integration_inbox && checks.payment_sessions && checks.payment_webhook_events && checks.advanced_workflows && checks.document_vault && checks.document_storage
  return json(req, {
    status: ok ? 'ok' : 'degraded',
    service: 'globall-cloud',
    checks,
    ...(configError || shipmentError || controlPlaneError || paymentError || advancedError ? { diagnostics: { configuration: configError, shipments: shipmentError, control_plane: controlPlaneError, payment: paymentError, advanced_workflows: advancedError } } : {}),
    latency_ms: Math.round(performance.now() - started),
    total_ms: Math.round(performance.now() - started),
  }, ok ? 200 : 503)
})
