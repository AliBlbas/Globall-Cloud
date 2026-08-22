import { createClient } from 'npm:@supabase/supabase-js@2'

type Kind = 'customer' | 'customer_match' | 'staff' | 'receipt' | 'log' | 'shipment' | 'task' | 'finance'
type Action = 'list' | 'create' | 'update' | 'archive' | 'delete' | 'claim' | 'complete'
type JsonRecord = Record<string, unknown>

const ALLOWED_ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
])

function corsHeaders(req?: Request) {
  const origin = req?.headers.get('origin') || ''
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://globall-cloud.pages.dev'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Vary': 'Origin',
  }
}

function json(data: unknown, init: ResponseInit = {}, req?: Request) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(req),
      ...(init.headers ?? {}),
    },
  })
}

function responseError(message: string, status: number, req?: Request) {
  return json({ error: message }, { status }, req)
}

function secretKey(): string | null {
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
  } catch { return null }
}

function anonKey(): string | null {
  const direct = Deno.env.get('SUPABASE_ANON_KEY')
  if (direct) return direct
  const raw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return parsed
    if (parsed?.default) return String(parsed.default)
    const first = Object.values(parsed ?? {})[0]
    return first ? String(first) : null
  } catch { return null }
}

function randomPassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let out = ''
  for (const byte of bytes) out += chars[byte % chars.length]
  return out
}

function txt(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str.length ? str : null
}

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.toLowerCase())
  return fallback
}

function normalizeKind(value: unknown): Kind {
  const kind = String(value || 'customer').toLowerCase()
  if (kind === 'customer_match' || kind === 'staff' || kind === 'receipt' || kind === 'log' || kind === 'shipment' || kind === 'task' || kind === 'finance') return kind
  return 'customer'
}

function normalizeAction(value: unknown): Action {
  const action = String(value || 'list').toLowerCase()
  if (action === 'create' || action === 'update' || action === 'archive' || action === 'delete' || action === 'claim' || action === 'complete') return action
  return 'list'
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try { return JSON.stringify(err) } catch { return 'Unknown error' }
}

async function getActor(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = anonKey()
  if (!url || !anon) throw new Error('Supabase public keys are missing')

  const authHeader = req.headers.get('Authorization') || ''
  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  })

  const { data: userData, error: userErr } = await authClient.auth.getUser()
  if (userErr || !userData.user) throw responseError('Unauthorized', 401, req)

  const service = secretKey()
  if (!service) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')

  const serviceClient = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const { data: staffRow, error: staffErr } = await serviceClient
    .from('staff')
    .select('id,full_name,role,branch,is_active')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (staffErr) throw staffErr
  if (!staffRow || staffRow.is_active !== true) throw responseError('Forbidden', 403, req)

  const role = String(staffRow.role || '')
  const isSuperAdmin = role === 'super_admin'
  const canRead = ['admin', 'super_admin', 'accountant'].includes(role)
  const canReadOperations = ['admin', 'super_admin', 'accountant', 'warehouse', 'operations'].includes(role)
  const canWrite = ['admin', 'super_admin'].includes(role)

  return { serviceClient, staffRow, role, isSuperAdmin, canRead, canReadOperations, canWrite }
}

async function logActivity(client: ReturnType<typeof createClient>, staffId: string, staffName: string | null, action: string, targetId: string | null, details: JsonRecord | null = null) {
  try {
    await client.from('staff_activity_log').insert({
      staff_id: staffId,
      staff_name: staffName,
      action,
      target_id: targetId,
      details: details ? JSON.stringify(details) : null,
    })
  } catch { /* best effort */ }
}

