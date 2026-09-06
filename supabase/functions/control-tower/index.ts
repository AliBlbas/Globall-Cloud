import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>
type Staff = { id: string; full_name: string | null; role: string; branch: string | null; is_active: boolean }

const ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const FINANCE_ROLES = new Set(['super_admin', 'admin', 'accountant'])
const OPS_ROLES = new Set(['super_admin', 'admin', 'operations', 'warehouse', 'warehouse_china', 'warehouse_uae', 'warehouse_erbil', 'delivery', 'driver'])
const STAFF_ROLES = new Set([...FINANCE_ROLES, ...OPS_ROLES])

const headers = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://globall-cloud.pages.dev',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token, traceparent, tracestate, baggage',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
}
const json = (req: Request, body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(req) })

const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const raw = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!url || !raw) throw new Error('Service configuration unavailable')
  let key = raw
  if (raw.trimStart().startsWith('{')) {
    try { const parsed = JSON.parse(raw) as Record<string, unknown>; key = String(parsed.default || Object.values(parsed)[0] || '') } catch { key = '' }
  }
  if (!key) throw new Error('Service key unavailable')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

const authenticate = async (req: Request) => {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const authorization = req.headers.get('authorization') || ''
  if (!url || !anon || !/^bearer\s+/i.test(authorization)) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: headers(req) })
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: authorization } } })
  const auth = await client.auth.getUser()
  if (auth.error || !auth.data.user) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: headers(req) })
  const service = serviceClient()
  const staff = await service.from('staff').select('id,full_name,role,branch,is_active').eq('id', auth.data.user.id).maybeSingle()
  if (staff.error) throw staff.error
  if (!staff.data?.is_active || !STAFF_ROLES.has(staff.data.role)) throw new Response(JSON.stringify({ error: 'Active staff access required' }), { status: 403, headers: headers(req) })
  return { service, staff: staff.data as Staff }
}

const visible = (staff: Staff, branch: unknown) => staff.branch === 'all' || branch == null || String(branch) === String(staff.branch)
const toDateMs = (value: unknown) => { if (!value) return NaN; const ms = new Date(String(value)).getTime(); return Number.isFinite(ms) ? ms : NaN }

const buildFinance = (invoices: Array<Record<string, unknown>>, payments: Array<Record<string, unknown>>) => {
  const byCurrency = new Map<string, { billed: number; paid: number }>()
  for (const row of invoices) {
    const currency = String(row.currency || 'USD').toUpperCase()
    const item = byCurrency.get(currency) || { billed: 0, paid: 0 }
    item.billed += Number(row.total_amount || 0)
    byCurrency.set(currency, item)
  }
  const invoiceCurrency = new Map<string, string>()
  for (const row of invoices) invoiceCurrency.set(String(row.id), String(row.currency || 'USD').toUpperCase())
  for (const row of payments) {
    if (String(row.status || '').toLowerCase() !== 'succeeded') continue
    const currency = String(row.currency || invoiceCurrency.get(String(row.invoice_id)) || 'USD').toUpperCase()
    const item = byCurrency.get(currency) || { billed: 0, paid: 0 }
    item.paid += Number(row.amount || 0)
    byCurrency.set(currency, item)
  }
  const result: Record<string, { billed: number; paid: number; due: number }> = {}
  for (const [currency, item] of byCurrency) result[currency] = { billed: item.billed, paid: item.paid, due: Math.max(0, item.billed - item.paid) }
  const currencies = Object.keys(result)
  const single = currencies.length === 1 ? result[currencies[0]] : null
  return { by_currency: result, currencies, single_currency_summary: single ? { currency: currencies[0], ...single } : null }
}

