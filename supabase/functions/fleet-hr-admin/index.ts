import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>
type Staff = { id: string; full_name: string | null; role: string; branch: string | null; is_active: boolean }

const ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const FLEET_ROLES = ['admin','super_admin','operations','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','driver','delivery']
const FINANCE_ROLES = ['admin','super_admin','accountant','finance']
const ADMIN_ROLES = ['admin','super_admin']
const OPS_ROLES = ['admin','super_admin','operations']
const EVENT_TYPES = ['location_ping','route_started','route_completed','inspection','maintenance_started','maintenance_completed','fuel_recorded','status_changed']
const CURRENCIES = ['IQD','USD','AED','CNY']

const cors = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://globall-cloud.pages.dev',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}
const json = (req: Request, body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: cors(req) })
const text = (value: unknown, max = 500) => {
  if (value === null || value === undefined) return null
  const valueText = String(value).trim()
  return valueText ? valueText.slice(0, max) : null
}
const requiredText = (value: unknown, name: string, max = 200) => {
  const result = text(value, max)
  if (!result) throw new Error(name + ' is required')
  return result
}
const numberValue = (value: unknown, name: string, min = 0, optional = false) => {
  if ((value === null || value === undefined || value === '') && optional) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < min) throw new Error(name + ' must be a number >= ' + min)
  return n
}
const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !key) throw new Error('Server-side Supabase credentials are not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
const authenticate = async (req: Request) => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const authorization = req.headers.get('authorization') || ''
  if (!url || !key || !authorization.toLowerCase().startsWith('bearer ')) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors(req) })
  }
  const userClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } },
  })
  const user = await userClient.auth.getUser()
  if (user.error || !user.data.user) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors(req) })
  const service = serviceClient()
  const staffResult = await service.from('staff').select('id,full_name,role,branch,is_active').eq('id', user.data.user.id).maybeSingle()
  if (staffResult.error) throw staffResult.error
  if (!staffResult.data?.is_active) throw new Response(JSON.stringify({ error: 'Active staff account required' }), { status: 403, headers: cors(req) })
  return { service, staff: staffResult.data as Staff, user: user.data.user }
}
const requireRole = (staff: Staff, roles: string[]) => {
  if (!roles.includes(staff.role)) throw new Response(JSON.stringify({ error: 'Role is not authorized for this action' }), { status: 403 })
}
const branchName = (branch: unknown) => {
  const name = String(branch || '').trim().toLowerCase()
  if (name === 'uae' || name === 'dubai') return 'dubai'
  if (['china','erbil'].includes(name)) return name
  return name === 'all' ? 'all' : ''
}
const branchesFor = (staff: Staff) => {
  if (ADMIN_ROLES.includes(staff.role) || branchName(staff.branch) === 'all') return ['china','dubai','erbil']
  const branch = branchName(staff.branch)
  return branch ? [branch] : []
}
const requireBranch = (staff: Staff, branch: unknown) => {
  const target = branchName(branch)
  if (!target || target === 'all' || (!ADMIN_ROLES.includes(staff.role) && !branchesFor(staff).includes(target))) {
    throw new Response(JSON.stringify({ error: 'Branch access denied' }), { status: 403 })
  }
  return target
}
const audit = async (service: ReturnType<typeof serviceClient>, staff: Staff, action: string, target: string, details: Json = {}) => {
  const result = await service.from('staff_activity_log').insert({
    staff_id: staff.id, staff_name: staff.full_name, action, target_id: target, details: JSON.stringify(details),
  })
  if (result.error) {
    console.error('fleet-hr audit write failed', result.error.message)
    return false
  }
  return true
}
const paged = (url: URL) => {
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 40)))
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0))
  return { limit, offset }
}
const inRange = (query: any, offset: number, limit: number) => query.range(offset, offset + limit - 1)
const allowedVehicleIds = async (service: ReturnType<typeof serviceClient>, staff: Staff) => {
  const branches = branchesFor(staff)
  if (!branches.length) return []
  const q = await service.from('fleet_vehicles').select('id').in('branch', branches)
  if (q.error) throw q.error
  let ids = (q.data || []).map((x: {id:string}) => x.id)
  if (staff.role === 'driver' || staff.role === 'delivery') {
    const assigned = await service.from('delivery_assignments').select('vehicle_id').eq('assigned_staff_id', staff.id).not('vehicle_id','is',null)
    if (assigned.error) throw assigned.error
    const own = new Set((assigned.data || []).map((x: {vehicle_id:string|null}) => x.vehicle_id).filter(Boolean))
    ids = ids.filter((id: string) => own.has(id))
  }
  return ids
}
const list = async (service: ReturnType<typeof serviceClient>, staff: Staff, url: URL) => {
  const kind = url.searchParams.get('kind') || 'summary'
  const { limit, offset } = paged(url)
  if (kind === 'summary') {
    requireRole(staff, [...FLEET_ROLES,...FINANCE_ROLES])
    const vehicleIds = await allowedVehicleIds(service, staff)
    const empty = { count: 0 }
    const workDate = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
    const [vehicleCount, maintenanceCount, fuelMonth, attendanceCount, leaveCount] = await Promise.all([
      vehicleIds.length ? service.from('fleet_vehicles').select('id',{count:'exact',head:true}).in('id',vehicleIds) : Promise.resolve({count:0,error:null}),
      vehicleIds.length ? service.from('fleet_maintenance_records').select('id',{count:'exact',head:true}).in('vehicle_id',vehicleIds).in('status',['planned','in_progress']) : Promise.resolve({count:0,error:null}),
      vehicleIds.length ? service.from('fleet_fuel_logs').select('amount,currency,logged_at').in('vehicle_id',vehicleIds).gte('logged_at',new Date(Date.now()-30*86400000).toISOString()).limit(500) : Promise.resolve({data:[],error:null}),
      ADMIN_ROLES.includes(staff.role)
        ? service.from('hr_attendance_records').select('id',{count:'exact',head:true}).gte('work_date',workDate)
        : service.from('hr_attendance_records').select('id',{count:'exact',head:true}).eq('staff_id',staff.id).gte('work_date',workDate),
      ADMIN_ROLES.includes(staff.role)
        ? service.from('hr_leave_requests').select('id',{count:'exact',head:true}).eq('status','pending')
        : service.from('hr_leave_requests').select('id',{count:'exact',head:true}).eq('staff_id',staff.id).eq('status','pending'),
    ])
    for (const result of [vehicleCount,maintenanceCount,fuelMonth,attendanceCount,leaveCount] as any[]) if (result.error) throw result.error
    const fuelRows = (fuelMonth as any).data || []
    const byCurrency: Record<string,number> = {}
    for (const row of fuelRows) byCurrency[row.currency] = (byCurrency[row.currency] || 0) + Number(row.amount || 0)
    return {
      kind,
      item: {
        vehicles: (vehicleCount as any).count || 0,
        maintenance_open: (maintenanceCount as any).count || 0,
        fuel_last_30_days: byCurrency,
        attendance_today: (attendanceCount as any).count || 0,
        pending_leave: (leaveCount as any).count || 0,
        staff_name: staff.full_name, role: staff.role, branch: staff.branch,
        scope: branchesFor(staff),
      },
    }
  }
  if (kind === 'staff') {
    requireRole(staff, ADMIN_ROLES)
    const result = await inRange(service.from('staff').select('id,full_name,email,role,branch,is_active').order('full_name',{ascending:true}),offset,limit)
    if (result.error) throw result.error
    return {kind,items:result.data || [],offset,limit}
  }
  if (kind === 'drivers') {
    requireRole(staff, OPS_ROLES)
    const allowedBranches = branchesFor(staff)
    const result = await service.from('staff').select('id,full_name,email,role,branch,is_active')
      .in('role',['driver','delivery']).eq('is_active',true).order('full_name',{ascending:true}).limit(300)
    if (result.error) throw result.error
    const items = (result.data || []).filter((driver: Staff) => allowedBranches.includes('all') || allowedBranches.includes(branchName(driver.branch)))
    return {kind,items,offset,limit}
  }
  if (kind === 'assignments') {
    requireRole(staff, OPS_ROLES)
    const allowedBranches = branchesFor(staff)
    const driverResult = await service.from('staff').select('id,full_name,role,branch,is_active')
      .in('role',['driver','delivery']).eq('is_active',true).limit(500)
    if (driverResult.error) throw driverResult.error
    const drivers = (driverResult.data || []).filter((driver: Staff) => allowedBranches.includes('all') || allowedBranches.includes(branchName(driver.branch)))
    const driverIds = drivers.map((driver: Staff) => driver.id)
    if (!driverIds.length) return {kind,items:[],offset,limit}
    const result = await inRange(service.from('delivery_assignments')
      .select('id,shipment_id,assigned_staff_id,status,vehicle_id,pickup_at,delivered_at,note,created_at')
      .in('assigned_staff_id',driverIds)
      .in('status',['assigned','accepted','picked_up','out_for_delivery'])
      .order('created_at',{ascending:false}),offset,limit)
    if (result.error) throw result.error
    const byId = new Map<string, Staff>(drivers.map((driver: Staff) => [driver.id,driver] as [string, Staff]))
    const items = (result.data || []).map((assignment: any) => {
      const driver = byId.get(assignment.assigned_staff_id)
      return {...assignment,driver_name:driver?.full_name || driver?.email || assignment.assigned_staff_id,driver_role:driver?.role,driver_branch:driver?.branch}
    })
    return {kind,items,offset,limit}
  }
  if (kind === 'vehicles') {
    requireRole(staff,[...FLEET_ROLES,...FINANCE_ROLES])
    const ids = await allowedVehicleIds(service,staff)
    if (!ids.length) return {kind,items:[],offset,limit}
    const result = await inRange(service.from('fleet_vehicles').select('*').in('id',ids).order('created_at',{ascending:false}),offset,limit)
    if (result.error) throw result.error
    return {kind,items:result.data || [],offset,limit}
  }
  if (kind === 'vehicle_events' || kind === 'maintenance' || kind === 'fuel') {
    if (kind === 'maintenance') requireRole(staff,['admin','super_admin','operations','accountant','finance'])
    else if (kind === 'fuel') requireRole(staff,['admin','super_admin','operations','accountant','finance'])
    else requireRole(staff,['admin','super_admin','operations','driver','delivery'])
    const ids = await allowedVehicleIds(service,staff)
    if (!ids.length) return {kind,items:[],offset,limit}
    const table = kind === 'maintenance' ? 'fleet_maintenance_records' : kind === 'fuel' ? 'fleet_fuel_logs' : 'fleet_vehicle_events'
    const order = kind === 'vehicle_events' ? 'event_at' : kind === 'fuel' ? 'logged_at' : 'created_at'
    const result = await inRange(service.from(table).select('*').in('vehicle_id',ids).order(order,{ascending:false}),offset,limit)
    if (result.error) throw result.error
    return {kind,items:result.data || [],offset,limit}
  }
  if (kind === 'attendance') {
    const query = service.from('hr_attendance_records').select('*').order('check_in_at',{ascending:false})
    if (!ADMIN_ROLES.includes(staff.role)) query.eq('staff_id',staff.id)
    else requireRole(staff,ADMIN_ROLES)
    const result = await inRange(query,offset,limit)
    if (result.error) throw result.error
    return {kind,items:result.data || [],offset,limit}
  }
  if (kind === 'leave_requests') {
    const query = service.from('hr_leave_requests').select('*').order('created_at',{ascending:false})
    if (!ADMIN_ROLES.includes(staff.role)) query.eq('staff_id',staff.id)
    else requireRole(staff,ADMIN_ROLES)
    const result = await inRange(query,offset,limit)
    if (result.error) throw result.error
    return {kind,items:result.data || [],offset,limit}
  }
  if (kind === 'payroll_periods') {
    requireRole(staff,FINANCE_ROLES)
    const result = await inRange(service.from('hr_payroll_periods').select('*').order('period_start',{ascending:false}),offset,limit)
    if (result.error) throw result.error
    return {kind,items:result.data || [],offset,limit}
  }
  if (kind === 'payroll_entries') {
    requireRole(staff,FINANCE_ROLES)
    let query = service.from('hr_payroll_entries').select('*').order('created_at',{ascending:false})
    if (!ADMIN_ROLES.includes(staff.role) && branchName(staff.branch) !== 'all') {
      const branches = branchesFor(staff)
      const staffResult = branches.length ? await service.from('staff').select('id').in('branch',branches) : {data:[],error:null}
      if (staffResult.error) throw staffResult.error
      const staffIds = (staffResult.data || []).map((x: {id:string})=>x.id)
      if (!staffIds.length) return {kind,items:[],offset,limit}
      query = query.in('staff_id',staffIds)
    }
    const result = await inRange(query,offset,limit)
    if (result.error) throw result.error
    return {kind,items:result.data || [],offset,limit}
  }
  throw new Response(JSON.stringify({error:'Unsupported list kind'}),{status:400})
}