async function listCustomers(client: ReturnType<typeof createClient>) {
  const { data: customers, error } = await client
    .from('customer_directory')
    .select('id,code,name,phone,phone2,email,city,delivery_location,note,auth_user_id,manager_staff_id,is_active,created_at,updated_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  const { data: stats, error: statsErr } = await client.from('customer_directory_stats').select('directory_customer_id,shipment_count,total_amount,outstanding,last_shipment_at')
  if (statsErr) throw statsErr
  const statsMap = new Map<string, any>()
  for (const row of stats ?? []) statsMap.set(String((row as any).directory_customer_id), row)
  return {
    items: (customers ?? []).map((row: any) => {
      const stat = statsMap.get(String(row.id)) || {}
      return { ...row, shipment_count: Number(stat.shipment_count ?? 0), total_amount: Number(stat.total_amount ?? 0), outstanding_amount: Number(stat.outstanding ?? 0), last_shipment_at: stat.last_shipment_at ?? null }
    }),
    kind: 'customer',
  }
}

async function listShipments(client: ReturnType<typeof createClient>) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await client.from('shipments').select('id,created_at,total_amount,paid_amount,origin_key,dest_key,branch,customer_name,customer_phone,directory_customer_id,current_step_index,step_dates,eta,type,items_count,weight_kg,volume_cbm').gte('created_at', since).order('created_at', { ascending: false })
  if (error) throw error
  return { items: (data ?? []).map((row: any) => ({ ...row, delivered_at: row.step_dates?.delivered ?? null })), kind: 'shipment' }
}

async function listStaff(client: ReturnType<typeof createClient>) {
  const { data, error } = await client.from('staff').select('id,full_name,role,branch,is_active,created_at,updated_at').order('created_at', { ascending: false })
  if (error) throw error
  return { items: data ?? [], kind: 'staff' }
}

