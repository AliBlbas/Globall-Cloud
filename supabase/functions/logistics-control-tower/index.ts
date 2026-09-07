import { createClient } from 'npm:@supabase/supabase-js@2'

type Staff = { id:string; full_name:string|null; role:string; branch:string|null; is_active:boolean }
const ORIGINS = new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const READ_ROLES = new Set(['super_admin','admin','accountant','finance','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','driver','delivery'])
const GLOBAL_ROLES = new Set(['super_admin','admin','accountant','finance','operations'])
const cors=(req:Request)=>({
  'Access-Control-Allow-Origin':ORIGINS.has(req.headers.get('origin')||'')?req.headers.get('origin')!:'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Cache-Control':'no-store','Vary':'Origin'
})
const json=(req:Request,b:unknown,status=200)=>new Response(JSON.stringify(b),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(req)}})
const text=(v:unknown)=>String(v??'').trim()
const num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0}

async function auth(req:Request){
  const url=Deno.env.get('SUPABASE_URL')||''
  const anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||''
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||''
  const authorization=req.headers.get('Authorization')||''
  if(!url||!anon||!service||!/^Bearer\s+/i.test(authorization)) throw new Error('Unauthorized')
  const authClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:authorization}}})
  const {data,error}=await authClient.auth.getUser(); if(error||!data.user) throw new Error('Unauthorized')
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const {data:staff,error:staffError}=await admin.from('staff').select('id,full_name,role,branch,is_active').eq('id',data.user.id).maybeSingle()
  if(staffError) throw staffError
  if(!staff?.is_active||!READ_ROLES.has(String(staff.role))) throw new Error('Forbidden')
  return {admin,user:data.user,staff:staff as Staff}
}

function scopeShipments(q:any, staff:Staff){
  if(!staff.branch || staff.branch==='all' || GLOBAL_ROLES.has(staff.role)) return q
  return q.or(`branch.eq.${staff.branch},branch.is.null`)
}

const riskFor=(s:any)=>{
  const now=Date.now()
  const eta=s.eta?new Date(s.eta).getTime():null
  const outstanding=Math.max(num(s.total_amount)-num(s.paid_amount),0)
  if(eta && eta<now && num(s.current_step_index)<5) return {code:'ETA_OVERDUE',level:'critical',reason:'ETA تێپەڕیوە و بارەکە هێشتا نەگەیشتووە.'}
  if(outstanding>0 && eta && eta<now+24*60*60*1000) return {code:'PAYMENT_RISK',level:'high',reason:'بڕی ماوەی پارەدان هەیە و ETA لە ٢٤ کاتژمێردایە.'}
  if(num(s.current_step_index)===3 && eta && eta<now+72*60*60*1000) return {code:'CUSTOMS_RISK',level:'high',reason:'بارەکە لە گومرکە و ETA نزیکە.'}
  if(s.tracking_updated_at && new Date(s.tracking_updated_at).getTime()<now-6*60*60*1000 && num(s.current_step_index)>=1 && num(s.current_step_index)<=4) return {code:'STALE_TRACKING',level:'medium',reason:'زیاتر لە ٦ کاتژمێرە هیچ نوێکارییەکی tracking نییە.'}
  return {code:'WATCH',level:'low',reason:'بارەکە لە چاودێرییە.'}
}