const build = async (service: ReturnType<typeof serviceClient>, staff: Staff) => {
  const now = Date.now()
  const finance = FINANCE_ROLES.has(staff.role)
  const admin = new Set(['super_admin', 'admin']).has(staff.role)
  const [shipmentsQ, exceptionsQ, invoicesQ, paymentsQ, outboxQ, receiptsQ, movementsQ, docsQ] = await Promise.all([
    service.from('shipments').select('id,tracking_number,customer_name,branch,operational_status,current_step_index,priority,eta,tracking_updated_at,current_location_label,created_at,archived_at,transport_mode').order('created_at', { ascending: false }).limit(500),
    service.from('logistics_exceptions').select('id,shipment_id,severity,title,note,status,due_at,created_at,updated_at').in('status', ['open', 'acknowledged']).order('created_at', { ascending: false }).limit(500),
    finance ? service.from('shipment_invoices').select('id,shipment_id,total_amount,status,currency,due_at,created_at').order('created_at', { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
    finance ? service.from('payment_transactions').select('id,invoice_id,amount,status,currency,created_at').order('created_at', { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
    admin ? service.from('notification_outbox').select('id,status,channel,created_at').order('created_at', { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
    service.from('warehouse_receipts').select('id,shipment_id,status,created_at').order('created_at', { ascending: false }).limit(500),
    service.from('warehouse_movements').select('id,shipment_id,package_id,to_hub,movement_type,scanned_at').order('scanned_at', { ascending: false }).limit(500),
    service.from('shipment_documents').select('id,shipment_id,document_status,created_at,verified_at').order('created_at', { ascending: false }).limit(500),
  ])
  for (const q of [shipmentsQ, exceptionsQ, invoicesQ, paymentsQ, outboxQ, receiptsQ, movementsQ, docsQ]) if (q.error) throw q.error

  const shipments = ((shipmentsQ.data || []) as Array<Record<string, unknown>>).filter(row => !row.archived_at && visible(staff, row.branch))
  const shipmentIds = new Set(shipments.map(s => String(s.id)))
  const exceptions = ((exceptionsQ.data || []) as Array<Record<string, unknown>>).filter(row => staff.branch === 'all' || shipmentIds.has(String(row.shipment_id)))
  const receipts = ((receiptsQ.data || []) as Array<Record<string, unknown>>).filter(row => shipmentIds.has(String(row.shipment_id)))
  const movements = ((movementsQ.data || []) as Array<Record<string, unknown>>).filter(row => shipmentIds.has(String(row.shipment_id)))
  const docs = ((docsQ.data || []) as Array<Record<string, unknown>>).filter(row => shipmentIds.has(String(row.shipment_id)))
  const outbox = (outboxQ.data || []) as Array<Record<string, unknown>>
  const financeSummary = finance ? buildFinance((invoicesQ.data || []) as Array<Record<string, unknown>>, (paymentsQ.data || []) as Array<Record<string, unknown>>) : null

  const active = shipments.filter(s => !['delivered', 'cancelled', 'closed'].includes(String(s.operational_status || '').toLowerCase()))
  const moving = active.filter(s => ['in_transit', 'at_transit_hub', 'out_for_delivery'].includes(String(s.operational_status || '').toLowerCase()))
  const overdue = active.filter(s => { const eta = toDateMs(s.eta); return Number.isFinite(eta) && eta < now - 2 * 60 * 60 * 1000 })
  const stale = active.filter(s => { const t = toDateMs(s.tracking_updated_at); return Number.isFinite(t) && t < now - 24 * 60 * 60 * 1000 })
  const highPriority = active.filter(s => ['high', 'critical'].includes(String(s.priority || '').toLowerCase()))
  const missingMode = active.filter(s => !String(s.transport_mode || '').trim())
  const unverifiedDocs = docs.filter(d => !d.verified_at || String(d.document_status || '').toLowerCase() !== 'verified').length
  const alerts: Json[] = []
  for (const s of overdue) alerts.push({ type: 'eta_breach', severity: toDateMs(s.eta) < now - 24 * 60 * 60 * 1000 ? 'critical' : 'high', shipment_id: s.id, tracking_number: s.tracking_number, title: 'ETA breach', note: 'Shipment is overdue beyond its ETA.', occurred_at: s.eta })
  for (const s of stale) alerts.push({ type: 'stale_tracking', severity: 'medium', shipment_id: s.id, tracking_number: s.tracking_number, title: 'Tracking heartbeat stale', note: 'No tracking update for more than 24 hours.', occurred_at: s.tracking_updated_at })
  for (const e of exceptions) alerts.push({ type: 'exception', severity: e.severity || 'medium', shipment_id: e.shipment_id, title: e.title || 'Logistics exception', note: e.note || '', occurred_at: e.updated_at || e.created_at, due_at: e.due_at })
  for (const s of highPriority) alerts.push({ type: 'priority', severity: s.priority, shipment_id: s.id, tracking_number: s.tracking_number, title: `${String(s.priority).toUpperCase()} priority shipment`, note: 'Active shipment requires attention.', occurred_at: s.tracking_updated_at || s.created_at })
  for (const s of missingMode) alerts.push({ type: 'missing_data', severity: 'medium', shipment_id: s.id, tracking_number: s.tracking_number, title: 'Transport mode missing', note: 'Assign air/sea/land before operational dispatch.', occurred_at: s.created_at })
  if (admin) {
    const pendingOutbox = outbox.filter(o => ['pending', 'retrying', 'processing'].includes(String(o.status || '').toLowerCase())).length
    if (pendingOutbox > 0) alerts.push({ type: 'outbox_backlog', severity: pendingOutbox > 25 ? 'high' : 'medium', title: 'Notification outbox backlog', note: `${pendingOutbox} notification items require processing.`, occurred_at: new Date().toISOString() })
  }
  alerts.sort((a, b) => toDateMs(b.occurred_at) - toDateMs(a.occurred_at))
  const single = financeSummary?.single_currency_summary || null
  return {
    generated_at: new Date().toISOString(),
    actor: { id: staff.id, name: staff.full_name, role: staff.role, branch: staff.branch },
    kpis: {
      shipments: shipments.length, active: active.length, moving: moving.length,
      delivered: shipments.filter(s => String(s.operational_status || '').toLowerCase() === 'delivered').length,
      overdue: overdue.length, stale_tracking: stale.length, exceptions: exceptions.length,
      high_priority: highPriority.length, missing_transport_mode: missingMode.length,
      warehouse_receipts: receipts.length, warehouse_movements: movements.length,
      documents: docs.length, unverified_documents: unverifiedDocs,
      billed: single?.billed ?? null, paid: single?.paid ?? null, due: single?.due ?? null,
      finance_currencies: financeSummary?.currencies || [],
      notification_outbox: admin ? outbox.length : null,
      notification_pending: admin ? outbox.filter(o => ['pending', 'retrying', 'processing'].includes(String(o.status || '').toLowerCase())).length : null,
    },
    finance: financeSummary,
    alerts: alerts.slice(0, 100),
    recent_shipments: shipments.slice(0, 20).map(s => ({ id: s.id, tracking_number: s.tracking_number, customer_name: s.customer_name, status: s.operational_status, step: s.current_step_index, priority: s.priority, eta: s.eta, location: s.current_location_label, transport_mode: s.transport_mode })),
    health: { api: 'ok', database_queries: 'ok', auth: 'ok', branch_scope: staff.branch || 'all', finance_visibility: finance ? 'enabled' : 'restricted' }
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: headers(req) })
  if (req.method !== 'GET') return json(req, { error: 'Method not allowed' }, 405)
  try { const { service, staff } = await authenticate(req); return json(req, await build(service, staff)) }
  catch (error) { if (error instanceof Response) return error; console.error('control-tower', error); return json(req, { error: error instanceof Error ? error.message : 'Internal server error' }, 500) }
})