async function listTasks(client: ReturnType<typeof createClient>, actor: { id: string, role: string, branch: string | null }) {
  const { data, error } = await client.from('staff_tasks').select('id,title,description,status,priority,branch,assignee_id,created_by,entity_type,entity_id,due_at,blocked_reason,completed_at,created_at,updated_at').order('due_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(200)
  if (error) throw error
  const staffIds = [...new Set((data ?? []).flatMap((task: any) => [task.assignee_id, task.created_by].filter(Boolean)))]
  const { data: staff, error: staffErr } = staffIds.length ? await client.from('staff').select('id,full_name,role,branch').in('id', staffIds) : { data: [], error: null }
  if (staffErr) throw staffErr
  const staffMap = new Map((staff ?? []).map((row: any) => [String(row.id), row]))
  const isAdmin = actor.role === 'admin' || actor.role === 'super_admin'
  const visible = (data ?? []).filter((task: any) => isAdmin || task.assignee_id === actor.id || task.created_by === actor.id || task.branch === 'all' || task.branch === (actor.branch || 'all'))
  return { items: visible.map((task: any) => ({ ...task, assignee: task.assignee_id ? staffMap.get(String(task.assignee_id)) ?? null : null, creator: staffMap.get(String(task.created_by)) ?? null })), kind: 'task' }
}

function addAmount(target: Record<string, number>, currency: unknown, amount: unknown) { const key = String(currency || 'USD').toUpperCase(); target[key] = Math.round(((target[key] || 0) + Number(amount || 0)) * 100) / 100 }
async function listFinance(client: ReturnType<typeof createClient>) {
  const [invoiceResult, costResult] = await Promise.all([
    client.from('shipment_invoices').select('id,invoice_number,shipment_id,total,paid_total,currency,status,due_at,issued_at,created_at').order('created_at', { ascending: false }).limit(1000),
    client.from('company_cost_entries').select('id,category,description,amount,currency,branch,route_key,occurred_at,created_at').order('occurred_at', { ascending: false }).limit(1000),
  ])
  if (invoiceResult.error) throw invoiceResult.error
  if (costResult.error) throw costResult.error
  const revenue: Record<string, number> = {}, collected: Record<string, number> = {}, outstanding: Record<string, number> = {}, costs: Record<string, number> = {}
  const byRoute: Record<string, { revenue: number, collected: number, outstanding: number, currency: string }> = {}
  for (const row of invoiceResult.data ?? []) {
    addAmount(revenue, row.currency, row.total); addAmount(collected, row.currency, row.paid_total); addAmount(outstanding, row.currency, Math.max(0, Number(row.total || 0) - Number(row.paid_total || 0)))
    const routeKey = String(row.shipment_id || '—'); const currency = String(row.currency || 'USD').toUpperCase(); const route = byRoute[routeKey] || { revenue: 0, collected: 0, outstanding: 0, currency }; route.revenue += Number(row.total || 0); route.collected += Number(row.paid_total || 0); route.outstanding += Math.max(0, Number(row.total || 0) - Number(row.paid_total || 0)); byRoute[routeKey] = route
  }
  for (const row of costResult.data ?? []) addAmount(costs, row.currency, row.amount)
  const profit: Record<string, number> = {}; for (const currency of new Set([...Object.keys(revenue), ...Object.keys(costs)])) profit[currency] = Math.round(((revenue[currency] || 0) - (costs[currency] || 0)) * 100) / 100
  return { kind: 'finance', period: 'all_available_records', invoices: invoiceResult.data ?? [], costs: costResult.data ?? [], summary: { revenue, collected, outstanding, costs, profit }, byRoute: Object.entries(byRoute).map(([route, values]) => ({ route, ...values })).sort((a, b) => b.revenue - a.revenue) }
}

function taskStatus(value: unknown, fallback = 'todo'): string {
  const status = txt(value) || fallback
  if (!['todo','in_progress','blocked','review','done','cancelled'].includes(status)) throw responseError('Invalid task status', 400)
  return status
}
function taskPriority(value: unknown, fallback = 'normal'): string {
  const priority = txt(value) || fallback
  if (!['critical','high','normal','low'].includes(priority)) throw responseError('Invalid task priority', 400)
  return priority
}
async function createTask(client: ReturnType<typeof createClient>, payload: JsonRecord, actor: { id: string, name: string | null, role: string, branch: string | null }) {
  if (!['admin','super_admin','accountant'].includes(actor.role)) throw responseError('Task creation is not allowed for this staff role', 403)
  const title = txt(payload.title)
  if (!title || title.length < 2 || title.length > 180) throw responseError('Task title must be between 2 and 180 characters', 400)
  const assigneeId = txt(payload.assignee_id)
  const branch = txt(payload.branch) || actor.branch || 'all'
  const row = { title, description: txt(payload.description), status: taskStatus(payload.status), priority: taskPriority(payload.priority), branch, assignee_id: assigneeId, created_by: actor.id, entity_type: txt(payload.entity_type), entity_id: txt(payload.entity_id), due_at: txt(payload.due_at), blocked_reason: txt(payload.blocked_reason), completed_at: null }
  const { data, error } = await client.from('staff_tasks').insert(row).select('id,title,description,status,priority,branch,assignee_id,created_by,entity_type,entity_id,due_at,blocked_reason,completed_at,created_at,updated_at').single()
  if (error) throw error
  await logActivity(client, actor.id, actor.name, 'create_staff_task', String(data.id), { title, priority: row.priority, assignee_id: assigneeId, due_at: row.due_at })
  return { task: data }
}
async function updateTask(client: ReturnType<typeof createClient>, payload: JsonRecord, actor: { id: string, name: string | null, role: string, branch: string | null }, action: Action) {
  const id = txt(payload.id)
  if (!id) throw responseError('Missing task id', 400)
  const { data: current, error: currentErr } = await client.from('staff_tasks').select('id,title,description,status,priority,branch,assignee_id,created_by,entity_type,entity_id,due_at,blocked_reason,completed_at').eq('id', id).maybeSingle()
  if (currentErr) throw currentErr
  if (!current) throw responseError('Task not found', 404)
  const isAdmin = actor.role === 'admin' || actor.role === 'super_admin'
  if (!isAdmin && current.assignee_id !== actor.id && current.created_by !== actor.id) throw responseError('You are not allowed to update this task', 403)
  const updates: JsonRecord = {}
  if (action === 'claim') { updates.assignee_id = actor.id; updates.status = current.status === 'todo' ? 'in_progress' : current.status }
  else if (action === 'complete') { updates.status = 'done'; updates.completed_at = new Date().toISOString(); updates.blocked_reason = null }
  else {
    if (payload.title !== undefined) { const title = txt(payload.title); if (!title || title.length < 2 || title.length > 180) throw responseError('Invalid task title', 400); updates.title = title }
    if (payload.description !== undefined) updates.description = txt(payload.description)
    if (payload.status !== undefined) updates.status = taskStatus(payload.status, current.status)
    if (payload.priority !== undefined) updates.priority = taskPriority(payload.priority, current.priority)
    if (payload.assignee_id !== undefined) updates.assignee_id = txt(payload.assignee_id)
    if (payload.branch !== undefined) updates.branch = txt(payload.branch) || actor.branch || 'all'
    if (payload.due_at !== undefined) updates.due_at = txt(payload.due_at)
    if (payload.blocked_reason !== undefined) updates.blocked_reason = txt(payload.blocked_reason)
    if (updates.status === 'done') updates.completed_at = new Date().toISOString()
    if (updates.status && updates.status !== 'blocked') updates.blocked_reason = null
  }
  const { data: saved, error } = await client.from('staff_tasks').update(updates).eq('id', id).select('id,title,description,status,priority,branch,assignee_id,created_by,entity_type,entity_id,due_at,blocked_reason,completed_at,created_at,updated_at').single()
  if (error) throw error
  await logActivity(client, actor.id, actor.name, `${action}_staff_task`, id, { from_status: current.status, to_status: saved.status, updates })
  return { task: saved }
}

async function listReceipts(client: ReturnType<typeof createClient>) {
  const { data, error } = await client.from('warehouse_receipts').select('id,batch_code,location,notes,received_at,created_by_name,directory_customer_id,directory_phone,consolidated,photos,created_at').order('received_at', { ascending: false }).limit(100)
  if (error) throw error
  return { items: data ?? [], kind: 'receipt' }
}

async function listLogs(client: ReturnType<typeof createClient>) {
  const { data, error } = await client.from('staff_activity_log').select('id,staff_id,staff_name,action,target_id,details,created_at').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return { items: data ?? [], kind: 'log' }
}

async function findCustomerRow(client: ReturnType<typeof createClient>, payload: JsonRecord) {
  const id = txt(payload.id)
  const phone = txt(payload.phone)
  const email = txt(payload.email)
  if (id) {
    const { data, error } = await client.from('customer_directory').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (data) return data as any
  }
  if (phone) {
    const { data, error } = await client.from('customer_directory').select('*').or(`phone.eq.${phone},phone2.eq.${phone}`).maybeSingle()
    if (error) throw error
    if (data) return data as any
  }
  if (email) {
    const { data, error } = await client.from('customer_directory').select('*').ilike('email', email).maybeSingle()
    if (error) throw error
    if (data) return data as any
  }
  return null
}

async function createCustomerAuth(client: ReturnType<typeof createClient>, payload: JsonRecord, existingAuthUserId: string | null) {
  if (existingAuthUserId) return { userId: existingAuthUserId, warning: null }
  const name = txt(payload.name) || 'Customer'
  const email = txt(payload.email)
  const phone = txt(payload.phone)
  const phone2 = txt(payload.phone2)
  const invite = bool(payload.send_invite, Boolean(email))
  const password = txt(payload.password) || randomPassword()
  if (!email && !phone) return { userId: null as string | null, warning: 'No email or phone provided; customer saved without Supabase Auth account.' }
  try {
    if (invite && email) {
      const { data, error } = await client.auth.admin.inviteUserByEmail(email, { data: { full_name: name, phone: phone ?? '', phone2: phone2 ?? '', account_kind: 'customer' } })
      if (error) throw error
      return { userId: data.user?.id ?? null, warning: null }
    }
    const attrs: Record<string, unknown> = { user_metadata: { full_name: name, phone: phone ?? '', phone2: phone2 ?? '', account_kind: 'customer' }, password }
    if (email) { attrs.email = email; attrs.email_confirm = true }
    if (phone) { attrs.phone = phone; attrs.phone_confirm = true }
    const { data, error } = await client.auth.admin.createUser(attrs as never)
    if (error) throw error
    return { userId: data.user?.id ?? null, warning: null }
  } catch (err) {
    return { userId: null as string | null, warning: `Customer Auth account was not created: ${toErrorMessage(err)}` }
  }
}

async function upsertCustomer(client: ReturnType<typeof createClient>, payload: JsonRecord, actor: { id: string, name: string | null, isSuperAdmin: boolean }) {
  if (!actor.isSuperAdmin) throw responseError('Only Super Admin can create customer accounts', 403)
  const name = txt(payload.name) || txt(payload.phone) || txt(payload.email) || 'Customer'
  const email = txt(payload.email)
  const phone = txt(payload.phone)
  const phone2 = txt(payload.phone2)
  const city = txt(payload.city)
  const deliveryLocation = txt(payload.delivery_location)
  const note = txt(payload.note)
  const managerStaffId = txt(payload.manager_staff_id)
  const existing = await findCustomerRow(client, payload)
  const authResult = await createCustomerAuth(client, payload, existing?.auth_user_id ?? null)
  const base = { name, email, phone, phone2, city, delivery_location: deliveryLocation, note, manager_staff_id: managerStaffId, is_active: typeof payload.is_active === 'boolean' ? payload.is_active : true }
  const write = existing?.id ? client.from('customer_directory').update({ ...base, auth_user_id: authResult.userId ?? null }).eq('id', existing.id) : client.from('customer_directory').insert({ ...base, auth_user_id: authResult.userId ?? null })
  const { data: saved, error } = await write.select('id,code,name,phone,phone2,email,city,delivery_location,note,auth_user_id,manager_staff_id,is_active,created_at,updated_at').single()
  if (error) throw error
  await logActivity(client, actor.id, actor.name, existing?.id ? 'update_customer_account' : 'create_customer_account', String(saved.id), { email, phone, manager_staff_id: managerStaffId, auth_user_created: Boolean(authResult.userId && !existing?.auth_user_id) })
  return { customer: saved, auth_user_id: authResult.userId, warning: authResult.warning, status: authResult.userId ? 'linked' : 'saved_without_auth' }
}

async function updateCustomer(client: ReturnType<typeof createClient>, payload: JsonRecord, actor: { id: string, name: string | null, isSuperAdmin: boolean }) {
  const id = txt(payload.id)
  if (!id) throw responseError('Missing customer id', 400)
  if (!actor.isSuperAdmin && (txt(payload.email) !== null || txt(payload.password) !== null || payload.gc_code !== undefined || payload.code !== undefined)) {
    throw responseError('Email, password, and GC code are managed by Super Admin only', 403)
  }
  const updates: JsonRecord = {}
  for (const key of ['name', 'email', 'phone', 'phone2', 'city', 'delivery_location', 'note', 'manager_staff_id'] as const) {
    if (!actor.isSuperAdmin && key === 'email') continue
    const value = txt(payload[key])
    if (value !== null) updates[key] = value
  }
  if (typeof payload.is_active === 'boolean') updates.is_active = payload.is_active
  if (actor.isSuperAdmin && payload.gc_code !== undefined) updates.gc_code = txt(payload.gc_code)
  if (actor.isSuperAdmin && payload.code !== undefined) updates.code = txt(payload.code)

  const { data: current, error: currentErr } = await client.from('customer_directory').select('id,auth_user_id').eq('id', id).maybeSingle()
  if (currentErr) throw currentErr
  if (!current) throw responseError('Customer not found', 404)

  if (current.auth_user_id && actor.isSuperAdmin) {
    const authUpdate: Record<string, unknown> = {}
    const name = txt(payload.name)
    const email = txt(payload.email)
    const phone = txt(payload.phone)
    const phone2 = txt(payload.phone2)
    if (name || phone || phone2) authUpdate.user_metadata = { full_name: name, phone: phone ?? '', phone2: phone2 ?? '', account_kind: 'customer' }
    if (email) authUpdate.email = email
    if (phone) authUpdate.phone = phone
    const password = txt(payload.password)
    if (password) authUpdate.password = password
    if (Object.keys(authUpdate).length) {
      const { error } = await client.auth.admin.updateUserById(String(current.auth_user_id), authUpdate as never)
      if (error) throw error
    }
  }

  const { data: updated, error } = await client.from('customer_directory').update(updates).eq('id', id).select('id,code,name,phone,phone2,email,city,delivery_location,note,auth_user_id,manager_staff_id,is_active,created_at,updated_at').single()
  if (error) throw error
  await logActivity(client, actor.id, actor.name, 'update_customer_account', id, updates)
  return updated
}

async function archiveCustomer(client: ReturnType<typeof createClient>, payload: JsonRecord, staffId: string, staffName: string | null) {
  const id = txt(payload.id)
  if (!id) throw responseError('Missing customer id', 400)
  const hardDeleteAuth = bool(payload.hard_delete_auth, false)
  const { data: current, error: currentErr } = await client.from('customer_directory').select('id,auth_user_id').eq('id', id).maybeSingle()
  if (currentErr) throw currentErr
  if (!current) throw responseError('Customer not found', 404)
  let authWarning: string | null = null
  if (hardDeleteAuth && current.auth_user_id) {
    try { const { error } = await client.auth.admin.deleteUser(String(current.auth_user_id)); if (error) throw error } catch (err) { authWarning = `Linked Auth user deletion failed: ${toErrorMessage(err)}` }
  }
  const { data: updated, error } = await client.from('customer_directory').update({ is_active: false, auth_user_id: hardDeleteAuth ? null : current.auth_user_id ?? null }).eq('id', id).select('id,code,name,phone,phone2,email,city,delivery_location,note,auth_user_id,manager_staff_id,is_active,created_at,updated_at').single()
  if (error) throw error
  await logActivity(client, staffId, staffName, 'archive_customer_account', id, { hard_delete_auth: hardDeleteAuth })
  return { ...updated, warning: authWarning }
}

async function createStaff(client: ReturnType<typeof createClient>, payload: JsonRecord, actor: { id: string, name: string | null, isSuperAdmin: boolean }) {
  if (!actor.isSuperAdmin) throw responseError('Only Super Admin can create staff accounts', 403)
  const email = txt(payload.email)
  const fullName = txt(payload.full_name) || txt(payload.name) || email || 'Staff member'
  const branch = txt(payload.branch) || 'all'
  const role = txt(payload.role) || 'admin'
  const password = txt(payload.password) || randomPassword()
  const invite = bool(payload.send_invite, Boolean(email))
  if (!email) throw responseError('Staff email is required', 400)
  if (!['admin','accountant','super_admin'].includes(role)) throw responseError('Invalid staff role', 400)
  let userId: string | null = txt(payload.id)
  if (!userId) {
    if (invite) {
      const { data, error } = await client.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName, role, branch, account_kind: 'staff' } })
      if (error) throw error
      userId = data.user?.id ?? null
    } else {
      const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, role, branch, account_kind: 'staff' } } as never)
      if (error) throw error
      userId = data.user?.id ?? null
    }
  }
  if (!userId) throw new Error('Failed to create staff auth user')
  const { data: row, error } = await client.from('staff').upsert({ id: userId, full_name: fullName, role, branch, is_active: true }, { onConflict: 'id' }).select('id,full_name,role,branch,is_active,created_at,updated_at').single()
  if (error) throw error
  await logActivity(client, actor.id, actor.name, 'create_staff_account', row.id, { email, role, branch })
  return { staff: row, auth_user_id: userId, status: invite ? 'invited' : 'created' }
}

