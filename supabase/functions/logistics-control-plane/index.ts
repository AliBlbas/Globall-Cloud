import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>

type Staff = {
  id: string
  full_name: string | null
  role: string
  branch: string | null
  is_active: boolean
}

const ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
])

const cors = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://globall-cloud.pages.dev',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-idempotency-key, x-supabase-auth-token, traceparent, tracestate, baggage',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}

const json = (req: Request, body: Json, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors(req) })

const text = (value: unknown, max = 500) => {
  if (value === null || value === undefined) return null
  const output = String(value).trim()
  return output ? output.slice(0, max) : null
}

const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error('Invalid numeric value')
  return number
}

const resolveServiceKey = () => {
  const direct = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (direct) return direct
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return parsed
    if (parsed?.default) return String(parsed.default)
    const first = Object.values(parsed ?? {})[0]
    return first ? String(first) : null
  } catch {
    return null
  }
}

const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const secret = resolveServiceKey()
  if (!url || !secret) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

const authenticateStaff = async (req: Request) => {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const authorization = req.headers.get('authorization') || ''
  if (!url || !anon || !authorization.toLowerCase().startsWith('bearer ')) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors(req) })
  }
  const userClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } },
  })
  const user = await userClient.auth.getUser()
  if (user.error || !user.data.user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors(req) })
  }
  const service = serviceClient()
  const staff = await service
    .from('staff')
    .select('id,full_name,role,branch,is_active')
    .eq('id', user.data.user.id)
    .maybeSingle()
  if (staff.error) throw staff.error
  if (!staff.data?.is_active) {
    throw new Response(JSON.stringify({ error: 'Active staff account required' }), { status: 403, headers: cors(req) })
  }
  return { service, staff: staff.data as Staff }
}

const requireRole = (staff: Staff, roles: string[]) => {
  if (!roles.includes(staff.role)) throw new Error(`Role required: ${roles.join(', ')}`)
}

const audit = async (service: ReturnType<typeof serviceClient>, staff: Staff, action: string, targetId: string, details: Json = {}) => {
  const result = await service.from('staff_activity_log').insert({
    staff_id: staff.id,
    staff_name: staff.full_name,
    action,
    target_id: targetId,
    details,
  })
  if (result.error) console.error('audit write failed', result.error.message)
}

const transition = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json, req: Request) => {
  const shipmentId = text(data.shipment_id, 128)
  const status = text(data.to_status, 64)
  const step = Number(data.to_step)
  if (!shipmentId || !status || !Number.isInteger(step)) throw new Error('shipment_id, to_status and integer to_step are required')
  const result = await service.rpc('record_shipment_transition', {
    p_actor_id: staff.id,
    p_shipment_id: shipmentId,
    p_to_status: status,
    p_to_step: step,
    p_location_code: text(data.location_code, 120),
    p_note: text(data.note, 1000),
    p_metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {},
    p_idempotency_key: text(data.idempotency_key || req.headers.get('x-idempotency-key'), 180),
  })
  if (result.error) throw result.error
  await audit(service, staff, 'control_plane_transition', shipmentId, { status, step })
  return result.data
}

const packageUpsert = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  const shipmentId = text(data.shipment_id, 128)
  const packageCode = text(data.package_code, 120)
  if (!shipmentId || !packageCode) throw new Error('shipment_id and package_code are required')
  const result = await service.rpc('upsert_shipment_package', {
    p_actor_id: staff.id,
    p_shipment_id: shipmentId,
    p_package_code: packageCode,
    p_weight_kg: numberOrNull(data.weight_kg),
    p_length_cm: numberOrNull(data.length_cm),
    p_width_cm: numberOrNull(data.width_cm),
    p_height_cm: numberOrNull(data.height_cm),
    p_hub_code: text(data.hub_code, 80),
    p_status: text(data.status, 40) || 'created',
    p_metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {},
  })
  if (result.error) throw result.error
  return result.data
}