async function dashboard(a:{admin:any,staff:Staff}){
  const {admin,staff}=a
  let q=admin.from('shipments').select('id,tracking_number,tracking_id,customer_name,origin_key,dest_key,status,operational_status,current_step_index,eta,total_amount,paid_amount,transport_mode,current_location_label,tracking_updated_at,branch,created_at').is('archived_at',null).order('created_at',{ascending:false}).limit(3000)
  q=scopeShipments(q,staff)
  const {data:shipments,error:shipmentError}=await q
  if(shipmentError) throw shipmentError
  const active=(shipments||[]).filter((s:any)=>!['delivered','cancelled','closed'].includes(String(s.operational_status||s.status||''))&&num(s.current_step_index)<5)
  const risks=active.map((s:any)=>({...s,_risk:riskFor(s),_outstanding:Math.max(num(s.total_amount)-num(s.paid_amount),0)})).filter((s:any)=>s._risk.level!=='low').sort((a:any,b:any)=>({critical:0,high:1,medium:2}[a._risk.level]-({critical:0,high:1,medium:2}[b._risk.level]) || (a.eta?new Date(a.eta).getTime():Infinity)-(b.eta?new Date(b.eta).getTime():Infinity))).slice(0,40)
  const {data:exceptions,error:exceptionError}=await admin.from('logistics_exceptions').select('id,shipment_id,severity,title,note,status,due_at,created_at').in('status',['open','acknowledged']).order('created_at',{ascending:false}).limit(100)
  if(exceptionError) throw exceptionError
  const scopedIds=new Set(active.map((s:any)=>String(s.id)))
  const scopedExceptions=(exceptions||[]).filter((e:any)=>!e.shipment_id || scopedIds.has(String(e.shipment_id)))
  const shipmentMap=new Map((shipments||[]).map((s:any)=>[String(s.id),s]))
  const exceptionRows=scopedExceptions.map((e:any)=>{const s=e.shipment_id?shipmentMap.get(String(e.shipment_id)):null;return {...e,customer_name:s?.customer_name||null,tracking_number:s?.tracking_number||s?.tracking_id||null,location:s?.current_location_label||null,origin_key:s?.origin_key||null,dest_key:s?.dest_key||null}}).sort((a:any,b:any)=>({critical:0,high:1,warning:2,medium:2}[String(a.severity||'medium')]-({critical:0,high:1,warning:2,medium:2}[String(b.severity||'medium')]))).slice(0,40)
  const unverified=await admin.from('shipment_documents').select('id',{count:'exact',head:true}).neq('document_status','verified')
  const queue=await admin.from('notification_outbox').select('id',{count:'exact',head:true}).in('status',['queued','processing','retry'])
  return {ok:true,generated_at:new Date().toISOString(),staff:{id:staff.id,full_name:staff.full_name,role:staff.role,branch:staff.branch||'all'},kpis:{active:active.length,in_transit:active.filter((s:any)=>num(s.current_step_index)>=1&&num(s.current_step_index)<=4).length,overdue:active.filter((s:any)=>s._risk.code==='ETA_OVERDUE').length,payment_risk:active.filter((s:any)=>s._risk.code==='PAYMENT_RISK').length,customs_risk:active.filter((s:any)=>s._risk.code==='CUSTOMS_RISK').length,stale_tracking:active.filter((s:any)=>s._risk.code==='STALE_TRACKING').length,open_exceptions:scopedExceptions.length,unverified_documents:unverified.count||0,notification_queue:queue.count||0},risk_shipments:risks.map((s:any)=>({id:s.id,tracking_number:s.tracking_number||s.tracking_id||null,customer_name:s.customer_name,origin_key:s.origin_key,dest_key:s.dest_key,status:s.operational_status||s.status,current_step_index:s.current_step_index,eta:s.eta,transport_mode:s.transport_mode,current_location_label:s.current_location_label,tracking_updated_at:s.tracking_updated_at,outstanding:s._outstanding,risk_code:s._risk.code,risk_level:s._risk.level,risk_reason:s._risk.reason})),exceptions:exceptionRows}
}

async function updateException(a:{admin:any,staff:Staff},data:any){
  const id=text(data.id),status=text(data.status||'resolved').toLowerCase(),note=text(data.resolution_note)
  if(!id||!['open','acknowledged','resolved','closed'].includes(status)) throw new Error('Invalid exception update')
  const {data:ex,error}=await a.admin.from('logistics_exceptions').select('id,shipment_id,status,severity,title').eq('id',id).maybeSingle(); if(error) throw error
  if(!ex) throw new Error('Exception not found')
  if(ex.shipment_id && a.staff.branch && a.staff.branch!=='all' && !GLOBAL_ROLES.has(a.staff.role)){
    const s=await a.admin.from('shipments').select('branch').eq('id',ex.shipment_id).maybeSingle()
    if(String(s.data?.branch||'') && String(s.data?.branch)!==String(a.staff.branch)) throw new Error('Branch access denied')
  } else if(!ex.shipment_id && !GLOBAL_ROLES.has(a.staff.role)) throw new Error('Global exception requires elevated role')
  const patch:any={status,resolution_note:note||null}
  if(['resolved','closed'].includes(status)){patch.resolved_by=a.staff.id;patch.resolved_at=new Date().toISOString()}else{patch.resolved_by=null;patch.resolved_at=null}
  const {data:updated,error:updateError}=await a.admin.from('logistics_exceptions').update(patch).eq('id',id).select('*').single(); if(updateError) throw updateError
  await a.admin.from('staff_activity_log').insert({staff_id:a.staff.id,staff_name:a.staff.full_name,action:'logistics.exception.update',target_id:ex.shipment_id||id,details:JSON.stringify({exception_id:id,status,resolution_note:note||null})})
  return {ok:true,exception:updated}
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response(null,{headers:cors(req)})
  try{
    const a=await auth(req)
    if(req.method==='POST'){
      const body=await req.json().catch(()=>({}))
      if(text(body.action)==='exception_update') return json(req,await updateException(a,body.data||{}))
      throw new Error('Unsupported action')
    }
    return json(req,await dashboard(a))
  }catch(error){
    const message=error instanceof Error?error.message:String(error)
    const status=/Unauthorized/i.test(message)?401:/Forbidden|denied/i.test(message)?403:/not found|Invalid|Unsupported/i.test(message)?400:500
    return json(req,{error:message},status)
  }
})
