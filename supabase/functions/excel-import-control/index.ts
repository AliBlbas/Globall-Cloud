import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>
const ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const REVIEW_ROLES = new Set(['super_admin', 'admin', 'accountant', 'finance', 'operations', 'warehouse', 'warehouse_china', 'warehouse_uae', 'warehouse_erbil'])
const cors = (req: Request) => ({
  'Access-Control-Allow-Origin': ORIGINS.has(req.headers.get('origin') || '') ? req.headers.get('origin')! : 'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Cache-Control': 'no-store', Vary: 'Origin',
})
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req) } })
const text = (value: unknown) => { const s = String(value ?? '').trim(); return s || null }
const allowedStatus = new Set(['unreviewed', 'accepted', 'needs_mapping', 'rejected'])

async function actor(req: Request) {
  const url = Deno.env.get('SUPABASE_URL') || ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || ''
  const authorization = req.headers.get('Authorization') || ''
  if (!url || !anon || !service || !/^Bearer\s+/i.test(authorization)) throw new Error('Unauthorized')
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } })
  const { data, error } = await auth.auth.getUser()
  if (error || !data.user) throw new Error('Unauthorized')
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: staff, error: staffError } = await admin.from('staff').select('id,full_name,role,branch,is_active').eq('id', data.user.id).maybeSingle()
  if (staffError) throw staffError
  if (!staff?.is_active || !REVIEW_ROLES.has(String(staff.role || ''))) throw new Error('Forbidden')
  return { admin, staff }
}

async function audit(admin: any, staff: any, action: string, targetId: string | null, details: Json = {}) {
  await admin.from('staff_activity_log').insert({ staff_id: staff.id, staff_name: staff.full_name, action, target_id: targetId, details: JSON.stringify(details) })
}

async function listBatches(a: any) {
  const { data: batches, error } = await a.admin.from('excel_import_batches').select('id,source_filename,source_sha256,source_size_bytes,import_status,source_row_count,warning_count,created_by,approved_by,approved_at,notes,created_at,updated_at').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  const ids = (batches || []).map((x: any) => x.id)
  if (!ids.length) return { batches: [] }
  const { data: rows, error: rowError } = await a.admin.from('excel_import_rows').select('batch_id,review_status,warnings').in('batch_id', ids).limit(50000)
  if (rowError) throw rowError
  const grouped = new Map<string, any>()
  for (const row of rows || []) {
    const g = grouped.get(row.batch_id) || { rows: 0, unreviewed: 0, accepted: 0, needs_mapping: 0, rejected: 0, warnings: 0 }
    g.rows++
    const status = String(row.review_status || 'unreviewed')
    if (status in g) g[status]++
    if (Array.isArray(row.warnings) && row.warnings.length) g.warnings++
    grouped.set(row.batch_id, g)
  }
  return { batches: (batches || []).map((batch: any) => ({ ...batch, review: grouped.get(batch.id) || { rows: 0, unreviewed: 0, accepted: 0, needs_mapping: 0, rejected: 0, warnings: 0 } })) }
}

async function listRows(a: any, batchId: string) {
  if (!batchId) throw new Error('Batch id is required')
  const { data, error } = await a.admin.from('excel_import_rows').select('id,batch_id,source_sheet,source_row,source_category,raw_values,normalized_candidates,warnings,review_status,mapped_entity,mapped_record_id,reviewed_by,reviewed_at,created_at').eq('batch_id', batchId).order('source_sheet').order('source_row').limit(5000)
  if (error) throw error
  return { rows: data || [] }
}

async function uploadBatch(a: any, data: Json) {
  const filename = text(data.source_filename)
  const sha256 = text(data.source_sha256)
  const rows = Array.isArray(data.rows) ? data.rows : []
  if (!filename || !sha256 || !rows.length || rows.length > 10000) throw new Error('Invalid Excel batch')
  const { data: batch, error } = await a.admin.from('excel_import_batches').insert({ source_filename: filename, source_sha256: sha256, source_size_bytes: Number(data.source_size_bytes) || null, import_status: 'reviewing', source_row_count: rows.length, warning_count: rows.reduce((n: number, row: any) => n + (Array.isArray(row.warnings) ? row.warnings.length : 0), 0), created_by: a.staff.id }).select('*').single()
  if (error) throw error
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400).map((row: any) => ({ batch_id: batch.id, source_sheet: text(row.source_sheet) || 'unknown', source_row: Number(row.source_row) || 0, source_category: text(row.category || row.source_category) || 'unclassified', raw_values: row.raw_values || [], normalized_candidates: row.normalized_candidates || {}, warnings: row.warnings || [], review_status: 'unreviewed' }))
    const result = await a.admin.from('excel_import_rows').insert(chunk)
    if (result.error) throw result.error
  }
  await audit(a.admin, a.staff, 'excel_import.batch_uploaded', batch.id, { filename, rows: rows.length, warnings: batch.warning_count })
  return { batch }
}

async function reviewRow(a: any, data: Json) {
  const id = text(data.id)
  const status = text(data.review_status)
  if (!id || !status || !allowedStatus.has(status)) throw new Error('Invalid review status')
  const { data: row, error } = await a.admin.from('excel_import_rows').update({ review_status: status, mapped_entity: text(data.mapped_entity), reviewed_by: a.staff.id, reviewed_at: new Date().toISOString() }).eq('id', id).select('id,batch_id,review_status').single()
  if (error) throw error
  await audit(a.admin, a.staff, `excel_import.row_${status}`, id, { batch_id: row.batch_id })
  return { row }
}

async function changeBatch(a: any, data: Json, status: 'approved' | 'rejected') {
  const id = text(data.batch_id)
  if (!id) throw new Error('Batch id is required')
  if (status === 'approved') {
    const { data: pending, error } = await a.admin.from('excel_import_rows').select('id,review_status').eq('batch_id', id).in('review_status', ['unreviewed', 'needs_mapping']).limit(10)
    if (error) throw error
    if ((pending || []).length) throw new Error('All rows must be accepted or rejected before approval')
  }
  const patch: any = { import_status: status, updated_at: new Date().toISOString() }
  if (status === 'approved') { patch.approved_by = a.staff.id; patch.approved_at = new Date().toISOString() }
  const { data: batch, error } = await a.admin.from('excel_import_batches').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  await audit(a.admin, a.staff, `excel_import.batch_${status}`, id, {})
  return { batch }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  try {
    const a = await actor(req)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const kind = text(url.searchParams.get('kind')) || 'batches'
      if (kind === 'batches') return json(req, await listBatches(a))
      if (kind === 'rows') return json(req, await listRows(a, text(url.searchParams.get('batch_id')) || ''))
      throw new Error('Unsupported query')
    }
    const body = await req.json().catch(() => ({})) as Json
    const action = text(body.action)
    const data = (body.data || {}) as Json
    if (action === 'upload_batch') return json(req, await uploadBatch(a, data))
    if (action === 'review_row') return json(req, await reviewRow(a, data))
    if (action === 'approve_batch') return json(req, await changeBatch(a, data, 'approved'))
    if (action === 'reject_batch') return json(req, await changeBatch(a, data, 'rejected'))
    throw new Error('Unsupported action')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = /Unauthorized/i.test(message) ? 401 : /Forbidden/i.test(message) ? 403 : /Invalid|required|Unsupported|must be/i.test(message) ? 400 : 500
    return json(req, { error: message }, status)
  }
})
