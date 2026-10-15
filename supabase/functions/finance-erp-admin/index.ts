import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>
type Staff = { id: string; full_name: string | null; role: string; branch: string | null; is_active: boolean }
const ORIGINS = new Set(['https://globall-cloud.pages.dev'])
const FINANCE_ROLES = ['admin','super_admin','accountant','finance']
const ADMIN_ROLES = ['admin','super_admin']
const cors = (req: Request) => {
  const origin=req.headers.get('origin')||''
  return {
    'Content-Type':'application/json; charset=utf-8',
    'Access-Control-Allow-Origin':ORIGINS.has(origin)?origin:'https://globall-cloud.pages.dev',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin',
  }
}
const json=(req:Request,body:Json,status=200)=>new Response(JSON.stringify(body),{status,headers:cors(req)})
const text=(v:unknown,max=500)=>{if(v===null||v===undefined)return null;const s=String(v).trim();return s?s.slice(0,max):null}
const requiredText=(v:unknown,key:string,max=200)=>{const s=text(v,max);if(!s)throw new Error(key+' is required');return s}
const amount=(v:unknown,key:string,min=0)=>{const n=Number(v);if(!Number.isFinite(n)||n<min)throw new Error(key+' must be a number >= '+min);return Math.round((n+Number.EPSILON)*100)/100}
const dateString=(v:unknown,key:string)=>{const s=requiredText(v,key,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s+'T00:00:00Z')))throw new Error(key+' must be YYYY-MM-DD');return s}
const branchName=(v:unknown)=>{const s=String(v||'').trim().toLowerCase();if(s==='uae')return 'dubai';if(['china','dubai','erbil','all'].includes(s))return s;return ''}
const serviceClient=()=>{
  const url=Deno.env.get('SUPABASE_URL')
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')
  if(!url||!key)throw new Error('Server-side Supabase credentials are not configured')
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
}
const authenticate=async(req:Request)=>{
  const url=Deno.env.get('SUPABASE_URL')
  const key=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const authorization=req.headers.get('authorization')||''
  if(!url||!key||!authorization.toLowerCase().startsWith('bearer '))throw new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors(req)})
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:authorization}}})
  const user=await client.auth.getUser()
  if(user.error||!user.data.user)throw new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors(req)})
  const service=serviceClient()
  const result=await service.from('staff').select('id,full_name,role,branch,is_active').eq('id',user.data.user.id).maybeSingle()
  if(result.error)throw result.error
  if(!result.data?.is_active||!FINANCE_ROLES.includes(result.data.role))throw new Response(JSON.stringify({error:'Active finance staff account required'}),{status:403,headers:cors(req)})
  return {service,staff:result.data as Staff}
}
const requireRole=(staff:Staff,roles:string[])=>{if(!roles.includes(staff.role))throw new Response(JSON.stringify({error:'Role is not authorized for this action'}),{status:403})}
const assertBranch=(staff:Staff,requested:unknown)=>{
  const branch=branchName(requested)
  if(!['china','dubai','erbil'].includes(branch))throw new Error('Valid branch is required')
  const scope=branchName(staff.branch)
  if(!ADMIN_ROLES.includes(staff.role)&&scope!=='all'&&scope!==branch)throw new Response(JSON.stringify({error:'Finance branch access denied'}),{status:403})
  return branch
}
const audit=async(service:ReturnType<typeof serviceClient>,staff:Staff,action:string,target:string,details:Json={})=>{
  const result=await service.from('staff_activity_log').insert({staff_id:staff.id,staff_name:staff.full_name,action,target_id:target,details})
  if(result.error)throw new Error('Finance change was saved, but the audit record could not be written. Contact an administrator before retrying.')
}
const page=(url:URL)=>{
  const limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit')||40)))
  const offset=Math.max(0,Number(url.searchParams.get('offset')||0))
  return {limit,offset}
}
const list=async(service:ReturnType<typeof serviceClient>,staff:Staff,url:URL)=>{
  const kind=url.searchParams.get('kind')||'summary'
  const {limit,offset}=page(url)
  if(kind==='accounts'){
    const result=await service.from('finance_accounts').select('*').order('account_code',{ascending:true})
    if(result.error)throw result.error
    return {kind,items:result.data||[]}
  }
  if(kind==='periods'){
    const result=await service.from('finance_periods').select('*').order('starts_on',{ascending:false}).range(offset,offset+limit-1)
    if(result.error)throw result.error
    return {kind,items:result.data||[],offset,limit}
  }
  if(kind==='journals'){
    let query=service.from('finance_journal_entries').select('*,finance_journal_lines(id,line_number,account_id,memo,debit_iqd,credit_iqd,transaction_currency,transaction_amount,exchange_rate_to_iqd,account:finance_accounts(account_code,name_en,name_ckb,account_type))').order('entry_date',{ascending:false}).order('created_at',{ascending:false})
    const scope=branchName(staff.branch)
    if(!ADMIN_ROLES.includes(staff.role)&&scope!=='all')query=query.eq('branch',scope)
    const filterStatus=text(url.searchParams.get('status'),20)
    if(filterStatus&&['draft','posted','reversed'].includes(filterStatus))query=query.eq('status',filterStatus)
    const from=text(url.searchParams.get('from'),10),to=text(url.searchParams.get('to'),10)
    if(from)query=query.gte('entry_date',dateString(from,'from'))
    if(to)query=query.lte('entry_date',dateString(to,'to'))
    const result=await query.range(offset,offset+limit-1)
    if(result.error)throw result.error
    return {kind,items:result.data||[],offset,limit}
  }
  if(kind==='report'||kind==='summary'){
    const now=new Date()
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
    const from=dateString(url.searchParams.get('from')||today.slice(0,8)+'01','from')
    const to=dateString(url.searchParams.get('to')||today,'to')
    if(to<from)throw new Error('Report end date must be on or after start date')
    const requested=text(url.searchParams.get('branch'),20)
    const branch=requested?assertBranch(staff,requested):null
    const result=await service.rpc('gc_finance_report',{p_actor_id:staff.id,p_from_date:from,p_to_date:to,p_branch:branch})
    if(result.error)throw result.error
    return {kind,report:result.data}
  }
  throw new Response(JSON.stringify({error:'Unsupported list kind'}),{status:400})
}
const createAccount=async(service:ReturnType<typeof serviceClient>,staff:Staff,data:Json)=>{
  requireRole(staff,ADMIN_ROLES)
  const code=requiredText(data.account_code,'account_code',8)
  if(!/^\d{3,8}$/.test(code))throw new Error('Account code must contain 3–8 digits')
  const type=requiredText(data.account_type,'account_type',20)
  if(!['asset','liability','equity','revenue','expense'].includes(type))throw new Error('Unsupported account type')
  const cash=data.is_cash_account===true||data.is_cash_account==='true'||data.is_cash_account===1||data.is_cash_account==='1'
  if(cash&&type!=='asset')throw new Error('Cash accounts must use the asset category')
  const parent=text(data.parent_account_id,80)
  if(parent){
    const check=await service.from('finance_accounts').select('id,is_active').eq('id',parent).maybeSingle()
    if(check.error)throw check.error
    if(!check.data?.is_active)throw new Error('Parent account is unavailable')
  }
  const result=await service.from('finance_accounts').insert({
    account_code:code,name_en:requiredText(data.name_en,'name_en',150),name_ckb:requiredText(data.name_ckb,'name_ckb',150),
    account_type:type,parent_account_id:parent,is_cash_account:cash,is_system:false,is_active:true,created_by:staff.id
  }).select('*').single()
  if(result.error)throw result.error
  await audit(service,staff,'finance_account_created',result.data.id,{account_code:code,account_type:type})
  return {item:result.data}
}
const createPeriod=async(service:ReturnType<typeof serviceClient>,staff:Staff,data:Json)=>{
  requireRole(staff,ADMIN_ROLES)
  const result=await service.rpc('gc_finance_create_period',{
    p_actor_id:staff.id,p_period_name:requiredText(data.period_name,'period_name',40),
    p_starts_on:dateString(data.starts_on,'starts_on'),p_ends_on:dateString(data.ends_on,'ends_on'),p_note:text(data.note,1000)
  })
  if(result.error)throw result.error
  return {item:result.data}
}
const closePeriod=async(service:ReturnType<typeof serviceClient>,staff:Staff,data:Json)=>{
  requireRole(staff,ADMIN_ROLES)
  const result=await service.rpc('gc_finance_close_period',{p_actor_id:staff.id,p_period_id:requiredText(data.period_id,'period_id',80)})
  if(result.error)throw result.error
  return {item:result.data}
}
const createJournal=async(service:ReturnType<typeof serviceClient>,staff:Staff,data:Json)=>{
  const branch=assertBranch(staff,data.branch)
  const sourceType=text(data.source_type,30)||'manual'
  const lines=data.lines
  if(!Array.isArray(lines)||lines.length<2||lines.length>100)throw new Error('Journal requires between 2 and 100 lines')
  const cleanLines=lines.map((line:unknown,i:number)=>{
    if(!line||typeof line!=='object')throw new Error('Invalid journal line '+(i+1))
    const item=line as Json
    return {
      account_id:requiredText(item.account_id,'account_id',80),
      debit_iqd:amount(item.debit_iqd??0,'debit_iqd'),
      credit_iqd:amount(item.credit_iqd??0,'credit_iqd'),
      memo:text(item.memo,500),
      transaction_currency:text(item.transaction_currency,4)||'IQD',
      transaction_amount:item.transaction_amount===null||item.transaction_amount===undefined||item.transaction_amount===''?null:Number(item.transaction_amount),
      exchange_rate_to_iqd:item.exchange_rate_to_iqd===null||item.exchange_rate_to_iqd===undefined||item.exchange_rate_to_iqd===''?null:Number(item.exchange_rate_to_iqd)
    }
  })
  const totalDebit=cleanLines.reduce((sum: number,line:Json)=>sum+Number(line.debit_iqd||0),0)
  const totalCredit=cleanLines.reduce((sum: number,line:Json)=>sum+Number(line.credit_iqd||0),0)
  if(totalDebit<=0||Math.round(totalDebit*100)!==Math.round(totalCredit*100))throw new Error('Total debit and credit must balance in IQD')
  const result=await service.rpc('gc_finance_create_journal',{
    p_actor_id:staff.id,p_entry_date:dateString(data.entry_date,'entry_date'),p_branch:branch,
    p_description:requiredText(data.description,'description',1000),p_lines:cleanLines,p_reference:text(data.reference,160),
    p_source_type:sourceType,p_source_id:text(data.source_id,160),p_post:data.post!==false
  })
  if(result.error)throw result.error
  // The database RPC writes the audit row in the same transaction as the journal.
  return {item:result.data}
}
const postJournal=async(service:ReturnType<typeof serviceClient>,staff:Staff,data:Json)=>{
  const id=requiredText(data.journal_id,'journal_id',80)
  const query=await service.from('finance_journal_entries').select('id,branch,status').eq('id',id).maybeSingle()
  if(query.error)throw query.error
  if(!query.data)throw new Error('Journal not found')
  assertBranch(staff,query.data.branch)
  const result=await service.rpc('gc_finance_post_journal',{p_actor_id:staff.id,p_journal_id:id})
  if(result.error)throw result.error
  return {item:result.data}
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)})
  try{
    const {service,staff}=await authenticate(req)
    if(req.method==='GET')return json(req,await list(service,staff,new URL(req.url)))
    if(req.method!=='POST')return json(req,{error:'Method not allowed'},405)
    const body=await req.json().catch(()=>({})) as Json
    const data=(body.data&&typeof body.data==='object')?body.data as Json:body
    const action=requiredText(body.action,'action',80)
    let result:unknown
    if(action==='create_account')result=await createAccount(service,staff,data)
    else if(action==='create_period')result=await createPeriod(service,staff,data)
    else if(action==='close_period')result=await closePeriod(service,staff,data)
    else if(action==='create_journal')result=await createJournal(service,staff,data)
    else if(action==='post_journal')result=await postJournal(service,staff,data)
    else return json(req,{error:'Unsupported action'},400)
    return json(req,{item:result})
  }catch(error){
    if(error instanceof Response)return new Response(error.body,{status:error.status,headers:cors(req)})
    const message=error instanceof Error?error.message:'Unexpected finance error'
    console.error('finance-erp-admin error',message)
    const forbidden=/not authorized|branch access denied|administrator role required|active finance role is required/i.test(message)
    return json(req,{error:message},forbidden?403:400)
  }
})