async function updateStaff(client: ReturnType<typeof createClient>, payload: JsonRecord, actor: { id: string, name: string | null, isSuperAdmin: boolean }) {
  const id = txt(payload.id)
  if (!id) throw responseError('Missing staff id', 400)
  if (!actor.isSuperAdmin && (txt(payload.email) !== null || txt(payload.password) !== null)) {
    throw responseError('Email and password are managed by Super Admin only', 403)
  }
  const { data: current, error: currentErr } = await client.from('staff').select('id,role,is_active').eq('id', id).maybeSingle()
  if (currentErr) throw currentErr
  if (!current) throw responseError('Staff member not found', 404)
  if (current.role === 'super_admin' && !actor.isSuperAdmin) throw responseError('Only Super Admin can modify a Super Admin', 403)
  if (id === actor.id && payload.is_active === false) throw responseError('You cannot deactivate your own Super Admin session', 400)
  const nextRole = txt(payload.role)
  if (nextRole && !['admin','accountant','super_admin'].includes(nextRole)) throw responseError('Invalid staff role', 400)
  if (nextRole === 'super_admin' && !actor.isSuperAdmin) throw responseError('Only Super Admin can grant Super Admin role', 403)
  const updates: JsonRecord = {}
  for (const key of ['full_name', 'role', 'branch'] as const) { const value = txt(payload[key]); if (value !== null) updates[key] = value }
  if (typeof payload.is_active === 'boolean') updates.is_active = payload.is_active
  const email = txt(payload.email)
  const password = txt(payload.password)
  if (actor.isSuperAdmin && (email || password || txt(payload.full_name) || txt(payload.role) || txt(payload.branch))) {
    const authUpdate: JsonRecord = { user_metadata: { full_name: txt(payload.full_name), role: txt(payload.role), branch: txt(payload.branch), account_kind: 'staff' } }
    if (email) authUpdate.email = email
    if (password) authUpdate.password = password
    const { error } = await client.auth.admin.updateUserById(id, authUpdate as never)
    if (error) throw error
  }
  const { data: row, error } = await client.from('staff').update(updates).eq('id', id).select('id,full_name,role,branch,is_active,created_at,updated_at').single()
  if (error) throw error
  await logActivity(client, actor.id, actor.name, 'update_staff_account', id, updates)
  return row
}

