import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const STAFF_ROLES = new Set(['super_admin','admin','accountant','finance','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','delivery'])
const GLOBAL_ROLES = new Set(['super_admin','admin','operations'])
const WRITE_ROLES = new Set(['super_admin','admin','operations','warehouse','warehouse_uae','warehouse_erbil'])
const SUPABASE_URL = () => Deno.env.get('SUPABASE_URL') || ''
const ANON_KEY = () => Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
const SERVICE_KEY = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const cors = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? {'Access-Control-Allow-Origin': origin} : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  }
}
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: {'Content-Type': 'application/json; charset=utf-8', ...cors(req)},
})
const clean = (value: unknown, max = 180) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const parseNonNegative = (value: unknown, label: string, max = 1_000_000) => {
  if (value === '' || value === null || value === undefined) return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(label + ': value must be between 0 and ' + max)
  return n
}
const normalizeDate = (value: unknown, fallback: string) => {
  const raw = String(value ?? '').trim()
  if (!raw) return fallback
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) return iso[1] + '-' + iso[2].padStart(2,'0') + '-' + iso[3].padStart(2,'0')
  const regional = raw.match(/^(\d{1,2})[.,/-](\d{1,2})[.,/-](\d{4})$/)
  if (regional) return regional[3] + '-' + regional[2].padStart(2,'0') + '-' + regional[1].padStart(2,'0')
  throw new Error('Date "' + raw + '" is invalid; use YYYY-MM-DD or DD.MM.YYYY')
}
const normalizeGC = (row: Record<string, unknown>) => {
  let raw = clean(row.gc_code, 80)
  if (!raw) {
    const match = clean(row.customer_name, 180).match(/\bGC\s*[-–—]?\s*[A-Z0-9]{2,24}\b/i)
    raw = match?.[0] || ''
  }
  raw = raw.normalize('NFKC').toUpperCase().replace(/[–—−]/g, '-').replace(/\s+/g, '').replace(/^GC(?!-)/, 'GC-')
  return /^GC-[A-Z0-9-]{2,30}$/.test(raw) ? raw : ''
}
function normalizeLine(input: unknown, headerDate: string, currency: string, index: number) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Row ' + index + ': line is invalid')
  const row = input as Record<string, unknown>
  const customerName = clean(row.customer_name, 180)
  const cargoType = clean(row.cargo_type, 120)
  if (!customerName) throw new Error('Row ' + index + ': customer name is required')
  if (!cargoType) throw new Error('Row ' + index + ': cargo type is required')
  const boxes = parseNonNegative(row.box_count, 'Row ' + index + ' boxes')
  const pieces = parseNonNegative(row.quantity_pc, 'Row ' + index + ' pcs')
  const weight = parseNonNegative(row.weight_kg, 'Row ' + index + ' kg', 1_000_000)
  const sellPrice = parseNonNegative(row.sell_price, 'Row ' + index + ' sell price', 1_000_000_000)
  if (!Number.isInteger(boxes) || !Number.isInteger(pieces)) throw new Error('Row ' + index + ': boxes and pcs must be whole numbers')
  return {
    customer_name: customerName,
    gc_code: normalizeGC(row),
    shipment_date: normalizeDate(row.shipment_date, headerDate),
    cargo_type: cargoType,
    box_count: boxes,
    quantity_pc: pieces,
    weight_kg: Math.round(weight * 1000) / 1000,
    sell_price: Math.round(sellPrice * 100) / 100,
    currency,
    notes: clean(row.notes, 1000),
  }
}
class HttpError extends Error {
  status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}