const customsUpsert = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  const shipmentId = text(data.shipment_id, 128)
  if (!shipmentId) throw new Error('shipment_id is required')
  const result = await service.rpc('upsert_shipment_customs_case', {
    p_actor_id: staff.id,
    p_shipment_id: shipmentId,
    p_status: text(data.status, 40) || 'draft',
    p_declaration_number: text(data.declaration_number, 120),
    p_hs_codes: Array.isArray(data.hs_codes) ? data.hs_codes : [],
    p_declared_value: numberOrNull(data.declared_value),
    p_duty_amount: numberOrNull(data.duty_amount),
    p_broker_name: text(data.broker_name, 160),
    p_documents_complete: data.documents_complete === true,
    p_hold_reason: text(data.hold_reason, 800),
  })
  if (result.error) throw result.error
  return result.data
}

const consolidationUpsert = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  const batchCode = text(data.batch_code, 120)
  const originHub = text(data.origin_hub, 80)
  if (!batchCode || !originHub) throw new Error('batch_code and origin_hub are required')
  const result = await service.rpc('upsert_consolidation_batch', {
    p_actor_id: staff.id,
    p_batch_code: batchCode,
    p_origin_hub: originHub,
    p_transit_hub: text(data.transit_hub, 80),
    p_destination_hub: text(data.destination_hub, 80) || 'erbil',
    p_transport_mode: text(data.transport_mode, 20) || 'air',
    p_status: text(data.status, 30) || 'draft',
    p_seal_number: text(data.seal_number, 100),
    p_expected_departure: text(data.expected_departure, 80),
    p_notes: text(data.notes, 1000),
  })
  if (result.error) throw result.error
  return result.data
}

const packageAttach = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  const batchId = text(data.batch_id, 80)
  const packageId = text(data.package_id, 80)
  if (!batchId || !packageId) throw new Error('batch_id and package_id are required')
  const result = await service.rpc('attach_package_to_consolidation', {
    p_actor_id: staff.id,
    p_batch_id: batchId,
    p_package_id: packageId,
  })
  if (result.error) throw result.error
  return result.data
}

const invoiceUpsert = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff, ['admin', 'super_admin', 'accountant'])
  const invoiceNumber = text(data.invoice_number, 120)
  const shipmentId = text(data.shipment_id, 128)
  if (!invoiceNumber || !shipmentId) throw new Error('invoice_number and shipment_id are required')
  const result = await service.rpc('upsert_shipment_invoice', {
    p_actor_id: staff.id,
    p_invoice_number: invoiceNumber,
    p_shipment_id: shipmentId,
    p_line_items: Array.isArray(data.line_items) ? data.line_items : [],
    p_subtotal: numberOrNull(data.subtotal) ?? 0,
    p_discount: numberOrNull(data.discount) ?? 0,
    p_tax: numberOrNull(data.tax) ?? 0,
    p_currency: text(data.currency, 8) || 'USD',
    p_status: text(data.status, 30) || 'draft',
    p_due_at: text(data.due_at, 80),
  })
  if (result.error) throw result.error
  return result.data
}

const paymentRecord = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff, ['admin', 'super_admin', 'accountant'])
  const invoiceId = text(data.invoice_id, 80)
  const amount = numberOrNull(data.amount)
  if (!invoiceId || amount === null) throw new Error('invoice_id and amount are required')
  const result = await service.rpc('record_payment_transaction', {
    p_actor_id: staff.id,
    p_invoice_id: invoiceId,
    p_amount: amount,
    p_transaction_type: text(data.transaction_type, 30) || 'payment',
    p_status: text(data.status, 30) || 'succeeded',
    p_provider: text(data.provider, 50) || 'manual',
    p_provider_reference: text(data.provider_reference, 160),
    p_method: text(data.method, 50),
    p_idempotency_key: text(data.idempotency_key, 180),
    p_metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {},
  })
  if (result.error) throw result.error
  return result.data
}

const exceptionResolve = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff, ['admin', 'super_admin', 'accountant'])
  const exceptionId = text(data.exception_id, 80)
  if (!exceptionId) throw new Error('exception_id is required')
  const result = await service.rpc('resolve_logistics_exception', {
    p_actor_id: staff.id,
    p_exception_id: exceptionId,
    p_status: text(data.status, 32) || 'resolved',
    p_resolution_note: text(data.resolution_note, 1000),
  })
  if (result.error) throw result.error
  return result.data
}