async function deleteStaff(client: ReturnType<typeof createClient>, payload: JsonRecord, actor: { id: string, name: string | null, isSuperAdmin: boolean }) {
  const id = txt(payload.id)
  if (!id) throw responseError('Missing staff id', 400)
  if (id === actor.id) throw responseError('You cannot deactivate your own account', 400)
  const { data: current, error: currentErr } = await client.from('staff').select('id,role,is_active').eq('id', id).maybeSingle()
  if (currentErr) throw currentErr
  if (!current) throw responseError('Staff member not found', 404)
  if (current.role === 'super_admin' && !actor.isSuperAdmin) throw responseError('Only Super Admin can deactivate a Super Admin', 403)
  let authWarning: string | null = null
  try { await client.auth.admin.deleteUser(id) } catch (err) { authWarning = `Auth user deletion failed: ${toErrorMessage(err)}` }
  const { error } = await client.from('staff').update({ is_active: false }).eq('id', id)
  if (error) throw error
  await logActivity(client, actor.id, actor.name, 'deactivate_staff_account', id, null)
  return { ok: true, warning: authWarning }
}

async function lookupCustomer(client: ReturnType<typeof createClient>, payload: JsonRecord) {
  const id = txt(payload.directory_customer_id)
  const phone = txt(payload.customer_phone)
  const code = txt(payload.customer_code)
  if (id) { const { data, error } = await client.from('customer_directory').select('id,name,code,phone').eq('id', id).maybeSingle(); if (error) throw error; return data ?? null }
  if (code) { const { data, error } = await client.from('customer_directory').select('id,name,code,phone').eq('code', code).maybeSingle(); if (error) throw error; if (data) return data }
  if (phone) { const { data, error } = await client.from('customer_directory').select('id,name,code,phone').or(`phone.eq.${phone},phone2.eq.${phone}`).maybeSingle(); if (error) throw error; return data ?? null }
  return null
}