const vehicleWrite = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json, update: boolean) => {
  requireRole(staff,OPS_ROLES)
  const branch = requireBranch(staff, requiredText(data.branch,'branch',32))
  const payload: Json = {
    vehicle_code: requiredText(data.vehicle_code,'vehicle_code',80),
    plate_number: requiredText(data.plate_number,'plate_number',80),
    vehicle_type: requiredText(data.vehicle_type,'vehicle_type',20),
    branch,
    make: text(data.make,100), model: text(data.model,100),
    model_year: numberValue(data.model_year,'model_year',1980,true),
    vin: text(data.vin,100), fuel_type: text(data.fuel_type,20),
    capacity_kg: numberValue(data.capacity_kg,'capacity_kg',0,true),
    odometer_km: numberValue(data.odometer_km ?? 0,'odometer_km',0),
    status: text(data.status,30) || 'active',
    notes: text(data.notes,1000),
    updated_by: staff.id,
  }
  if (!['car','van','truck'].includes(String(payload.vehicle_type))) throw new Error('Unsupported vehicle_type')
  if (payload.fuel_type && !['petrol','diesel','hybrid','electric','other'].includes(String(payload.fuel_type))) throw new Error('Unsupported fuel_type')
  if (!['active','inactive','maintenance','retired'].includes(String(payload.status))) throw new Error('Unsupported vehicle status')
  if (payload.model_year && (!Number.isInteger(Number(payload.model_year)) || Number(payload.model_year)>2100)) throw new Error('model_year is out of range')
  let result
  if (update) {
    const id = requiredText(data.vehicle_id,'vehicle_id',80)
    const existing = await service.from('fleet_vehicles').select('id,branch,status').eq('id',id).maybeSingle()
    if (existing.error) throw existing.error
    if (!existing.data) throw new Error('Vehicle not found')
    requireBranch(staff,existing.data.branch)
    const activeJobs = await service.from('delivery_assignments').select('id,status').eq('vehicle_id',id).in('status',['assigned','accepted','picked_up','out_for_delivery']).limit(1).maybeSingle()
    if (activeJobs.error) throw activeJobs.error
    if (activeJobs.data && (branchName(existing.data.branch)!==branch || payload.status!=='active')) throw new Error('Cannot change the branch or deactivate a vehicle while it has an active delivery assignment')
    result = await service.from('fleet_vehicles').update(payload).eq('id',id).select('*').single()
  } else {
    payload.created_by = staff.id
    result = await service.from('fleet_vehicles').insert(payload).select('*').single()
  }
  if (result.error) throw result.error
  const auditLogged = await audit(service,staff,update?'fleet_vehicle_updated':'fleet_vehicle_created',String(result.data.id),{vehicle_code:result.data.vehicle_code,branch:result.data.branch})
  return {item:result.data,audit_logged:auditLogged}
}
const vehicleIdInScope = async (service: ReturnType<typeof serviceClient>, staff: Staff, idValue: unknown) => {
  const id = requiredText(idValue,'vehicle_id',80)
  const result = await service.from('fleet_vehicles').select('id,branch').eq('id',id).maybeSingle()
  if (result.error) throw result.error
  if (!result.data) throw new Error('Vehicle not found')
  requireBranch(staff,result.data.branch)
  return id
}
const assignVehicleToDelivery = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff, OPS_ROLES)
  const assignmentId = requiredText(data.assignment_id,'assignment_id',80)
  const vehicleId = await vehicleIdInScope(service,staff,data.vehicle_id)
  const [assignmentResult, vehicleResult] = await Promise.all([
    service.from('delivery_assignments').select('id,shipment_id,assigned_staff_id,status,vehicle_id').eq('id',assignmentId).maybeSingle(),
    service.from('fleet_vehicles').select('id,branch,vehicle_code,plate_number,status').eq('id',vehicleId).maybeSingle(),
  ])
  if (assignmentResult.error) throw assignmentResult.error
  if (vehicleResult.error) throw vehicleResult.error
  const assignment = assignmentResult.data
  const vehicle = vehicleResult.data
  if (!assignment) throw new Error('Delivery assignment not found')
  if (!vehicle) throw new Error('Vehicle not found')
  if (!['assigned','accepted','picked_up','out_for_delivery'].includes(String(assignment.status))) throw new Error('Only active delivery assignments can be linked to a vehicle')
  if (vehicle.status !== 'active') throw new Error('Only active vehicles can be assigned to a delivery')
  if (!assignment.assigned_staff_id) throw new Error('Assign an active driver to the delivery before choosing a vehicle')
  const driverResult = await service.from('staff').select('id,full_name,role,branch,is_active').eq('id',assignment.assigned_staff_id).maybeSingle()
  if (driverResult.error) throw driverResult.error
  const driver = driverResult.data as Staff | null
  if (!driver?.is_active || !['driver','delivery'].includes(driver.role)) throw new Error('Delivery assignment is not linked to an active driver')
  if (branchName(driver.branch) !== branchName(vehicle.branch)) throw new Response(JSON.stringify({error:'Vehicle branch must match the assigned driver branch'}),{status:403})
  const occupied = await service.from('delivery_assignments').select('id,shipment_id').eq('vehicle_id',vehicleId).in('status',['assigned','accepted','picked_up','out_for_delivery']).neq('id',assignmentId).limit(1).maybeSingle()
  if (occupied.error) throw occupied.error
  if (occupied.data) throw new Error('This vehicle is already linked to another active delivery')
  const result = await service.from('delivery_assignments').update({vehicle_id:vehicleId,updated_at:new Date().toISOString()})
    .eq('id',assignmentId).in('status',['assigned','accepted','picked_up','out_for_delivery'])
    .select('id,shipment_id,assigned_staff_id,status,vehicle_id').maybeSingle()
  if (result.error) throw result.error
  if (!result.data) throw new Error('Delivery assignment changed; refresh and retry')
  const auditLogged = await audit(service,staff,'fleet_vehicle_assigned_to_delivery',assignmentId,{vehicle_id:vehicleId,vehicle_code:vehicle.vehicle_code,plate_number:vehicle.plate_number,shipment_id:assignment.shipment_id,driver_id:driver.id})
  return {item:result.data,driver_name:driver.full_name,audit_logged:auditLogged}
}