const quoteApprove = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff, ['admin', 'super_admin', 'staff'])
  const quoteId = text(data.quote_id, 80)
  const amount = numberOrNull(data.quoted_amount)
  if (!quoteId || amount === null) throw new Error('quote_id and quoted_amount are required')
  const result = await service.rpc('approve_quote_request', {
    p_actor_id: staff.id,
    p_quote_id: quoteId,
    p_quoted_amount: amount,
    p_currency: text(data.currency, 8) || 'USD',
    p_valid_until: text(data.valid_until, 80),
    p_notes: text(data.notes, 1000),
  })
  if (result.error) throw result.error
  await audit(service, staff, 'approve_quote_request', quoteId, { amount, currency: data.currency || 'USD' })
  return result.data
}

const warehouseMovement = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json, req: Request) => {
  requireRole(staff, ['admin', 'super_admin', 'staff'])
  const toHub = text(data.to_hub, 80)
  if (!toHub) throw new Error('to_hub is required')
  const result = await service.rpc('record_warehouse_movement', {
    p_actor_id: staff.id,
    p_shipment_id: text(data.shipment_id, 128),
    p_package_id: text(data.package_id, 80),
    p_receipt_id: numberOrNull(data.receipt_id),
    p_from_hub: text(data.from_hub, 80),
    p_to_hub: toHub,
    p_movement_type: text(data.movement_type, 24) || 'transfer',
    p_scan_code: text(data.scan_code, 160),
    p_notes: text(data.notes, 1000),
    p_metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {},
    p_idempotency_key: text(data.idempotency_key || req.headers.get('x-idempotency-key'), 180),
  })
  if (result.error) throw result.error
  await audit(service, staff, 'record_warehouse_movement', String(data.shipment_id || data.package_id), { to_hub: toHub, movement_type: data.movement_type || 'transfer' })
  return result.data
}

const routeLegUpsert = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff, ['admin', 'super_admin', 'staff'])
  const shipmentId = text(data.shipment_id, 128)
  const legNumber = numberOrNull(data.leg_number)
  const fromHub = text(data.from_hub, 80)
  const toHub = text(data.to_hub, 80)
  if (!shipmentId || legNumber === null || !fromHub || !toHub) throw new Error('shipment_id, leg_number, from_hub and to_hub are required')
  const result = await service.rpc('upsert_shipment_route_leg', {
    p_actor_id: staff.id,
    p_shipment_id: shipmentId,
    p_leg_number: legNumber,
    p_from_hub: fromHub,
    p_to_hub: toHub,
    p_transport_mode: text(data.transport_mode, 20) || 'air',
    p_carrier_name: text(data.carrier_name, 160),
    p_tracking_number: text(data.tracking_number, 160),
    p_status: text(data.status, 30) || 'planned',
    p_planned_departure: text(data.planned_departure, 80),
    p_planned_arrival: text(data.planned_arrival, 80),
    p_actual_departure: text(data.actual_departure, 80),
    p_actual_arrival: text(data.actual_arrival, 80),
    p_notes: text(data.notes, 1000),
    p_metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {},
  })
  if (result.error) throw result.error
  return result.data
}

const documentRegister = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff, ['admin', 'super_admin', 'staff'])
  const shipmentId = text(data.shipment_id, 128)
  const documentType = text(data.document_type, 40)
  const title = text(data.title, 200)
  const fileUrl = text(data.file_url, 2000)
  if (!shipmentId || !documentType || !title || !fileUrl) throw new Error('shipment_id, document_type, title and file_url are required')
  const result = await service.rpc('register_shipment_document', {
    p_actor_id: staff.id,
    p_shipment_id: shipmentId,
    p_document_type: documentType,
    p_title: title,
    p_file_url: fileUrl,
    p_file_path: text(data.file_path, 500),
    p_mime_type: text(data.mime_type, 120),
    p_file_size_bytes: numberOrNull(data.file_size_bytes),
    p_sha256: text(data.sha256, 128),
    p_is_public: data.is_public === true,
  })
  if (result.error) throw result.error
  return result.data
}

const toHex = (bytes: Uint8Array) => Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
const safeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'document.bin'