async function createReceipt(client: ReturnType<typeof createClient>, payload: JsonRecord, files: File[], actor: { id: string, name: string | null }) {
  const batchCode = txt(payload.batch_code)
  const location = txt(payload.location) || 'Dubai'
  const notes = txt(payload.notes)
  if (!batchCode) throw responseError('Missing batch_code', 400)
  if (files.length > 8) throw responseError('Maximum 8 photos per receipt', 400)
  const customer = await lookupCustomer(client, payload)
  const bucket = 'warehouse-receipts'
  const uploadedUrls: string[] = []
  for (const file of files) {
    if (!file.type.startsWith('image/')) throw responseError('Only image uploads are allowed', 400)
    if (file.size > 10 * 1024 * 1024) throw responseError('Each receipt photo must be 10MB or smaller', 400)
    const safeName = (file.name || 'photo').replace(/[^a-zA-Z0-9._-]+/g, '_')
    const path = `${batchCode}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadErr } = await client.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false })
    if (uploadErr) throw uploadErr
    const { data: publicUrl } = client.storage.from(bucket).getPublicUrl(path)
    uploadedUrls.push(publicUrl.publicUrl)
  }
  const { data: row, error } = await client.from('warehouse_receipts').insert({ batch_code: batchCode, location, notes, directory_customer_id: customer?.id ?? null, directory_phone: customer?.phone ?? txt(payload.customer_phone) ?? null, created_by: actor.id, created_by_name: actor.name, photos: uploadedUrls, consolidated: false }).select('id,batch_code,location,notes,received_at,created_by_name,directory_customer_id,directory_phone,consolidated,photos,created_at').single()
  if (error) throw error
  await logActivity(client, actor.id, actor.name, 'create_warehouse_receipt', String(row.id), { batch_code: batchCode, location, photo_count: uploadedUrls.length })
  return { receipt: row, customer, uploaded_urls: uploadedUrls }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  try {
    const actor = await getActor(req)
    const { serviceClient, staffRow, canRead, canReadOperations, canWrite, isSuperAdmin } = actor
    const url = new URL(req.url)
    if (req.method === 'GET') {
      const kind = normalizeKind(url.searchParams.get('kind'))
      if (kind === 'receipt' && canReadOperations) return json(await listReceipts(serviceClient), {}, req)
      if (kind === 'customer_match' && canReadOperations) { const code = txt(url.searchParams.get('code')); if (!code) return json({ customer: null }, {}, req); return json({ customer: await lookupCustomer(serviceClient, { customer_code: code }) }, {}, req) }
      if (kind === 'task' && canReadOperations) return json(await listTasks(serviceClient, { id: staffRow.id, role: String(staffRow.role || ''), branch: staffRow.branch }), {}, req)
      if (kind === 'finance' && canRead) return json(await listFinance(serviceClient), {}, req)
      if (!canRead) return json({ error: 'Forbidden' }, { status: 403 }, req)
      if (kind === 'staff') return json(await listStaff(serviceClient), {}, req)
      if (kind === 'log') return json(await listLogs(serviceClient), {}, req)
      if (kind === 'shipment') return json(await listShipments(serviceClient), {}, req)
      return json(await listCustomers(serviceClient), {}, req)
    }
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 }, req)
    const contentType = req.headers.get('content-type') || ''
    let body: JsonRecord = {}
    let files: File[] = []
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const data: JsonRecord = {}
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) { if (value.size > 0) files.push(value); continue }
        if (key === 'photos') continue
        data[key] = String(value)
      }
      body = data
    } else {
      body = (await req.json().catch(() => ({}))) as JsonRecord
    }
    const kind = normalizeKind(body.kind)
    const action = normalizeAction(body.action)
    const data = body.data && typeof body.data === 'object' ? (body.data as JsonRecord) : body
    if (kind === 'receipt' && action === 'create') {
      if (!canReadOperations) return json({ error: 'Forbidden' }, { status: 403 }, req)
      return json(await createReceipt(serviceClient, data, files, { id: staffRow.id, name: staffRow.full_name }), {}, req)
    }
    if (kind === 'task') {
      if (!canRead && !canReadOperations) return json({ error: 'Forbidden' }, { status: 403 }, req)
      const taskActor = { id: staffRow.id, name: staffRow.full_name, role: String(staffRow.role || ''), branch: staffRow.branch }
      if (action === 'create') return json(await createTask(serviceClient, data, taskActor), {}, req)
      if (action === 'update' || action === 'claim' || action === 'complete') return json(await updateTask(serviceClient, data, taskActor, action), {}, req)
      return json({ error: 'Unsupported task action' }, { status: 400 }, req)
    }
    if (!canWrite) return json({ error: 'Forbidden' }, { status: 403 }, req)
    if ((kind === 'customer' || kind === 'staff') && action === 'create' && !isSuperAdmin) return json({ error: 'Only Super Admin can create accounts' }, { status: 403 }, req)
    if (kind === 'customer') {
      if (action === 'create') return json(await upsertCustomer(serviceClient, data, { id: staffRow.id, name: staffRow.full_name, isSuperAdmin }), {}, req)
      if (action === 'update') return json(await updateCustomer(serviceClient, data, { id: staffRow.id, name: staffRow.full_name, isSuperAdmin }), {}, req)
      if (action === 'archive' || action === 'delete') return json(await archiveCustomer(serviceClient, data, staffRow.id, staffRow.full_name), {}, req)
    }
    if (kind === 'staff') {
      if (action === 'create') return json(await createStaff(serviceClient, data, { id: staffRow.id, name: staffRow.full_name, isSuperAdmin }), {}, req)
      if (action === 'update') return json(await updateStaff(serviceClient, data, { id: staffRow.id, name: staffRow.full_name, isSuperAdmin }), {}, req)
      if (action === 'archive' || action === 'delete') return json(await deleteStaff(serviceClient, data, { id: staffRow.id, name: staffRow.full_name, isSuperAdmin }), {}, req)
    }
    return json({ error: 'Unsupported action' }, { status: 400 }, req)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('account-admin error', error)
    return json({ error: toErrorMessage(error) }, { status: 500 }, req)
  }
})
