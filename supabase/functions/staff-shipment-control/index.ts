import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGINS = new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const STAFF_ROLES = new Set(['super_admin','admin','accountant','finance','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','delivery','driver'])
const ADMIN_ROLES = new Set(['super_admin','admin'])
const OPS_ROLES = new Set(['super_admin','admin','operations','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','delivery','driver'])
const STATUS = new Set(['received_origin','in_transit','at_transit_hub','customs','out_for_delivery','delivered','on_hold','cancelled'])

const cors = (req: Request) => ({
  'Content-Type':'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': ORIGINS.has(req.headers.get('origin') || '') ? (req.headers.get('origin') || '') : 'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Cache-Control':'no-store',
  'Vary':'Origin'
})
const out = (req:Request, body:unknown, status=200) => new Response(JSON.stringify(body), { status, headers: cors(req) })
const text = (v:unknown) => v == null ? '' : String(v).trim()
const finite = (v:unknown) => v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null

async function auth(req:Request) {
  const url = Deno.env.get('SUPABASE_URL') || ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || ''
  const authorization = req.headers.get('Authorization') || ''
  if (!url || !anon || !service || !/^Bearer\s+/i.test(authorization)) throw new Error('Unauthorized')
  const ac = createClient(url, anon, { global:{headers:{Authorization:authorization}}, auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} })
  const u = await ac.auth.getUser()
  if (u.error || !u.data.user) throw new Error('Unauthorized')
  const db = createClient(url, service, { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} })
  const { data: staff, error } = await db.from('staff').select('id,full_name,role,branch,is_active,email').eq('id',u.data.user.id).maybeSingle()
  if (error) throw error
  if (!staff?.is_active || !STAFF_ROLES.has(String(staff.role))) throw new Error('Staff permission required')
  return { db, user:u.data.user, staff }
}

async function activity(db:any, staff:any, action:string, targetId:string, details:unknown) {
  await db.from('staff_activity_log').insert({
    staff_id:staff.id, staff_name:staff.full_name, action, target_id:targetId,
    details:JSON.stringify(details ?? {})
  })
}

