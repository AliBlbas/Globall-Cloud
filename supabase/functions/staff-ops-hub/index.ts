import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>
const ORIGINS = new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const FINANCE_ROLES = new Set(['super_admin','admin','accountant','finance'])
const FINANCE_TYPES = new Set(['income','expense','customer_payment','customer_charge','refund','adjustment'])
const PRICING_ROLES = new Set(['super_admin','admin','accountant','finance'])
const PROFILE_ROLES = new Set(['super_admin','admin','accountant','finance','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','delivery','driver'])
const cors=(req:Request)=>({
  'Access-Control-Allow-Origin':ORIGINS.has(req.headers.get('origin')||'')?req.headers.get('origin')!:'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Cache-Control':'no-store','Vary':'Origin'
})
const json=(req:Request,b:unknown,status=200)=>new Response(JSON.stringify(b),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(req)}})
const txt=(v:unknown)=>{const s=String(v??'').trim();return s||null}
const num=(v:unknown)=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
const gc=(v:unknown)=>{const s=txt(v);if(!s)return null;const n=s.normalize('NFKC').toUpperCase().replace(/[–—−]/g,'-').replace(/\s+/g,'');return /^GC-[A-Z0-9-]{2,30}$/.test(n)?n:null}
async function actor(req:Request){
  const url=Deno.env.get('SUPABASE_URL')||''
  const anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||''
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||''
  const auth=req.headers.get('Authorization')||''
  if(!url||!anon||!service||!/^Bearer\s+/i.test(auth))throw new Error('Unauthorized')
  const authClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:auth}}})
  const {data,error}=await authClient.auth.getUser();if(error||!data.user)throw new Error('Unauthorized')
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const {data:staff,error:staffError}=await admin.from('staff').select('id,full_name,role,branch,is_active,email').eq('id',data.user.id).maybeSingle()
  if(staffError)throw staffError
  if(!staff?.is_active)throw new Error('Forbidden')
  const role=String(staff.role||'')
  if(!PROFILE_ROLES.has(role))throw new Error('Forbidden')
  return {admin,user:data.user,staff,role}
}
async function audit(admin:any,staff:any,action:string,targetId:string|null,details:Json|null=null){
  await admin.from('staff_activity_log').insert({staff_id:staff.id,staff_name:staff.full_name,action,target_id:targetId,details:details?JSON.stringify(details):null})
}
async function profileUpdate(a:any,data:Json){
  const fullName=txt(data.full_name)
  const {data:staff,error:staffErr}=await a.admin.from('staff').update({full_name:fullName||a.staff.full_name,updated_at:new Date().toISOString()}).eq('id',a.staff.id).select('id,full_name,role,branch,is_active,email,updated_at').single()
  if(staffErr)throw staffErr
  const profilePatch:any={}
  for(const k of ['job_title','phone','locale','timezone']){const value=txt(data[k]);if(value!==null)profilePatch[k]=value}
  if(Object.keys(profilePatch).length){profilePatch.updated_at=new Date().toISOString();const r=await a.admin.from('staff_profiles').upsert({staff_id:a.staff.id,...profilePatch},{onConflict:'staff_id'});if(r.error)throw r.error}
  await audit(a.admin,a.staff,'profile.update',a.staff.id,{fields:Object.keys(profilePatch).concat(fullName?'full_name':[])})
  return {staff}
}
async function pricingCreate(a:any,data:Json){
  if(!PRICING_ROLES.has(a.role))throw new Error('Pricing permission required')
  const origin=txt(data.origin_key),destination=txt(data.destination_key),mode=txt(data.transport_mode),product=txt(data.product_type)
  const amount=num(data.amount);const rawUnit=txt(data.unit)||'kg';const unit=rawUnit.toLowerCase()
  if(!origin||!destination||!mode||!product||amount===null||amount<=0)throw new Error('Invalid pricing data')
  if(!['air','sea','land'].includes(mode.toLowerCase())||!['kg','cbm','item'].includes(unit))throw new Error('Unsupported pricing unit or mode')
  const originKey=origin.toLowerCase();const expectedUnit=mode.toLowerCase()==='sea'?'cbm':mode.toLowerCase()==='air'&&['dubai','uae'].includes(originKey)?'item':'kg'
  if(unit!==expectedUnit)throw new Error(`This route must use ${expectedUnit} pricing`)
  const rateKey=txt(data.rate_key)||`${mode}_${origin}_${destination}_${product}`.toLowerCase().replace(/[^a-z0-9]+/g,'_')
  const transitMin=num(data.transit_min_days),transitMax=num(data.transit_max_days)
  if((transitMin!==null&&(!Number.isInteger(transitMin)||transitMin<0))||(transitMax!==null&&(!Number.isInteger(transitMax)||transitMax<(transitMin??0))))throw new Error('Invalid transit days')
  const originLabel=originKey==='dubai'||originKey==='uae'?'Dubai':originKey==='china'?'China':originKey==='usa'?'USA':origin
  const modeLabel=mode.toLowerCase()==='air'?'Air':mode.toLowerCase()==='sea'?'Sea':'Land'
  const payload={origin:originLabel,destination,transport_type:modeLabel,item_category:product,price_usd:amount,estimated_days:transitMax,rate_key:rateKey,origin_key:originKey==='uae'?'dubai':originKey,destination_key:destination.toLowerCase(),transport_mode:mode.toLowerCase(),product_type:product,unit,currency:txt(data.currency)||'USD',amount,transit_min_days:transitMin,transit_max_days:transitMax,effective_from:txt(data.effective_from)||new Date().toISOString().slice(0,10),is_active:data.is_active!==false,notes:txt(data.notes),created_by:a.staff.id,updated_by:a.staff.id}
  const existing=await a.admin.from('pricing_rates').select('id').eq('rate_key',rateKey).limit(1).maybeSingle();if(existing.error)throw existing.error
  const {data:row,error}=existing.data?await a.admin.from('pricing_rates').update({...payload,updated_at:new Date().toISOString()}).eq('id',existing.data.id).select('*').single():await a.admin.from('pricing_rates').insert(payload).select('*').single()
  if(error)throw error
  await audit(a.admin,a.staff,existing.data?'pricing.update':'pricing.create',row.id,{rate_key:rateKey,amount,unit})
  return {rate:row,updated:Boolean(existing.data)}
}
async function financeCreate(a:any,data:Json){
  if(!FINANCE_ROLES.has(a.role))throw new Error('Finance permission required')
  const type=txt(data.type)||'income',amount=num(data.amount_usd)
  if(!FINANCE_TYPES.has(type))throw new Error('Invalid finance type')
  if(amount===null||amount<0)throw new Error('Invalid finance amount')
  const row={type,gc_code:gc(data.gc_code),amount_usd:amount,reference:txt(data.reference),note:txt(data.note),created_at:txt(data.created_at)||new Date().toISOString()}
  const {data:created,error}=await a.admin.from('finance_transactions').insert(row).select('*').single();if(error)throw error
  await audit(a.admin,a.staff,'finance.create',created.id,{type,amount_usd:amount,gc_code:row.gc_code,reference:row.reference,note:row.note})
  return {transaction:created}
}
async function financeUpdate(a:any,data:Json){
  if(!FINANCE_ROLES.has(a.role))throw new Error('Finance permission required')
  const id=txt(data.id),type=txt(data.type)||'income',amount=num(data.amount_usd)
  if(!FINANCE_TYPES.has(type))throw new Error('Invalid finance type')
  if(!id||amount===null||amount<0)throw new Error('Invalid finance data')
  const existing=await a.admin.from('finance_transactions').select('reference,note').eq('id',id).maybeSingle();if(existing.error)throw existing.error;if(!existing.data)throw new Error('Finance transaction not found')
  const patch={type,gc_code:gc(data.gc_code),amount_usd:amount,reference:Object.prototype.hasOwnProperty.call(data,'reference')?txt(data.reference):existing.data.reference,note:Object.prototype.hasOwnProperty.call(data,'note')?txt(data.note):existing.data.note}
  const {data:updated,error}=await a.admin.from('finance_transactions').update(patch).eq('id',id).select('*').single();if(error)throw error
  await audit(a.admin,a.staff,'finance.update',id,{type,amount_usd:amount,reference:txt(data.reference),note:txt(data.note)})
  return {transaction:updated}
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{headers:cors(req)})
  try{
    const a=await actor(req)
    if(req.method==='GET'){
      const u=new URL(req.url);const kind=txt(u.searchParams.get('kind'))||'profile'
      if(kind==='profile'){
        const {data:profile}=await a.admin.from('staff_profiles').select('staff_id,job_title,phone,avatar_key,locale,timezone,notification_preferences,updated_at').eq('staff_id',a.staff.id).maybeSingle()
        return json(req,{profile:{...a.staff,settings:profile||null}})
      }
      if(kind==='finance'){
        if(!FINANCE_ROLES.has(a.role)) return json(req,{error:'Finance permission required'},403)
        const {data:transactions,error}=await a.admin.from('finance_transactions').select('id,type,gc_code,amount_usd,reference,note,created_at,updated_at').order('created_at',{ascending:false}).limit(1000)
        if(error) throw error
        const rows=transactions||[]
        const income=rows.filter((x:any)=>['income','customer_payment','payment'].includes(String(x.type))).reduce((sum:number,x:any)=>sum+Number(x.amount_usd||0),0)
        const expense=rows.filter((x:any)=>['expense','cost'].includes(String(x.type))).reduce((sum:number,x:any)=>sum+Number(x.amount_usd||0),0)
        return json(req,{kind:'finance',transactions:rows,summary:{income,expense,profit:income-expense},period:'all_available_records'})
      }
      return json(req,{ok:true})
    }
    const body=await req.json().catch(()=>({})) as Json
    const action=txt(body.action)
    const data=(body.data||{}) as Json
    if(action==='profile_update')return json(req,await profileUpdate(a,data))
    if(action==='pricing_create')return json(req,await pricingCreate(a,data))
    if(action==='finance_create')return json(req,await financeCreate(a,data))
    if(action==='finance_update')return json(req,await financeUpdate(a,data))
    throw new Error('Unsupported action')
  }catch(e){const m=e instanceof Error?e.message:String(e);const s=/Unauthorized/i.test(m)?401:/Forbidden|permission/i.test(m)?403:/Invalid|required|Unsupported/i.test(m)?400:500;return json(req,{error:m},s)}
})