const attendanceWrite = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  const action = requiredText(data.action,'action',20).toLowerCase()
  const now = new Date()
  const localWorkDate = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
  let result
  if (action === 'check_in') {
    result = await service.from('hr_attendance_records').insert({staff_id:staff.id,work_date:localWorkDate,check_in_at:now.toISOString(),check_in_source:'app'}).select('*').single()
  } else if (action === 'check_out') {
    result = await service.from('hr_attendance_records').update({check_out_at:now.toISOString(),check_out_source:'app'}).eq('staff_id',staff.id).is('check_out_at',null).select('*').maybeSingle()
    if (!result.error && !result.data) throw new Error('No open attendance session exists')
  } else throw new Error('Unsupported attendance action')
  if (result.error) throw result.error
  const auditLogged = await audit(service,staff,'hr_attendance_'+action,result.data.id,{work_date:localWorkDate})
  return {item:result.data,audit_logged:auditLogged}
}
const leaveWrite = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  const leaveType = requiredText(data.leave_type,'leave_type',30)
  const start = requiredText(data.starts_on,'starts_on',20)
  const end = requiredText(data.ends_on,'ends_on',20)
  if (!['annual','sick','unpaid','emergency','other'].includes(leaveType)) throw new Error('Unsupported leave type')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) throw new Error('Valid leave date range is required')
  const result = await service.from('hr_leave_requests').insert({staff_id:staff.id,leave_type:leaveType,starts_on:start,ends_on:end,reason:text(data.reason,1000),status:'pending'}).select('*').single()
  if (result.error) throw result.error
  const auditLogged = await audit(service,staff,'hr_leave_requested',result.data.id,{leave_type:leaveType,starts_on:start,ends_on:end})
  return {item:result.data,audit_logged:auditLogged}
}
const reviewLeave = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff,ADMIN_ROLES)
  const id = requiredText(data.request_id,'request_id',80)
  const status = requiredText(data.status,'status',20)
  if (!['approved','rejected'].includes(status)) throw new Error('Leave status must be approved or rejected')
  const result = await service.from('hr_leave_requests').update({status,reviewed_by:staff.id,reviewed_at:new Date().toISOString(),review_note:text(data.review_note,1000)}).eq('id',id).eq('status','pending').select('*').maybeSingle()
  if (result.error) throw result.error
  if (!result.data) throw new Error('Pending leave request not found')
  const auditLogged = await audit(service,staff,'hr_leave_'+status,id,{staff_id:result.data.staff_id})
  return {item:result.data,audit_logged:auditLogged}
}
const maintenanceWrite = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff,OPS_ROLES)
  const vehicleId = await vehicleIdInScope(service,staff,data.vehicle_id)
  const type = requiredText(data.maintenance_type,'maintenance_type',30)
  if (!['scheduled','repair','inspection','tyres','oil','other'].includes(type)) throw new Error('Unsupported maintenance type')
  const costCurrency = text(data.cost_currency,8) || 'IQD'
  if (!CURRENCIES.includes(costCurrency)) throw new Error('Unsupported currency')
  const payload = {vehicle_id:vehicleId,maintenance_type:type,status:text(data.status,20)||'planned',description:requiredText(data.description,'description',1000),provider_name:text(data.provider_name,200),scheduled_at:text(data.scheduled_at,64),completed_at:text(data.completed_at,64),odometer_km:numberValue(data.odometer_km,'odometer_km',0,true),cost_amount:numberValue(data.cost_amount ?? 0,'cost_amount',0),cost_currency,invoice_reference:text(data.invoice_reference,120),notes:text(data.notes,1000),created_by:staff.id,updated_by:staff.id}
  if (!['planned','in_progress','completed','cancelled'].includes(payload.status)) throw new Error('Unsupported maintenance status')
  const result = await service.from('fleet_maintenance_records').insert(payload).select('*').single()
  if (result.error) throw result.error
  const auditLogged=await audit(service,staff,'fleet_maintenance_created',result.data.id,{vehicle_id:vehicleId,cost_amount:payload.cost_amount,cost_currency:costCurrency})
  return {item:result.data,audit_logged:auditLogged}
}
const fuelWrite = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff,['admin','super_admin','operations','accountant','finance'])
  const vehicleId = await vehicleIdInScope(service,staff,data.vehicle_id)
  const currency = text(data.currency,8) || 'IQD'
  if (!CURRENCIES.includes(currency)) throw new Error('Unsupported currency')
  const payload = {vehicle_id:vehicleId,logged_at:text(data.logged_at,64)||new Date().toISOString(),liters:numberValue(data.liters,'liters',0.001),amount:numberValue(data.amount,'amount',0),currency,odometer_km:numberValue(data.odometer_km,'odometer_km',0,true),station_name:text(data.station_name,200),receipt_reference:text(data.receipt_reference,120),note:text(data.note,1000),recorded_by:staff.id}
  const result=await service.from('fleet_fuel_logs').insert(payload).select('*').single()
  if(result.error) throw result.error
  const auditLogged=await audit(service,staff,'fleet_fuel_recorded',result.data.id,{vehicle_id:vehicleId,amount:payload.amount,currency})
  return {item:result.data,audit_logged:auditLogged}
}
const vehicleEventWrite = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  const eventType = requiredText(data.event_type,'event_type',30)
  if (!EVENT_TYPES.includes(eventType)) throw new Error('Unsupported event type')
  const vehicleId = await vehicleIdInScope(service,staff,data.vehicle_id)
  const driverSelf = ['driver','delivery'].includes(staff.role)
  let assignmentId = text(data.delivery_assignment_id,80)
  let shipmentId = text(data.shipment_id,128)
  if (driverSelf) {
    if (eventType !== 'location_ping' || !assignmentId) throw new Response(JSON.stringify({error:'Drivers may only submit GPS pings for an assigned delivery'}),{status:403})
    const assignment = await service.from('delivery_assignments').select('id,vehicle_id,shipment_id,assigned_staff_id,status').eq('id',assignmentId).eq('assigned_staff_id',staff.id).maybeSingle()
    if (assignment.error) throw assignment.error
    if (!assignment.data || assignment.data.vehicle_id !== vehicleId || ['delivered','completed','cancelled','returned'].includes(String(assignment.data.status).toLowerCase())) throw new Response(JSON.stringify({error:'Vehicle is not assigned to an active delivery for this driver'}),{status:403})
    shipmentId = assignment.data.shipment_id
  } else requireRole(staff,OPS_ROLES)
  const lat = numberValue(data.latitude,'latitude',-90,true)
  const lng = numberValue(data.longitude,'longitude',-180,true)
  if ((lat === null) !== (lng === null) || (lat !== null && (lat < -90 || lat > 90)) || (lng !== null && (lng < -180 || lng > 180))) throw new Error('Valid latitude/longitude pair is required')
  if (driverSelf && (lat === null || lng === null)) throw new Error('GPS coordinates are required for driver pings')
  const result=await service.from('fleet_vehicle_events').insert({vehicle_id:vehicleId,event_type:eventType,event_at:new Date().toISOString(),driver_staff_id:driverSelf?staff.id:(text(data.driver_staff_id,80)),delivery_assignment_id:assignmentId,shipment_id:shipmentId,latitude:lat,longitude:lng,odometer_km:numberValue(data.odometer_km,'odometer_km',0,true),note:text(data.note,1000),metadata:{},created_by:staff.id}).select('*').single()
  if(result.error) throw result.error
  const auditLogged=await audit(service,staff,'fleet_vehicle_event_'+eventType,result.data.id,{vehicle_id:vehicleId,shipment_id:shipmentId})
  return {item:result.data,audit_logged:auditLogged}
}
const payrollWrite = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff,ADMIN_ROLES)
  const periodId = requiredText(data.payroll_period_id,'payroll_period_id',80)
  const employeeId = requiredText(data.staff_id,'staff_id',80)
  const period=await service.from('hr_payroll_periods').select('id,status').eq('id',periodId).maybeSingle()
  if(period.error) throw period.error
  if(!period.data || period.data.status!=='draft') throw new Error('Payroll entries can only be changed while period is draft')
  const employee=await service.from('staff').select('id,branch,is_active').eq('id',employeeId).maybeSingle()
  if(employee.error) throw employee.error
  if(!employee.data || !employee.data.is_active) throw new Error('Active staff record not found')
  if(!ADMIN_ROLES.includes(staff.role)) requireBranch(staff,employee.data.branch)
  const currency=text(data.currency,8)||'IQD'
  if(!CURRENCIES.includes(currency)) throw new Error('Unsupported currency')
  const payload={payroll_period_id:periodId,staff_id:employeeId,base_salary:numberValue(data.base_salary,'base_salary',0),allowances:numberValue(data.allowances??0,'allowances',0),deductions:numberValue(data.deductions??0,'deductions',0),currency,payment_reference:text(data.payment_reference,160),note:text(data.note,1000),created_by:staff.id}
  if(payload.deductions>payload.base_salary+payload.allowances) throw new Error('Deductions cannot exceed gross pay')
  const result=await service.from('hr_payroll_entries').upsert(payload,{onConflict:'payroll_period_id,staff_id'}).select('*').single()
  if(result.error) throw result.error
  const auditLogged=await audit(service,staff,'hr_payroll_entry_upserted',result.data.id,{payroll_period_id:periodId,staff_id:employeeId,net_pay:result.data.net_pay,currency})
  return {item:result.data,audit_logged:auditLogged}
}
const setPayrollPeriodStatus = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff,ADMIN_ROLES)
  const id=requiredText(data.period_id,'period_id',80)
  const status=requiredText(data.status,'status',20)
  if(!['approved','paid','closed'].includes(status)) throw new Error('Unsupported payroll period transition')
  const current=await service.from('hr_payroll_periods').select('id,status,approved_at,paid_at').eq('id',id).maybeSingle()
  if(current.error) throw current.error
  if(!current.data) throw new Error('Payroll period not found')
  const transitions: Record<string,string[]>={draft:['approved'],approved:['paid'],paid:['closed'],closed:[]}
  if(!transitions[current.data.status]?.includes(status)) throw new Error('Invalid payroll period transition')
  const now=new Date().toISOString()
  const changes: Json={status,updated_at:now}
  if(status==='approved'){changes.approved_by=staff.id;changes.approved_at=now}
  if(status==='paid') changes.paid_at=now
  const result=await service.from('hr_payroll_periods').update(changes).eq('id',id).eq('status',current.data.status).select('*').maybeSingle()
  if(result.error) throw result.error
  if(!result.data) throw new Error('Payroll period changed concurrently; refresh and retry')
  const auditLogged=await audit(service,staff,'hr_payroll_period_'+status,id,{from:current.data.status,to:status})
  return {item:result.data,audit_logged:auditLogged}
}
const payrollPeriodCreate = async (service: ReturnType<typeof serviceClient>, staff: Staff, data: Json) => {
  requireRole(staff,ADMIN_ROLES)
  const start=requiredText(data.period_start,'period_start',20)
  const end=requiredText(data.period_end,'period_end',20)
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<start) throw new Error('Valid payroll period dates are required')
  const result=await service.from('hr_payroll_periods').insert({period_start:start,period_end:end,status:'draft',notes:text(data.notes,1000),created_by:staff.id}).select('*').single()
  if(result.error) throw result.error
  const auditLogged=await audit(service,staff,'hr_payroll_period_created',result.data.id,{period_start:start,period_end:end})
  return {item:result.data,audit_logged:auditLogged}
}