Deno.serve(async (req:Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers:cors(req)})
  try {
    if (req.method !== 'POST') return out(req,{error:'Method not allowed'},405)
    const a = await auth(req)
    const body = await req.json().catch(() => ({}))
    const p = body.data || body
    const id = text(p.id)
    if (!id) return out(req,{error:'Shipment id is required'},400)

    const current = await a.db.from('shipments').select('*').eq('id',id).maybeSingle()
    if (current.error) throw current.error
    if (!current.data) return out(req,{error:'Shipment not found'},404)

    const role = String(a.staff.role)
    if (!OPS_ROLES.has(role)) return out(req,{error:'Operational permission required'},403)
    if (['finance','accountant'].includes(role)) return out(req,{error:'Operational permission required'},403)

    const requestedStatus = text(p.status)
    if (requestedStatus && !STATUS.has(requestedStatus)) return out(req,{error:'Invalid shipment status'},400)

    const isAdmin = ADMIN_ROLES.has(role)
    const patch:any = {}
    const add = (key:string, value:unknown) => { if (value !== undefined) patch[key] = value }

    add('status', requestedStatus || current.data.status)
    add('operational_status', requestedStatus || current.data.operational_status || current.data.status)
    add('transport_mode', text(p.transport_mode) || current.data.transport_mode)
    add('origin_warehouse', text(p.origin_warehouse) || current.data.origin_warehouse)
    add('destination_warehouse', text(p.destination_warehouse) || current.data.destination_warehouse)
    add('current_location_label', text(p.current_location_label) || text(p.location_label) || current.data.current_location_label || current.data.origin_warehouse)
    add('cargo_description', p.cargo_description !== undefined ? text(p.cargo_description) : current.data.cargo_description)
    add('carton_count', p.carton_count !== undefined ? Math.max(0,Number(p.carton_count || 0)) : current.data.carton_count)
    add('actual_weight_kg', p.actual_weight_kg !== undefined ? finite(p.actual_weight_kg) : current.data.actual_weight_kg)
    add('length_cm', p.length_cm !== undefined ? finite(p.length_cm) : current.data.length_cm)
    add('width_cm', p.width_cm !== undefined ? finite(p.width_cm) : current.data.width_cm)
    add('height_cm', p.height_cm !== undefined ? finite(p.height_cm) : current.data.height_cm)
    add('eta', p.eta !== undefined ? (text(p.eta) || null) : current.data.eta)
    add('priority', p.priority !== undefined ? (text(p.priority) || 'normal') : current.data.priority)

    if (p.length_cm !== undefined || p.width_cm !== undefined || p.height_cm !== undefined || p.actual_weight_kg !== undefined) {
      const l = finite(addValue(p.length_cm,current.data.length_cm))
      const w = finite(addValue(p.width_cm,current.data.width_cm))
      const h = finite(addValue(p.height_cm,current.data.height_cm))
      const actual = finite(addValue(p.actual_weight_kg,current.data.actual_weight_kg))
      const vol = l != null && w != null && h != null ? (l*w*h)/6000 : null
      patch.volumetric_weight_kg = vol
      patch.chargeable_weight_kg = p.chargeable_weight_kg !== undefined ? finite(p.chargeable_weight_kg) : (vol == null ? actual : Math.max(actual || 0, vol))
      patch.weight_kg = actual
    }

    if (isAdmin) {
      add('total_amount', p.total_amount !== undefined ? Math.max(0,Number(p.total_amount || 0)) : current.data.total_amount)
      add('paid_amount', p.paid_amount !== undefined ? Math.max(0,Number(p.paid_amount || 0)) : current.data.paid_amount)
      add('assigned_staff_id', p.assigned_staff_id !== undefined ? (text(p.assigned_staff_id) || null) : current.data.assigned_staff_id)
      add('branch', p.branch !== undefined ? (text(p.branch) || a.staff.branch || 'all') : current.data.branch)
    } else {
      delete patch.total_amount
      delete patch.paid_amount
      delete patch.assigned_staff_id
      delete patch.branch
    }

    patch.updated_at = new Date().toISOString()
    patch.tracking_updated_at = new Date().toISOString()

    const changedStatus = requestedStatus && requestedStatus !== current.data.status
    const changedLocation = text(p.current_location_label || p.location_label) && text(p.current_location_label || p.location_label) !== text(current.data.current_location_label)
    if (changedStatus) {
      const stepDates = { ...(current.data.step_dates || {}) }
      stepDates[requestedStatus] = new Date().toISOString()
      patch.step_dates = stepDates
      patch.current_step_index = stepIndex(requestedStatus)
    }

    const { data: row, error } = await a.db.from('shipments').update(patch).eq('id',id).select('*').single()
    if (error) throw error

    let eventSeeded = false
    if (changedStatus || changedLocation || text(p.note)) {
      const ev = await a.db.from('shipment_tracking_events').insert({
        shipment_id:id,
        status_key:requestedStatus || row.status || 'received_origin',
        title: changedStatus ? `Status گۆڕدرا بۆ ${requestedStatus}` : 'نوێکردنەوەی عملیات',
        note: text(p.note) || (changedStatus ? `Status لەلایەن ${a.staff.full_name} نوێکرایەوە.` : `دۆخی بار لەلایەن ${a.staff.full_name} نوێکرایەوە.`),
        location_label: text(p.current_location_label || p.location_label) || row.current_location_label || row.origin_warehouse,
        created_by:a.staff.id,
        created_by_name:a.staff.full_name,
        is_public:p.is_public !== false
      })
      if (ev.error) throw ev.error
      eventSeeded = true
    }

    await activity(a.db,a.staff,'shipment.update',id,{before:{status:current.data.status,location:current.data.current_location_label},after:{status:row.status,location:row.current_location_label},role})
    return out(req,{shipment:row,event_seeded:eventSeeded})
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const status = /Unauthorized/i.test(message) ? 401 : /permission|Forbidden/i.test(message) ? 403 : /required|Invalid|not found/i.test(message) ? 400 : 500
    return out(req,{error:message},status)
  }
})

function addValue(next:unknown, fallback:unknown) { return next === undefined ? fallback : next }
function stepIndex(status:string) {
  return ({received_origin:0,in_transit:1,at_transit_hub:2,customs:3,out_for_delivery:4,delivered:5,on_hold:6,cancelled:7} as Record<string,number>)[status] ?? 0
}