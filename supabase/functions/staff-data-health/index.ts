import { createClient } from 'npm:@supabase/supabase-js@2'

const ROLES = new Set([
  'super_admin', 'admin', 'accountant', 'finance', 'warehouse',
  'warehouse_china', 'warehouse_uae', 'warehouse_erbil',
  'operations', 'delivery', 'driver'
])
const ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app'
])
const headers = (req: Request) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': ORIGINS.has(req.headers.get('origin') || '')
    ? (req.headers.get('origin') || '')
    : 'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Cache-Control': 'no-store',
  'Vary': 'Origin'
})
const out = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: headers(req) })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: headers(req) })
  try {
    if (req.method !== 'GET') return out(req, { error: 'Method not allowed' }, 405)

    const url = Deno.env.get('SUPABASE_URL') || ''
    const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || ''
    const authorization = req.headers.get('authorization') || ''
    if (!url || !anon || !service || !/^Bearer\s+/i.test(authorization)) {
      return out(req, { error: 'Unauthorized' }, 401)
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
    const user = await userClient.auth.getUser()
    if (user.error || !user.data.user) return out(req, { error: 'Unauthorized' }, 401)

    const db = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
    const staffResult = await db.from('staff')
      .select('id,full_name,role,branch,is_active')
      .eq('id', user.data.user.id)
      .maybeSingle()
    if (staffResult.error) throw staffResult.error
    if (!staffResult.data?.is_active || !ROLES.has(String(staffResult.data.role))) {
      return out(req, { error: 'Staff permission required' }, 403)
    }

    // Return only aggregate workflow counters. No customer names, recipients,
    // message bodies, shipment IDs, or notification payloads leave this endpoint.
    const [
      shipmentsResult, eventsResult, warehouseResult, financeResult, alertsResult,
      tasksResult, excelPendingResult, failedAllResult, failedEmailResult,
      failedWhatsAppResult, failedSmsResult
    ] = await Promise.all([
      db.from('shipments').select(
        'id,tracking_id,customer_gc_code,status,transport_mode,operational_status,current_location_label,tracking_updated_at,created_at'
      ).limit(5000),
      db.from('shipment_tracking_events').select('shipment_id').limit(10000),
      db.from('warehouse_receipts').select('id,shipment_id,received_at').limit(5000),
      db.from('finance_transactions').select('id,created_at').limit(5000),
      db.from('staff_alerts').select('id,created_at').limit(1000),
      db.from('staff_tasks').select('id,status').limit(2000),
      db.from('excel_import_rows').select('id', { count: 'exact', head: true })
        .in('review_status', ['unreviewed', 'needs_mapping']),
      db.from('notification_outbox').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      db.from('notification_outbox').select('id', { count: 'exact', head: true })
        .eq('status', 'failed').eq('channel', 'email'),
      db.from('notification_outbox').select('id', { count: 'exact', head: true })
        .eq('status', 'failed').eq('channel', 'whatsapp'),
      db.from('notification_outbox').select('id', { count: 'exact', head: true })
        .eq('status', 'failed').eq('channel', 'sms')
    ])

    const results = [
      shipmentsResult, eventsResult, warehouseResult, financeResult, alertsResult,
      tasksResult, excelPendingResult, failedAllResult, failedEmailResult,
      failedWhatsAppResult, failedSmsResult
    ]
    for (const result of results) if (result.error) throw result.error

    const shipments = shipmentsResult.data || []
    const eventIds = new Set((eventsResult.data || []).map((row: any) => String(row.shipment_id)))
    const now = Date.now()
    const stale = shipments.filter((shipment: any) =>
      !shipment.tracking_updated_at ||
      now - new Date(shipment.tracking_updated_at).getTime() > 72 * 3600 * 1000
    )
    const onHold = shipments.filter((shipment: any) =>
      ['on_hold', 'hold'].includes(String(
        shipment.operational_status || shipment.status || ''
      ).toLowerCase())
    ).length

    return out(req, {
      ok: true,
      generated_at: new Date().toISOString(),
      staff: staffResult.data,
      quality: {
        shipments: shipments.length,
        missing_gc: shipments.filter((s: any) => !s.customer_gc_code).length,
        missing_mode: shipments.filter((s: any) => !s.transport_mode).length,
        missing_operational_status: shipments.filter((s: any) => !s.operational_status).length,
        missing_timeline: shipments.filter((s: any) => !eventIds.has(String(s.id))).length,
        stale_72h: stale.length,
        warehouse_receipts: (warehouseResult.data || []).length,
        finance_transactions: (financeResult.data || []).length,
        alerts: (alertsResult.data || []).length,
        tasks_open: (tasksResult.data || []).filter((task: any) =>
          !['done', 'cancelled'].includes(String(task.status))
        ).length
      },
      workflow: {
        excel_review_pending: excelPendingResult.count || 0,
        notifications_failed: failedAllResult.count || 0,
        notifications_failed_by_channel: {
          email: failedEmailResult.count || 0,
          whatsapp: failedWhatsAppResult.count || 0,
          sms: failedSmsResult.count || 0
        },
        shipments_on_hold: onHold
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return out(req, { error: message }, /Unauthorized/i.test(message) ? 401 : 500)
  }
})