Deno.serve(async (req: Request) => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors(req)})
  try {
    const {service,staff}=await authenticate(req)
    if(req.method==='GET') return json(req,await list(service,staff,new URL(req.url)))
    if(req.method!=='POST') return json(req,{error:'Method not allowed'},405)
    const body=await req.json().catch(()=>({})) as Json
    const data=(body.data && typeof body.data==='object')?body.data as Json:body
    const action=requiredText(body.action,'action',80)
    let result: unknown
    if(action==='create_vehicle') result=await vehicleWrite(service,staff,data,false)
    else if(action==='update_vehicle') result=await vehicleWrite(service,staff,data,true)
    else if(action==='record_vehicle_event') result=await vehicleEventWrite(service,staff,data)
    else if(action==='assign_vehicle_to_delivery') result=await assignVehicleToDelivery(service,staff,data)
    else if(action==='create_maintenance') result=await maintenanceWrite(service,staff,data)
    else if(action==='record_fuel') result=await fuelWrite(service,staff,data)
    else if(action==='attendance') result=await attendanceWrite(service,staff,data)
    else if(action==='request_leave') result=await leaveWrite(service,staff,data)
    else if(action==='review_leave') result=await reviewLeave(service,staff,data)
    else if(action==='create_payroll_period') result=await payrollPeriodCreate(service,staff,data)
    else if(action==='upsert_payroll_entry') result=await payrollWrite(service,staff,data)
    else if(action==='set_payroll_period_status') result=await setPayrollPeriodStatus(service,staff,data)
    else return json(req,{error:'Unsupported action'},400)
    return json(req,{item:result})
  } catch(error) {
    if(error instanceof Response) return error.headers.has('Access-Control-Allow-Origin') ? error : new Response(error.body,{status:error.status,headers:cors(req)})
    const message=error instanceof Error?error.message:'Unexpected server error'
    console.error('fleet-hr-admin error',message)
    const forbidden = /not authorized|branch access denied/i.test(message)
    return json(req,{error:message},forbidden?403:400)
  }
})
