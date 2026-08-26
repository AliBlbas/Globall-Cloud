import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>

const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const SHIPMENT_FIELDS = 'id,customer_user_id,customer_name,customer_phone,customer_email,notes,origin_key,dest_key,type,weight_kg,volume_cbm,items_count,total_amount,paid_amount,current_step_index,step_dates,eta,directory_customer_id,step_photos,batch_code,branch,created_at,origin_lat,origin_lng,dest_lat,dest_lng,current_lat,current_lng,current_location_label,transport_mode,tracking_updated_at'

const cors = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
  }
}

const json = (req: Request, body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: cors(req) })
const env = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

async function getUser(req: Request) {
  const auth = req.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: auth } },
  })
  const { data } = await client.auth.getUser()
  return data.user || null
}

const normalizeGcCode = (value: string) => value.trim().replace(/\s+/g, '-').toUpperCase()
const isGcCode = (value: string) => /^GC-\d{1,6}$/.test(value)
const isDelivered = (shipment: any) => Number(shipment?.current_step_index || 0) >= 5 || Boolean(shipment?.step_dates?.delivered) || ['delivered', 'completed'].includes(String(shipment?.status || '').toLowerCase())

async function resolveShipment(service: ReturnType<typeof createClient>, lookup: string) {
  const byId = await service.from('shipments').select(SHIPMENT_FIELDS).eq('id', lookup).maybeSingle()
  if (byId.error) throw byId.error
  if (byId.data) return { shipment: byId.data, trackingKey: 'shipment_id', customerCode: null, matchingCount: 1 }

  const gcCode = normalizeGcCode(lookup)
  if (!isGcCode(gcCode)) return { shipment: null, trackingKey: 'shipment_id', customerCode: null, matchingCount: 0 }

  const directory = await service
    .from('customer_directory')
    .select('id,gc_code,code')
    .or(`gc_code.eq.${gcCode},code.ilike.${gcCode}`)
    .limit(5)
  if (directory.error) throw directory.error
  const customer = (directory.data || [])[0]
  if (!customer) return { shipment: null, trackingKey: 'customer_code', customerCode: gcCode, matchingCount: 0 }

  const shipments = await service
    .from('shipments')
    .select(SHIPMENT_FIELDS)
    .eq('directory_customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (shipments.error) throw shipments.error

  const ordered = [...(shipments.data || [])].sort((a: any, b: any) => {
    const activeDelta = Number(isDelivered(a)) - Number(isDelivered(b))
    if (activeDelta !== 0) return activeDelta
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })
  return {
    shipment: ordered[0] || null,
    trackingKey: 'customer_code',
    customerCode: customer.gc_code || customer.code || gcCode,
    matchingCount: ordered.length,
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { error: 'Origin not allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'GET') return json(req, { error: 'Method not allowed' }, 405)

  try {
    const lookup = String(new URL(req.url).searchParams.get('id') || '').trim()
    if (!lookup || lookup.length > 128) return json(req, { error: 'Invalid tracking id' }, 400)

    const service = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const user = await getUser(req)
    const resolved = await resolveShipment(service, lookup)
    const shipment = resolved.shipment as any
    if (!shipment) return json(req, { error: 'Shipment not found', tracking_key: resolved.trackingKey }, 404)

    let staff = false
    if (user?.id) {
      const { data: row } = await service.from('staff').select('id').eq('id', user.id).eq('is_active', true).maybeSingle()
      staff = Boolean(row)
    }
    const owner = Boolean(user?.id && shipment.customer_user_id === user.id)
    const privileged = staff || owner
    const { data: eventRows } = await service
      .from('shipment_tracking_events')
      .select('id,status_key,title,note,location_label,lat,lng,occurred_at,photos,is_public,created_at')
      .eq('shipment_id', shipment.id)
      .eq('is_public', true)
      .order('occurred_at', { ascending: false })
      .limit(50)

    return json(req, {
      tracking_key: resolved.trackingKey,
      customer_code: resolved.customerCode,
      matching_shipments_count: resolved.matchingCount,
      shipment: {
        id: shipment.id,
        customer_name: privileged ? shipment.customer_name : null,
        customer_phone: privileged ? shipment.customer_phone : null,
        customer_email: privileged ? shipment.customer_email : null,
        notes: privileged ? shipment.notes : null,
        origin_key: shipment.origin_key,
        dest_key: shipment.dest_key,
        type: shipment.type,
        weight_kg: shipment.weight_kg,
        volume_cbm: shipment.volume_cbm,
        items_count: shipment.items_count,
        total_amount: privileged ? shipment.total_amount : null,
        paid_amount: privileged ? shipment.paid_amount : null,
        current_step_index: shipment.current_step_index,
        step_dates: shipment.step_dates,
        eta: shipment.eta,
        customer_user_id: privileged ? shipment.customer_user_id : null,
        directory_customer_id: privileged ? shipment.directory_customer_id : null,
        step_photos: privileged ? shipment.step_photos : null,
        batch_code: privileged ? shipment.batch_code : null,
        branch: staff ? shipment.branch : null,
        created_at: shipment.created_at,
        origin_lat: shipment.origin_lat,
        origin_lng: shipment.origin_lng,
        dest_lat: shipment.dest_lat,
        dest_lng: shipment.dest_lng,
        current_lat: shipment.current_lat,
        current_lng: shipment.current_lng,
        current_location_label: shipment.current_location_label,
        transport_mode: shipment.transport_mode,
        tracking_updated_at: shipment.tracking_updated_at,
      },
      events: (eventRows || []).map((event: any) => ({
        id: event.id,
        status_key: event.status_key,
        title: event.title,
        note: event.note,
        location_label: event.location_label,
        lat: event.lat,
        lng: event.lng,
        occurred_at: event.occurred_at,
        photos: Array.isArray(event.photos) ? event.photos : [],
        created_at: event.created_at,
      })),
    })
  } catch {
    console.error('public-track error')
    return json(req, { error: 'Internal server error' }, 500)
  }
})
