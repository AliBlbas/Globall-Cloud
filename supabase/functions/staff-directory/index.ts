import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGINS = new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const STAFF_ROLES = new Set(['staff','admin','super_admin','accountant','finance','operations','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','driver','delivery'])
const STAFF_BRANCHES = new Set(['all','erbil','china','dubai','uae','usa','warehouse'])

function headers(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY',
    ...(ORIGINS.has(origin) ? {'Access-Control-Allow-Origin':origin} : {}),
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Vary':'Origin',
  }
}
function json(req: Request, body: unknown, status = 200) { return new Response(JSON.stringify(body), {status,headers:headers(req)}) }
function text(v: unknown, max = 500) { const s = String(v ?? '').trim(); return s ? s.slice(0,max) : '' }
function email(v: unknown) { const s = text(v,160).toLowerCase(); return /^\S+@\S+\.\S+$/.test(s) ? s : '' }

async function getActor(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !anon || !service) throw new Error('Server configuration is incomplete')
  const authorization = req.headers.get('authorization') || ''
  if (!authorization.toLowerCase().startsWith('bearer ')) throw new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:headers(req)})
  const authClient = createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:authorization}}})
  const {data:userData,error:userError}=await authClient.auth.getUser()
  if (userError||!userData.user) throw new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:headers(req)})
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const {data:staff,error}=await db.from('staff').select('id,full_name,email,role,branch,is_active,created_at,updated_at').eq('id',userData.user.id).maybeSingle()
  if(error) throw error
  if(!staff?.is_active||!['admin','super_admin'].includes(String(staff.role||''))) throw new Response(JSON.stringify({error:'Staff admin access required'}),{status:403,headers:headers(req)})
  return {db,user:userData.user,staff,isSuperAdmin:String(staff.role)==='super_admin'}
}

function safeRows<T>(rows:T[]|null|undefined){return rows??[]}

async function listDirectory(db: ReturnType<typeof createClient>, actorId: string) {
  const {data,error}=await db.rpc('get_staff_directory_v2',{p_actor_id:actorId})
  if(error) throw error
  return safeRows(data as any[])
}

async function detail(db:ReturnType<typeof createClient>,id:string){
  const {data:staff,error}=await db.from('staff').select('id,full_name,email,role,branch,is_active,created_at,updated_at').eq('id',id).maybeSingle()
  if(error) throw error
  if(!staff) throw new Response(JSON.stringify({error:'Staff member not found'}),{status:404,headers:{'Content-Type':'application/json'}})
  const [authResult,shipmentsResult,tasksResult,customersResult,logsResult]=await Promise.all([
    db.auth.admin.getUserById(id),
    db.from('shipments').select('id,created_at,customer_name,origin_key,dest_key,branch,current_step_index,step_dates,eta,total_amount,paid_amount,weight_kg,type').eq('assigned_staff_id',id).order('created_at',{ascending:false}).limit(100),
    db.from('staff_tasks').select('id,title,description,status,priority,branch,entity_type,entity_id,due_at,blocked_reason,completed_at,created_at,updated_at').eq('assignee_id',id).order('due_at',{ascending:true,nullsFirst:false}).order('created_at',{ascending:false}).limit(100),
    db.from('customer_directory').select('id,code,gc_code,name,phone,city,is_active,updated_at').eq('manager_staff_id',id).order('updated_at',{ascending:false}).limit(100),
    db.from('staff_activity_log').select('id,action,target_id,details,created_at,staff_name').eq('staff_id',id).order('created_at',{ascending:false}).limit(100),
  ])
  const shipmentRows=safeRows(shipmentsResult.data),taskRows=safeRows(tasksResult.data),customerRows=safeRows(customersResult.data),logRows=safeRows(logsResult.data)
  const openTasks=taskRows.filter((task:any)=>String(task.status||'').toLowerCase()!=='completed')
  const openBalance=shipmentRows.reduce((sum:number,row:any)=>sum+Math.max(0,Number(row.total_amount||0)-Number(row.paid_amount||0)),0)
  return {staff,auth:{email:authResult.data.user?.email||null,last_sign_in_at:authResult.data.user?.last_sign_in_at||null,email_confirmed_at:authResult.data.user?.email_confirmed_at||null,phone:authResult.data.user?.phone||null},stats:{shipment_count:shipmentRows.length,open_task_count:openTasks.length,customer_count:customerRows.length,activity_count:logRows.length,open_balance:Math.round(openBalance*100)/100,last_activity_at:logRows[0]?.created_at||staff.updated_at||staff.created_at||null},shipments:shipmentRows,tasks:taskRows,customers:customerRows,activity:logRows}
}

function validateStaffFields(data:Record<string,unknown>){
  const fullName=text(data.full_name,160)
  const role=text(data.role,40).toLowerCase()
  const branch=text(data.branch,40).toLowerCase() || 'all'
  if(!fullName) throw new Error('full_name is required')
  if(!STAFF_ROLES.has(role)) throw new Error('Unsupported staff role')
  if(!STAFF_BRANCHES.has(branch)) throw new Error('Unsupported staff branch')
  return {fullName,role,branch}
}