const documentUpload = async (service: ReturnType<typeof serviceClient>, staff: Staff, req: Request) => {
  requireRole(staff, ['admin', 'super_admin', 'staff'])
  const form = await req.formData()
  const file = form.get('file')
  const shipmentId = text(form.get('shipment_id'), 128)
  const documentType = text(form.get('document_type'), 40)
  const title = text(form.get('title'), 200)
  if (!(file instanceof File) || !shipmentId || !documentType || !title) throw new Error('file, shipment_id, document_type and title are required')
  if (file.size <= 0 || file.size > 25 * 1024 * 1024) throw new Error('Document size must be between 1 byte and 25 MB')
  const bytes = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const sha256 = toHex(new Uint8Array(digest))
  const path = `shipments/${shipmentId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
  const upload = await service.storage.from('shipment-documents').upload(path, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (upload.error) throw upload.error
  const signed = await service.storage.from('shipment-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
  if (signed.error || !signed.data?.signedUrl) {
    await service.storage.from('shipment-documents').remove([path])
    throw signed.error || new Error('Could not create document access URL')
  }
  const result = await service.rpc('register_shipment_document', {
    p_actor_id: staff.id,
    p_shipment_id: shipmentId,
    p_document_type: documentType,
    p_title: title,
    p_file_url: signed.data.signedUrl,
    p_file_path: path,
    p_mime_type: file.type || 'application/octet-stream',
    p_file_size_bytes: file.size,
    p_sha256: sha256,
    p_is_public: form.get('is_public') === 'true',
  })
  if (result.error) {
    await service.storage.from('shipment-documents').remove([path])
    throw result.error
  }
  await audit(service, staff, 'upload_shipment_document', shipmentId, { document_id: result.data?.id, file_size_bytes: file.size, sha256 })
  return { document: result.data, file_path: path, signed_url: signed.data.signedUrl, sha256 }
}

const report = async (service: ReturnType<typeof serviceClient>, staff: Staff, requestUrl: URL) => {
  requireRole(staff, ['admin', 'super_admin', 'accountant', 'staff'])
  const today = new Date()
  const toDate = text(requestUrl.searchParams.get('to'), 20) || today.toISOString().slice(0, 10)
  const from = new Date(today)
  from.setUTCDate(from.getUTCDate() - 30)
  const fromDate = text(requestUrl.searchParams.get('from'), 20) || from.toISOString().slice(0, 10)
  const result = await service.rpc('get_logistics_report', {
    p_actor_id: staff.id,
    p_from_date: fromDate,
    p_to_date: toDate,
  })
  if (result.error) throw result.error
  return result.data
}

const listOperationalAlerts = async (service: ReturnType<typeof serviceClient>, staff: Staff) => {
  const [shipments, exceptions] = await Promise.all([
    service.from('shipments').select('id,branch,archived_at,operational_status,current_step_index,eta,current_location_label,tracking_updated_at,priority,updated_at').order('updated_at', { ascending: false }).limit(200),
    service.from('logistics_exceptions').select('id,shipment_id,severity,title,note,status,created_at,updated_at,due_at').in('status', ['open','acknowledged']).order('created_at', { ascending: false }).limit(200),
  ])
  if (shipments.error) throw shipments.error
  if (exceptions.error) throw exceptions.error
  const visible = (branch: unknown) => staff.branch === 'all' || branch == null || String(branch) === String(staff.branch)
  const now = Date.now()
  const alerts: Array<Record<string, unknown>> = []
  for (const row of (shipments.data || []) as Array<Record<string, unknown>>) {
    if (!visible(row.branch) || row.archived_at) continue
    const id = String(row.id || '')
    const status = String(row.operational_status || '').toLowerCase()
    const step = Number(row.current_step_index || 0)
    if (!id || step >= 5 || ['delivered','cancelled','closed'].includes(status)) continue
    const eta = row.eta ? new Date(String(row.eta)).getTime() : NaN
    if (Number.isFinite(eta) && eta < now - 2 * 60 * 60 * 1000) {
      const critical = eta < now - 24 * 60 * 60 * 1000
      alerts.push({ id: `eta:${id}:${row.eta}`, source: 'eta_monitor', type: 'eta_breach', severity: critical ? 'critical' : 'high', status: 'open', title: critical ? 'Critical ETA breach' : 'Shipment ETA breach', note: `Shipment ${id} is overdue beyond its ETA.`, shipment_id: id, location: row.current_location_label, occurred_at: row.eta, action_url: `/staff-os?tab=shipments&shipment_id=${encodeURIComponent(id)}` })
    }
    const tracking = row.tracking_updated_at ? new Date(String(row.tracking_updated_at)).getTime() : NaN
    if (Number.isFinite(tracking) && tracking < now - 24 * 60 * 60 * 1000) {
      alerts.push({ id: `tracking:${id}:${new Date(tracking).toISOString().slice(0,10)}`, source: 'tracking_heartbeat', type: 'stale_tracking', severity: 'medium', status: 'open', title: 'Tracking heartbeat is stale', note: `Shipment ${id} has had no tracking update for more than 24 hours.`, shipment_id: id, location: row.current_location_label, occurred_at: row.tracking_updated_at, action_url: `/staff-os?tab=shipments&shipment_id=${encodeURIComponent(id)}` })
    }
    const priority = String(row.priority || '').toLowerCase()
    if (['critical','high'].includes(priority)) {
      alerts.push({ id: `priority:${id}:${priority}`, source: 'shipment_priority', type: 'priority_attention', severity: priority, status: 'open', title: priority === 'critical' ? 'Critical-priority shipment' : 'High-priority shipment', note: `Shipment ${id} is marked ${priority} priority and remains active.`, shipment_id: id, location: row.current_location_label, occurred_at: row.updated_at, action_url: `/staff-os?tab=shipments&shipment_id=${encodeURIComponent(id)}` })
    }
  }
  const shipmentBranch = new Map(((shipments.data || []) as Array<Record<string, unknown>>).map(row => [String(row.id), row.branch]))
  for (const row of (exceptions.data || []) as Array<Record<string, unknown>>) {
    const branch = row.shipment_id ? shipmentBranch.get(String(row.shipment_id)) : null
    if (!visible(branch) && !(branch == null && ['admin','super_admin','accountant','operations'].includes(staff.role))) continue
    alerts.push({ id: `exception:${row.id}:${row.status}`, source: 'logistics_exceptions', type: 'exception', severity: row.severity || 'medium', status: row.status || 'open', title: row.title || 'Logistics exception', note: row.note || '', shipment_id: row.shipment_id, occurred_at: row.updated_at || row.created_at, due_at: row.due_at, action_url: row.shipment_id ? `/staff-os?tab=shipments&shipment_id=${encodeURIComponent(String(row.shipment_id))}` : '/staff-os?tab=alerts' })
  }
  alerts.sort((a, b) => new Date(String(b.occurred_at || 0)).getTime() - new Date(String(a.occurred_at || 0)).getTime())
  return { kind: 'alerts', items: alerts.slice(0, 200), generated_at: new Date().toISOString() }
}

const list = async (service: ReturnType<typeof serviceClient>, staff: Staff, requestUrl: URL) => {
  const kind = requestUrl.searchParams.get('kind') || 'shipments'
  if (kind === 'alerts') return listOperationalAlerts(service, staff)
  if (kind === 'events') {
    const shipmentId = text(requestUrl.searchParams.get('shipment_id'), 128)
    if (!shipmentId) throw new Error('shipment_id is required')
    const shipment = await service.from('shipments').select('id,branch,archived_at').eq('id', shipmentId).maybeSingle()
    if (shipment.error) throw shipment.error
    if (!shipment.data || shipment.data.archived_at || (staff.branch !== 'all' && shipment.data.branch && String(shipment.data.branch) !== String(staff.branch))) return { kind, items: [], offset: 0, limit: 0 }
    const limit = Math.min(200, Math.max(1, Number(requestUrl.searchParams.get('limit') || 100)))
    const offset = Math.max(0, Number(requestUrl.searchParams.get('offset') || 0))
    const result = await service.from('shipment_events').select('id,shipment_id,event_type,status,location,note,occurred_at,created_by,created_by_name,metadata').eq('shipment_id', shipmentId).order('occurred_at', { ascending: false }).range(offset, offset + limit - 1)
    if (result.error) throw result.error
    return { kind, items: result.data || [], offset, limit }
  }
  const limit = Math.min(200, Math.max(1, Number(requestUrl.searchParams.get('limit') || 50)))
  const offset = Math.max(0, Number(requestUrl.searchParams.get('offset') || 0))
  const allowed = new Set(['shipments', 'events', 'packages', 'customs', 'consolidations', 'invoices', 'payments', 'exceptions', 'outbox', 'status_history', 'quotes', 'documents', 'movements', 'route_legs', 'manifests', 'alerts'])
  if (!allowed.has(kind)) throw new Error('Unsupported list kind')
  const scopedKinds = new Set(['packages', 'customs', 'invoices', 'payments', 'exceptions', 'status_history', 'documents', 'movements', 'route_legs', 'manifests'])
  const shipmentId = text(requestUrl.searchParams.get('shipment_id'), 128)
  if (shipmentId && scopedKinds.has(kind)) {
    const shipment = await service.from('shipments').select('id,branch,archived_at').eq('id', shipmentId).maybeSingle()
    if (shipment.error) throw shipment.error
    if (!shipment.data || shipment.data.archived_at || (staff.branch !== 'all' && shipment.data.branch && String(shipment.data.branch) !== String(staff.branch))) return { kind, items: [], offset: 0, limit: 0 }
  }
  const from = offset
  const to = offset + limit - 1
  let query: any
  if (kind === 'shipments') {
    query = service.from('shipments').select('id,customer_name,origin_key,dest_key,type,weight_kg,volume_cbm,total_amount,paid_amount,current_step_index,operational_status,priority,eta,current_location_label,tracking_updated_at,service_level,incoterm,origin_hub,transit_hub,destination_hub,state_version,updated_at').order('created_at', { ascending: false })
  } else if (kind === 'packages') {
    query = service.from('shipment_packages').select('*').order('created_at', { ascending: false })
  } else if (kind === 'customs') {
    query = service.from('shipment_customs_cases').select('*').order('updated_at', { ascending: false })
  } else if (kind === 'consolidations') {
    query = service.from('consolidation_batches').select('*').order('created_at', { ascending: false })
  } else if (kind === 'invoices') {
    requireRole(staff, ['admin', 'super_admin', 'accountant'])
    query = service.from('shipment_invoices').select('*').order('created_at', { ascending: false })
  } else if (kind === 'payments') {
    requireRole(staff, ['admin', 'super_admin', 'accountant'])
    query = service.from('payment_transactions').select('*').order('created_at', { ascending: false })
  } else if (kind === 'exceptions') {
    query = service.from('logistics_exceptions').select('*').order('created_at', { ascending: false })
  } else if (kind === 'quotes') {
    query = service.from('quote_requests').select('id,customer_user_id,customer_name,customer_phone,origin_key,dest_key,transport_mode,weight_kg,volume_cbm,dimensional_weight_kg,billable_weight_kg,status,quoted_amount,currency,valid_until,quoted_by,quoted_at,accepted_at,decision_note,created_at,updated_at').order('created_at', { ascending: false })
  } else if (kind === 'documents') {
    query = service.from('shipment_documents').select('id,shipment_id,customer_user_id,document_type,title,file_url,file_path,mime_type,file_size_bytes,sha256,is_public,document_status,version,verified_at,verified_by,created_by,created_at').order('created_at', { ascending: false })
  } else if (kind === 'movements') {
    query = service.from('warehouse_movements').select('id,shipment_id,package_id,receipt_id,from_hub,to_hub,movement_type,scanned_by,scanned_at,scan_code,idempotency_key,notes,metadata').order('scanned_at', { ascending: false })
  } else if (kind === 'route_legs') {
    query = service.from('shipment_route_legs').select('*').order('planned_departure', { ascending: true, nullsFirst: false })
  } else if (kind === 'manifests') {
    query = service.from('shipment_manifests').select('*').order('created_at', { ascending: false })
  } else if (kind === 'outbox') {
    requireRole(staff, ['admin', 'super_admin'])
    query = service.from('notification_outbox').select('*').order('created_at', { ascending: false })
  } else {
    query = service.from('shipment_status_history').select('*').order('occurred_at', { ascending: false })
  }
  if (shipmentId && scopedKinds.has(kind)) query = query.eq('shipment_id', shipmentId)
  const result = await query.range(from, to)
  if (result.error) throw result.error
  return { kind, items: result.data || [], offset, limit }
}

const processOutbox = async (service: ReturnType<typeof serviceClient>, staff: Staff, limit: number) => {
  requireRole(staff, ['admin', 'super_admin'])
  const claimed = await service.rpc('claim_notification_outbox_channel', { p_channel: 'in_app', p_limit: Math.min(100, Math.max(1, limit)) })
  if (claimed.error) throw claimed.error
  const items = (claimed.data || []) as Array<Record<string, unknown>>
  const results: Array<Record<string, unknown>> = []
  for (const item of items) {
    const channel = String(item.channel || '')
    if (channel === 'in_app') {
      const payload = (item.payload && typeof item.payload === 'object' ? item.payload : {}) as Json
      const notification = await service.from('customer_notifications').insert({
        customer_user_id: item.customer_user_id,
        shipment_id: item.shipment_id,
        kind: item.event_key,
        title: String(payload.title || 'Shipment update'),
        body: String(payload.body || payload.note || 'Your shipment has a new update.'),
        action_url: String(payload.action_url || `/?track=${encodeURIComponent(String(item.shipment_id || ''))}`),
      })
      if (notification.error) {
        await service.rpc('complete_notification_outbox', { p_id: item.id, p_success: false, p_error: notification.error.message })
        results.push({ id: item.id, status: 'failed', error: notification.error.message })
      } else {
        await service.rpc('complete_notification_outbox', { p_id: item.id, p_success: true, p_error: null })
        results.push({ id: item.id, status: 'sent', channel })
      }
    } else {
      const message = `Provider is not configured for ${channel}; item remains retryable.`
      await service.rpc('complete_notification_outbox', { p_id: item.id, p_success: false, p_error: message })
      results.push({ id: item.id, status: 'retryable', channel, error: message })
    }
  }
  await audit(service, staff, 'process_notification_outbox', 'notification_outbox', { claimed: items.length })
  return { claimed: items.length, results }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  try {
    const { service, staff } = await authenticateStaff(req)
    if (req.method === 'GET') return json(req, await list(service, staff, new URL(req.url)))
    if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
    if ((req.headers.get('content-type') || '').toLowerCase().includes('multipart/form-data')) {
      return json(req, { item: await documentUpload(service, staff, req) })
    }
    const body = await req.json().catch(() => ({})) as Json
    const action = text(body.action, 64)
    const data = (body.data && typeof body.data === 'object' ? body.data : body) as Json
    if (action === 'transition_shipment') return json(req, { item: await transition(service, staff, data, req) })
    if (action === 'upsert_package') return json(req, { item: await packageUpsert(service, staff, data) })
    if (action === 'upsert_customs') return json(req, { item: await customsUpsert(service, staff, data) })
    if (action === 'upsert_consolidation') return json(req, { item: await consolidationUpsert(service, staff, data) })
    if (action === 'attach_package') return json(req, { item: await packageAttach(service, staff, data) })
    if (action === 'upsert_invoice') return json(req, { item: await invoiceUpsert(service, staff, data) })
    if (action === 'record_payment') return json(req, { item: await paymentRecord(service, staff, data) })
    if (action === 'resolve_exception') return json(req, { item: await exceptionResolve(service, staff, data) })
    if (action === 'approve_quote') return json(req, { item: await quoteApprove(service, staff, data) })
    if (action === 'record_warehouse_movement') return json(req, { item: await warehouseMovement(service, staff, data, req) })
    if (action === 'upsert_route_leg') return json(req, { item: await routeLegUpsert(service, staff, data) })
    if (action === 'register_document' || action === 'upload_document') return json(req, { item: await documentRegister(service, staff, data) })
    if (action === 'get_report') return json(req, { item: await report(service, staff, new URL(req.url)) })
    if (action === 'process_outbox') return json(req, { item: await processOutbox(service, staff, Number(data.limit || 20)) })
    return json(req, { error: 'Unsupported action' }, 400)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('logistics-control-plane error', error)
    return json(req, { error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})
