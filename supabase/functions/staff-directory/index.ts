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
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Vary': 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(req) })
}

async function getActor(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !anon || !service) throw new Error('Server configuration is incomplete')

  const authorization = req.headers.get('authorization') || ''
  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: authorization ? { Authorization: authorization } : {} },
  })
  const { data: userData, error: userError } = await authClient.auth.getUser()
  if (userError || !userData.user) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: headers(req) })

  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const { data: staff, error } = await db.from('staff').select('id,full_name,role,branch,is_active,created_at,updated_at').eq('id', userData.user.id).maybeSingle()
  if (error) throw error
  if (!staff?.is_active || !['admin', 'super_admin'].includes(String(staff.role || ''))) {
    throw new Response(JSON.stringify({ error: 'Staff admin access required' }), { status: 403, headers: headers(req) })
  }
  return { db, user: userData.user, staff }
}

function safeRows<T>(rows: T[] | null | undefined) { return rows ?? [] }

async function listDirectory(db: ReturnType<typeof createClient>) {
  const { data, error } = await db.from('staff')
    .select('id,full_name,role,branch,is_active,created_at,updated_at')
    .order('is_active', { ascending: false })
    .order('full_name', { ascending: true })
  if (error) throw error
  const rows = safeRows(data)
  const counts = await Promise.all(rows.map(async (row: any) => {
    const [shipments, tasks, customers, logs] = await Promise.all([
      db.from('shipments').select('id', { count: 'exact', head: true }).eq('assigned_staff_id', row.id),
      db.from('staff_tasks').select('id', { count: 'exact', head: true }).eq('assignee_id', row.id).not('status', 'eq', 'completed'),
      db.from('customer_directory').select('id', { count: 'exact', head: true }).eq('manager_staff_id', row.id),
      db.from('staff_activity_log').select('id', { count: 'exact', head: true }).eq('staff_id', row.id),
    ])
    return {
      id: row.id,
      shipment_count: shipments.count ?? 0,
      open_task_count: tasks.count ?? 0,
      customer_count: customers.count ?? 0,
      activity_count: logs.count ?? 0,
    }
  }))
  const map = new Map(counts.map((x) => [String(x.id), x]))
  return rows.map((row: any) => ({ ...row, ...(map.get(String(row.id)) || {}) }))
}

async function detail(db: ReturnType<typeof createClient>, id: string) {
  const { data: staff, error } = await db.from('staff')
    .select('id,full_name,role,branch,is_active,created_at,updated_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!staff) throw new Response(JSON.stringify({ error: 'Staff member not found' }), { status: 404 })

  const [authResult, shipmentsResult, tasksResult, customersResult, logsResult] = await Promise.all([
    db.auth.admin.getUserById(id),
    db.from('shipments').select('id,created_at,customer_name,origin_key,dest_key,branch,current_step_index,step_dates,eta,total_amount,paid_amount,weight_kg,type').eq('assigned_staff_id', id).order('created_at', { ascending: false }).limit(100),
    db.from('staff_tasks').select('id,title,description,status,priority,branch,entity_type,entity_id,due_at,blocked_reason,completed_at,created_at,updated_at').eq('assignee_id', id).order('due_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(100),
    db.from('customer_directory').select('id,code,gc_code,name,phone,city,is_active,updated_at').eq('manager_staff_id', id).order('updated_at', { ascending: false }).limit(100),
    db.from('staff_activity_log').select('id,action,target_id,details,created_at,staff_name').eq('staff_id', id).order('created_at', { ascending: false }).limit(100),
  ])

  const shipmentRows = safeRows(shipmentsResult.data)
  const taskRows = safeRows(tasksResult.data)
  const customerRows = safeRows(customersResult.data)
  const logRows = safeRows(logsResult.data)
  const openTasks = taskRows.filter((task: any) => String(task.status || '').toLowerCase() !== 'completed')
  const openBalance = shipmentRows.reduce((sum: number, row: any) => sum + Math.max(0, Number(row.total_amount || 0) - Number(row.paid_amount || 0)), 0)
  const lastActivity = logRows[0]?.created_at || staff.updated_at || staff.created_at || null

  return {
    staff,
    auth: {
      email: authResult.data.user?.email || null,
      last_sign_in_at: authResult.data.user?.last_sign_in_at || null,
      email_confirmed_at: authResult.data.user?.email_confirmed_at || null,
      phone: authResult.data.user?.phone || null,
    },
    stats: {
      shipment_count: shipmentRows.length,
      open_task_count: openTasks.length,
      customer_count: customerRows.length,
      activity_count: logRows.length,
      open_balance: Math.round(openBalance * 100) / 100,
      last_activity_at: lastActivity,
    },
    shipments: shipmentRows,
    tasks: taskRows,
    customers: customerRows,
    activity: logRows,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: headers(req) })
  if (req.method !== 'GET') return json(req, { error: 'Method not allowed' }, 405)
  try {
    const actor = await getActor(req)
    const url = new URL(req.url)
    const staffId = String(url.searchParams.get('staff_id') || '').trim()
    if (staffId) return json(req, await detail(actor.db, staffId))
    return json(req, { items: await listDirectory(actor.db), actor: actor.staff })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('staff-directory error', error)
    return json(req, { error: error instanceof Error ? error.message : 'Staff directory request failed' }, 500)
  }
})