async function createStaff(actor:any, data:Record<string,unknown>) {
  if(!actor.isSuperAdmin) throw new Response(JSON.stringify({error:'Super admin permission required'}),{status:403,headers:headers(new Request('https://globall-cloud.pages.dev'))})
  const accountEmail=email(data.email)
  if(!accountEmail) throw new Error('A valid email is required')
  const {fullName,role,branch}=validateStaffFields(data)
  const password=text(data.password,160)
  const finalPassword=password || `GC!${crypto.randomUUID().replace(/-/g,'')}`
  if(finalPassword.length<12) throw new Error('Password must be at least 12 characters')
  const authResult=await actor.db.auth.admin.createUser({email:accountEmail,password:finalPassword,email_confirm:true,phone:text(data.phone,40)||undefined,user_metadata:{full_name:fullName,role,branch}})
  if(authResult.error||!authResult.data.user) throw authResult.error||new Error('Could not create auth user')
  try{
    const inserted=await actor.db.from('staff').insert({id:authResult.data.user.id,full_name:fullName,email:accountEmail,role,branch,is_active:true}).select('id,full_name,email,role,branch,is_active,created_at,updated_at').single()
    if(inserted.error) throw inserted.error
    await actor.db.from('staff_activity_log').insert({staff_id:actor.staff.id,staff_name:actor.staff.full_name||actor.staff.email,action:'create_staff',target_id:authResult.data.user.id,details:{email:accountEmail,role,branch}})
    return {staff:inserted.data,temporary_password:password?null:finalPassword}
  }catch(error){
    await actor.db.auth.admin.deleteUser(authResult.data.user.id).catch(()=>undefined)
    throw error
  }
}

async function updateStaff(actor:any,data:Record<string,unknown>){
  if(!actor.isSuperAdmin) throw new Response(JSON.stringify({error:'Super admin permission required'}),{status:403,headers:headers(new Request('https://globall-cloud.pages.dev'))})
  const staffId=text(data.staff_id,80)
  if(!staffId) throw new Error('staff_id is required')
  const current=await actor.db.from('staff').select('id,full_name,email,role,branch,is_active').eq('id',staffId).maybeSingle()
  if(current.error) throw current.error
  if(!current.data) throw new Error('Staff member not found')
  const {fullName,role,branch}=validateStaffFields(data)
  const isActive=data.is_active===undefined ? Boolean(current.data.is_active) : Boolean(data.is_active)
  if(staffId===actor.staff.id && (!isActive || role!=='super_admin')) throw new Error('You cannot deactivate or demote your own super admin account')
  const nextEmail=data.email===undefined ? String(current.data.email||'').toLowerCase() : email(data.email)
  if(!nextEmail) throw new Error('A valid email is required')
  const authPatch:any={email:nextEmail,email_confirm:true,user_metadata:{full_name:fullName,role,branch}}
  const phone=data.phone===undefined ? undefined : text(data.phone,40)
  if(phone!==undefined) authPatch.phone=phone||undefined
  const authResult=await actor.db.auth.admin.updateUserById(staffId,authPatch)
  if(authResult.error) throw authResult.error
  const update=await actor.db.from('staff').update({full_name:fullName,email:nextEmail,role,branch,is_active:isActive,updated_at:new Date().toISOString()}).eq('id',staffId).select('id,full_name,email,role,branch,is_active,created_at,updated_at').single()
  if(update.error) throw update.error
  await actor.db.from('staff_activity_log').insert({staff_id:actor.staff.id,staff_name:actor.staff.full_name||actor.staff.email,action:'update_staff',target_id:staffId,details:{full_name:fullName,email:nextEmail,role,branch,is_active:isActive}})
  return {staff:update.data}
}

async function resetPassword(actor:any,data:Record<string,unknown>){
  if(!actor.isSuperAdmin) throw new Response(JSON.stringify({error:'Super admin permission required'}),{status:403,headers:headers(new Request('https://globall-cloud.pages.dev'))})
  const staffId=text(data.staff_id,80); const password=text(data.password,160)
  if(!staffId||!password) throw new Error('staff_id and password are required')
  if(password.length<12) throw new Error('Password must be at least 12 characters')
  const result=await actor.db.auth.admin.updateUserById(staffId,{password})
  if(result.error) throw result.error
  await actor.db.from('staff_activity_log').insert({staff_id:actor.staff.id,staff_name:actor.staff.full_name||actor.staff.email,action:'reset_staff_password',target_id:staffId,details:{password_reset:true}})
  return {ok:true}
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{status:204,headers:headers(req)})
  try{
    const actor=await getActor(req)
    if(req.method==='GET'){
      const url=new URL(req.url); const staffId=text(url.searchParams.get('staff_id'),80)
      if(staffId) return json(req,await detail(actor.db,staffId))
      return json(req,{items:await listDirectory(actor.db,actor.staff.id),actor:actor.staff,can_manage:actor.isSuperAdmin})
    }
    if(req.method!=='POST') return json(req,{error:'Method not allowed'},405)
    const body=await req.json().catch(()=>({})) as Record<string,unknown>
    const action=text(body.action,64).toLowerCase(); const data=(body.data&&typeof body.data==='object'?body.data:body) as Record<string,unknown>
    if(action==='create_staff') return json(req,await createStaff(actor,data),201)
    if(action==='update_staff') return json(req,await updateStaff(actor,data))
    if(action==='reset_password') return json(req,await resetPassword(actor,data))
    if(action==='set_active') return json(req,await updateStaff(actor,{...data,is_active:data.is_active}))
    return json(req,{error:'Unsupported action'},400)
  }catch(error){
    if(error instanceof Response) return error
    console.error('staff-directory error',error)
    const message=error instanceof Error?error.message:'Staff directory request failed'
    const status=/permission|required|unsupported|password|email|demote|deactivate/i.test(message)?400:500
    return json(req,{error:message},status)
  }
})