async function requireStaff(req: Request) {
  const authorization = req.headers.get('authorization') || ''
  if (!/^Bearer\s+/i.test(authorization)) throw new HttpError('Unauthorized', 401)
  if (!SUPABASE_URL() || !ANON_KEY() || !SERVICE_KEY()) throw new HttpError('Staff manifest service is not configured', 503)
  const authClient = createClient(SUPABASE_URL(), ANON_KEY(), {
    global: {headers: {Authorization: authorization}},
    auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
  })
  const {data: userResult, error: userError} = await authClient.auth.getUser()
  if (userError || !userResult.user) throw new HttpError('Unauthorized', 401)
  const admin = createClient(SUPABASE_URL(), SERVICE_KEY(), {
    auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
  })
  const {data: staff, error} = await admin.from('staff').select('id,full_name,role,branch,is_active').eq('id', userResult.user.id).maybeSingle()
  if (error) throw error
  if (!staff?.is_active || !STAFF_ROLES.has(String(staff.role))) throw new HttpError('Active staff permission required', 403)
  const role = String(staff.role)
  const allowedLandRoles = new Set(['super_admin','admin','accountant','finance','warehouse','warehouse_uae','warehouse_erbil','operations','delivery'])
  if (!allowedLandRoles.has(role)) throw new HttpError('This staff role cannot access the Dubai land manifest', 403)
  const branch = String(staff.branch || 'all').toLowerCase()
  const global = GLOBAL_ROLES.has(role)
  const dubaiScope = global || role === 'warehouse_uae' || (role === 'warehouse' && ['all','dubai','uae'].includes(branch))
  const erbilScope = global || role === 'warehouse_erbil' || (role === 'warehouse' && ['all','erbil'].includes(branch)) || (role === 'delivery' && branch === 'erbil')
  const canRead = global || ['accountant','finance'].includes(role) || dubaiScope || erbilScope
  const canWrite = WRITE_ROLES.has(role)
  return {admin, staff, role, branch, global, dubaiScope, erbilScope, canRead, canWrite}
}
const dateOnlyBaghdad = (value: unknown) => {
  if (value == null || value === '') return ''
  const raw = String(value)
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(raw)) return raw
  const date = new Date(raw)
  if (!Number.isFinite(date.getTime())) return raw.slice(0,10)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find(item => item.type === type)?.value || ''
  return part('year') + '-' + part('month') + '-' + part('day')
}
function lineView(row: Record<string, any>) {
  return {
    id: row.id, tracking_id: row.tracking_id, customer_name: row.customer_name || '',
    gc_code: row.customer_gc_code || '', gc_linked: Boolean(row.directory_customer_id),
    shipment_date: dateOnlyBaghdad(row.dispatched_at || row.created_at || ''),
    cargo_type: row.cargo_type || row.cargo_description || '',
    box_count: Number(row.box_count ?? row.carton_count ?? 0),
    quantity_pc: Number(row.pc_count ?? row.items_count ?? 0),
    weight_kg: Number(row.weight_kg ?? row.actual_weight_kg ?? 0),
    sell_price: Number(row.total_amount ?? 0), currency: row.currency || 'USD',
    status: row.operational_status || row.status || 'pending', notes: row.notes || '',
  }
}
async function fetchManifest(admin: any, id: string) {
  const {data: manifest, error} = await admin.from('shipment_manifests').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!manifest || manifest.metadata?.manifest_kind !== 'dubai_land_to_erbil') throw new HttpError('Manifest not found', 404)
  const {data: rows, error: rowsError} = await admin.from('shipments')
    .select('id,tracking_id,customer_name,customer_gc_code,directory_customer_id,dispatched_at,created_at,cargo_type,cargo_description,box_count,carton_count,pc_count,items_count,weight_kg,actual_weight_kg,total_amount,currency,status,operational_status,notes,archived_at')
    .eq('batch_code', manifest.manifest_number).is('archived_at', null).order('created_at', {ascending: true})
  if (rowsError) throw rowsError
  return {manifest, lines: (rows || []).map((row: Record<string, any>) => lineView(row))}
}
function nextActions(status: string) {
  if (status === 'draft') return ['issued','cancelled']
  if (status === 'issued') return ['departed','cancelled']
  if (status === 'departed') return ['arrived']
  if (status === 'arrived') return ['closed']
  return []
}
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors(req)})
  if (!['GET','POST'].includes(req.method)) return json(req, {error: 'Method not allowed'}, 405)
  try {
    const ctx = await requireStaff(req)
    const url = new URL(req.url)
    if (req.method === 'GET') {
      if (!ctx.canRead) throw new HttpError('This branch cannot access the Dubai land manifest', 403)
      const kind = clean(url.searchParams.get('kind') || 'list', 40)
      if (kind === 'detail') {
        const id = clean(url.searchParams.get('id'), 80)
        if (!id) throw new HttpError('Manifest id is required')
        const result = await fetchManifest(ctx.admin, id)
        return json(req, {...result, next_actions: nextActions(result.manifest.status)})
      }
      if (kind !== 'list') throw new HttpError('Unsupported query kind')
      const {data, error} = await ctx.admin.from('shipment_manifests')
        .select('id,manifest_number,origin_hub,destination_hub,transport_mode,status,total_packages,total_weight_kg,planned_departure,actual_departure,planned_arrival,actual_arrival,notes,metadata,created_at,updated_at')
        .eq('transport_mode','land').contains('metadata', {manifest_kind:'dubai_land_to_erbil'})
        .order('created_at', {ascending:false}).limit(200)
      if (error) throw error
      const manifests = (data || []).map((manifest: Record<string, any>) => ({
        ...manifest, row_count: Number(manifest.metadata?.row_count || 0),
        total_pieces: Number(manifest.metadata?.total_pieces || 0),
        total_sell_price: Number(manifest.metadata?.total_sell_price || 0),
        linked_rows: Number(manifest.metadata?.linked_rows || 0),
        unlinked_rows: Number(manifest.metadata?.unlinked_rows || 0),
        currency: manifest.metadata?.currency || 'USD',
        next_actions: nextActions(String(manifest.status)),
      }))
      return json(req, {items: manifests, total: manifests.length})
    }

    let body: Record<string, unknown>
    try { body = await req.json() as Record<string, unknown> } catch { throw new HttpError('Invalid JSON body') }
    const action = clean(body.action, 60)
    const data = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data as Record<string, unknown> : {}
    if (!ctx.canWrite) throw new HttpError('You do not have permission to update land manifests', 403)

    if (action === 'create') {
      if (!ctx.dubaiScope) throw new HttpError('Dubai warehouse permission is required to create a manifest', 403)
      const manifestNumber = clean(data.manifest_number, 80)
      const plannedDeparture = normalizeDate(data.planned_departure, new Date().toISOString().slice(0,10))
      const currency = clean(data.currency, 8).toUpperCase() || 'USD'
      if (!['USD','IQD','AED'].includes(currency)) throw new HttpError('Currency must be USD, IQD or AED')
      if (!Array.isArray(data.rows) || data.rows.length < 1 || data.rows.length > 1000) throw new HttpError('Upload 1–1000 manifest rows')
      const rows = data.rows.map((row, index) => normalizeLine(row, plannedDeparture, currency, index + 1))
      const {data:result, error} = await ctx.admin.rpc('create_dubai_land_manifest', {
        p_manifest_number: manifestNumber, p_planned_departure: plannedDeparture,
        p_notes: clean(data.notes, 2000), p_currency: currency, p_rows: rows, p_staff_id: ctx.staff.id,
      })
      if (error) throw new HttpError(error.message || 'Manifest could not be saved', 400)
      await ctx.admin.from('staff_activity_log').insert({
        staff_id: ctx.staff.id, staff_name: ctx.staff.full_name, action: 'land_manifest.create',
        target_id: manifestNumber, details: JSON.stringify({manifest_id: result?.manifest_id, row_count: result?.row_count}),
      }).then(() => {}).catch(() => {})
      return json(req, result, 201)
    }

    if (action === 'set_status') {
      const manifestId = clean(data.manifest_id, 80)
      const newStatus = clean(data.status, 30).toLowerCase()
      if (!manifestId) throw new HttpError('Manifest id is required')
      if (!['issued','departed','arrived','closed','cancelled'].includes(newStatus)) throw new HttpError('Unsupported manifest status')
      if (newStatus === 'arrived' || newStatus === 'closed') {
        if (!ctx.erbilScope) throw new HttpError('Erbil warehouse permission is required for arrival and closure', 403)
      } else if (!ctx.dubaiScope) {
        throw new HttpError('Dubai warehouse permission is required for issue and departure', 403)
      }
      const {data:result, error} = await ctx.admin.rpc('set_dubai_land_manifest_status', {
        p_manifest_id: manifestId, p_new_status: newStatus, p_staff_id: ctx.staff.id,
        p_staff_name: clean(ctx.staff.full_name, 180),
      })
      if (error) throw new HttpError(error.message || 'Manifest status could not be updated', 400)
      await ctx.admin.from('staff_activity_log').insert({
        staff_id: ctx.staff.id, staff_name: ctx.staff.full_name, action: 'land_manifest.status',
        target_id: result?.manifest_number || manifestId,
        details: JSON.stringify({previous_status: result?.previous_status, status: newStatus}),
      }).then(() => {}).catch(() => {})
      return json(req, result)
    }

    if (action === 'update_row') {
      if (!ctx.dubaiScope) throw new HttpError('Dubai warehouse permission is required to edit rows', 403)
      const manifestId = clean(data.manifest_id, 80)
      const shipmentId = clean(data.shipment_id, 80)
      if (!manifestId || !shipmentId) throw new HttpError('Manifest and row IDs are required')
      const currency = clean(data.currency, 8).toUpperCase() || 'USD'
      const rawRow = data.row && typeof data.row === 'object' ? data.row as Record<string, unknown> : {}
      const rowDate = normalizeDate(rawRow.shipment_date, new Date().toISOString().slice(0,10))
      const row = normalizeLine(rawRow, rowDate, currency, 1)
      const {data:result,error} = await ctx.admin.rpc('update_dubai_land_manifest_row', {
        p_manifest_id: manifestId, p_shipment_id: shipmentId, p_row: row, p_staff_id: ctx.staff.id,
      })
      if (error) throw new HttpError(error.message || 'Manifest row could not be updated', 400)
      return json(req, result)
    }

    if (action === 'archive_row') {
      if (!ctx.dubaiScope) throw new HttpError('Dubai warehouse permission is required to remove rows', 403)
      const manifestId = clean(data.manifest_id, 80)
      const shipmentId = clean(data.shipment_id, 80)
      if (!manifestId || !shipmentId) throw new HttpError('Manifest and row IDs are required')
      const {data:result,error} = await ctx.admin.rpc('archive_dubai_land_manifest_row', {
        p_manifest_id: manifestId, p_shipment_id: shipmentId, p_staff_id: ctx.staff.id,
      })
      if (error) throw new HttpError(error.message || 'Manifest row could not be removed', 400)
      return json(req, result)
    }
    throw new HttpError('Unsupported action')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = error instanceof HttpError ? error.status : /Unauthorized/i.test(message) ? 401 : 500
    return json(req, {error: message}, status)
  }
})
