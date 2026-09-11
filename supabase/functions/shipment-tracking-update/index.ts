import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
])

const STAFF_ROLES = new Set([
  'super_admin', 'admin', 'operations', 'warehouse', 'warehouse_china',
  'warehouse_uae', 'warehouse_erbil', 'delivery', 'driver', 'accountant', 'finance',
])

const STATUS = new Set([
  'received_origin', 'in_transit', 'at_transit_hub', 'customs',
  'out_for_delivery', 'delivered', 'on_hold', 'cancelled',
])

const cors = (req: Request) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': ORIGINS.has(req.headers.get('origin') || '')
    ? (req.headers.get('origin') || '')
    : 'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Cache-Control': 'no-store',
  'Vary': 'Origin',
})

const out = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors(req) })

const text = (v: unknown) => v == null ? '' : String(v).trim()

async function authenticate(req: Request) {
  const url = Deno.env.get('SUPABASE_URL') || ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || ''
  const authorization = req.headers.get('Authorization') || ''

  if (!url || !anon || !service || !/^Bearer\s+/i.test(authorization)) {
    throw new Error('Unauthorized')
  }

  const authClient = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const user = await authClient.auth.getUser()
  if (user.error || !user.data.user) throw new Error('Unauthorized')

  const db = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const staff = await db
    .from('staff')
    .select('id,full_name,role,branch,is_active,email')
    .eq('id', user.data.user.id)
    .maybeSingle()

  if (staff.error) throw staff.error
  if (!staff.data?.is_active || !STAFF_ROLES.has(String(staff.data.role))) {
    throw new Error('Staff permission required')
  }

  return { db, user: user.data.user, staff: staff.data }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })

  try {
    if (req.method !== 'POST') return out(req, { error: 'Method not allowed' }, 405)

    const { db, staff } = await authenticate(req)
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const p = (body.data && typeof body.data === 'object' ? body.data : body) as Record<string, unknown>

    const gcCode = text(p.gc_code || p.tracking_code || p.tracking_number)
    const requestedStatus = text(p.status || p.status_key)
    const imageUrl = text(p.image_url || p.photo_url)
    const locationLabel = text(p.location_label || p.current_location_label)
    const note = text(p.note)

    if (!gcCode) return out(req, { error: 'gc_code is required' }, 400)
    if (!requestedStatus || !STATUS.has(requestedStatus)) {
      return out(req, { error: 'Valid shipment status is required' }, 400)
    }

    const shipment = await db
      .from('shipments')
      .select('*')
      .or(`id.eq.${gcCode},tracking_code.eq.${gcCode},tracking_number.eq.${gcCode}`)
      .maybeSingle()

    if (shipment.error) throw shipment.error
    if (!shipment.data) return out(req, { error: 'Shipment not found' }, 404)

    const row = shipment.data
    const now = new Date().toISOString()
    const oldStatus = text(row.status || row.operational_status)

    const patch: Record<string, unknown> = {
      status: requestedStatus,
      operational_status: requestedStatus,
      tracking_updated_at: now,
      updated_at: now,
    }

    if (locationLabel) patch.current_location_label = locationLabel

    const stepDates = { ...(row.step_dates && typeof row.step_dates === 'object' ? row.step_dates : {}) } as Record<string, unknown>
    if (requestedStatus !== oldStatus) stepDates[requestedStatus] = now
    patch.step_dates = stepDates

    const updated = await db.from('shipments').update(patch).eq('id', row.id).select('*').single()
    if (updated.error) throw updated.error

    const photos = imageUrl ? [imageUrl] : []
    const event = await db.from('shipment_tracking_events').insert({
      shipment_id: row.id,
      status_key: requestedStatus,
      title: requestedStatus === oldStatus ? 'Shipment tracking update' : `Shipment status: ${requestedStatus}`,
      note: note || `Status updated by ${staff.full_name}.`,
      location_label: locationLabel || row.current_location_label || null,
      photos,
      created_by: staff.id,
      created_by_name: staff.full_name,
      is_public: p.is_public !== false,
    }).select('id,shipment_id,status_key,title,note,location_label,photos,occurred_at,created_by_name').single()

    if (event.error) throw event.error

    // Reliable notification chain: tracking event -> notification_outbox -> notification-dispatch -> WhatsApp.
    // No provider token is exposed to the browser and failed sends remain retryable.
    const notifyGroup = p.notify_group !== false
    const groupId = text(p.whatsapp_group_id || Deno.env.get('WHATSAPP_GROUP_ID'))

    if (notifyGroup && groupId) {
      const eventKey = `shipment_tracking:${event.data.id}:whatsapp`
      const payload = {
        title: `📦 ${gcCode}`,
        body: `${requestedStatus}${locationLabel ? `\n📍 ${locationLabel}` : ''}${note ? `\n${note}` : ''}${imageUrl ? `\n🖼️ ${imageUrl}` : ''}`,
        template_name: Deno.env.get('WHATSAPP_TEMPLATE_NAME') || 'globall_notification',
        template_language: Deno.env.get('WHATSAPP_TEMPLATE_LANGUAGE') || 'ckb',
        media_url: imageUrl || null,
        action_url: `/track?gc=${encodeURIComponent(gcCode)}`,
      }

      const queued = await db.from('notification_outbox').upsert({
        channel: 'whatsapp',
        event_key: eventKey,
        recipient: groupId,
        payload,
        status: 'pending',
        next_attempt_at: now,
        shipment_id: row.id,
        customer_user_id: row.customer_user_id || null,
      }, { onConflict: 'event_key,channel', ignoreDuplicates: true }).select('id,event_key,channel,status').maybeSingle()

      if (queued.error) throw queued.error
    }

    await db.from('staff_activity_log').insert({
      staff_id: staff.id,
      staff_name: staff.full_name,
      action: 'shipment.tracking_update',
      target_id: String(row.id),
      details: JSON.stringify({
        gc_code: gcCode,
        before_status: oldStatus,
        after_status: requestedStatus,
        tracking_event_id: event.data.id,
        has_image: Boolean(imageUrl),
      }),
    })

    return out(req, {
      success: true,
      shipment: updated.data,
      tracking_event: event.data,
      whatsapp: groupId && notifyGroup
        ? { queued: true, delivery: 'notification_outbox' }
        : { queued: false, reason: 'WHATSAPP_GROUP_ID not configured or notify_group=false' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = /Unauthorized/i.test(message)
      ? 401
      : /permission/i.test(message)
        ? 403
        : /required|Invalid|not found/i.test(message)
          ? 400
          : 500
    return out(req, { error: message }, status)
  }
})
