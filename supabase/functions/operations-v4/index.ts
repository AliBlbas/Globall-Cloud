import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGINS = new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const STAFF_ROLES = new Set(['super_admin','admin','accountant','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','delivery','finance'])
const WRITE_ROLES = new Set(['super_admin','admin'])
const cors=(req:Request)=>({
 'Access-Control-Allow-Origin':ORIGINS.has(req.headers.get('origin')||'')?req.headers.get('origin')!:'https://globall-cloud.pages.dev',
 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
 'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'
})
const json=(req:Request,b:unknown,status=200)=>new Response(JSON.stringify(b),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(req)}})
const text=(v:unknown)=>v==null?'':String(v).trim()
const gc=(v:unknown)=>{const s=text(v).normalize('NFKC').toUpperCase().replace(/[–—−]/g,'-').replace(/\s+/g,'');return /^GC-[A-Z0-9-]{2,30}$/.test(s)?s:null}
async function actor(req:Request){
 const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
 const auth=req.headers.get('Authorization')||''; if(!/^Bearer\s+/i.test(auth)) throw new Error('Unauthorized')
 const authClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}})
 const {data,error}=await authClient.auth.getUser(); if(error||!data.user) throw new Error('Unauthorized')
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data:staff}=await admin.from('staff').select('id,full_name,role,branch,is_active,email').eq('id',data.user.id).maybeSingle()
 return {admin,user:data.user,staff}
}
async function requireStaff(req:Request,write=false){const a=await actor(req);if(!a.staff?.is_active||!STAFF_ROLES.has(String(a.staff.role)))throw new Error('Staff permission required');if(write&&!WRITE_ROLES.has(String(a.staff.role)))throw new Error('Admin permission required');return a}
async function listShipments(admin:any, gcCode?:string){
 let q=admin.from('shipments').select('id,tracking_id,route,type,status,created_at,customer_name,customer_phone,customer_user_id,directory_customer_id,customer_gc_code,origin_key,dest_key,branch,total_amount,paid_amount,current_step_index,step_dates,eta,items_count,weight_kg,volume_cbm,transport_mode,origin_warehouse,destination_warehouse,cargo_description,carton_count,actual_weight_kg,length_cm,width_cm,height_cm,volumetric_weight_kg,chargeable_weight_kg,updated_at').order('created_at',{ascending:false}).limit(500)
 if(gcCode) q=q.or(`customer_gc_code.eq.${gcCode},tracking_id.eq.${gcCode}`)
 const {data,error}=await q;if(error)throw error;return data||[]
}
async function shipmentDetail(admin:any,id:string){
 const {data:shipment,error}=await admin.from('shipments').select('*').eq('id',id).maybeSingle();if(error)throw error;if(!shipment)throw new Error('Shipment not found')
 const [packages,events,receipts,insurance,ledger]=await Promise.all([
  admin.from('shipment_packages').select('*').eq('shipment_id',id).order('created_at',{ascending:false}),
  admin.from('shipment_tracking_events').select('*').eq('shipment_id',id).order('created_at',{ascending:false}),
  admin.from('warehouse_receipts').select('*').eq('shipment_id',id).order('received_at',{ascending:false}),
  admin.from('shipment_insurance').select('*').eq('shipment_id',id).order('purchased_at',{ascending:false}),
  admin.from('shipment_financial_ledger').select('*').eq('shipment_id',id).order('created_at',{ascending:false})
 ]);return {shipment,packages:packages.data||[],events:events.data||[],receipts:receipts.data||[],insurance:insurance.data||[],ledger:ledger.data||[]}
}
async function customers(admin:any){const {data,error}=await admin.from('customer_directory').select('*').order('created_at',{ascending:false}).limit(2000);if(error)throw error;return data||[]}
async function alerts(admin:any,staffId:string){const {data,error}=await admin.from('staff_alerts').select('*').order('created_at',{ascending:false}).limit(200);if(error)throw error;return (data||[]).filter((x:any)=>!x.audience_role||x.audience_role===String((await admin.from('staff').select('role').eq('id',staffId).maybeSingle()).data?.role)||!x.read_by?.includes(staffId))}
async function pricing(admin:any){const [rates,fx,rules]=await Promise.all([admin.from('pricing_rates').select('*').order('origin_key').order('transport_mode').order('product_type'),admin.from('exchange_rates').select('*').order('created_at',{ascending:false}).limit(20),admin.from('pricing_rules').select('*').order('created_at',{ascending:false})]);if(rates.error)throw rates.error;if(fx.error)throw fx.error;if(rules.error)throw rules.error;return {rates:rates.data||[],exchange_rates:fx.data||[],rules:rules.data||[]}}
async function finance(admin:any){
 const [tx,summary]=await Promise.all([admin.from('finance_transactions').select('*').order('created_at',{ascending:false}).limit(1000),admin.from('v_financial_summary').select('*').limit(1000)]);if(tx.error)throw tx.error;return {transactions:tx.data||[],summary:summary.data||[]}
}
async function chat(req:Request, a:any){
 const isStaff=!!a.staff?.is_active&&STAFF_ROLES.has(String(a.staff.role));
 const url=new URL(req.url);const threadId=url.searchParams.get('thread_id')
 let q=a.admin.from('customer_chat_threads').select('*').order('last_message_at',{ascending:false}).limit(100)
 if(!isStaff)q=q.eq('customer_user_id',a.user.id)
 if(threadId)q=q.eq('id',threadId)
 const {data:threads,error}=await q;if(error)throw error
 const ids=(threads||[]).map((x:any)=>x.id);let messages:any[]=[];if(ids.length){let mq=a.admin.from('customer_chat_messages').select('*').in('thread_id',ids).order('created_at',{ascending:true});const r=await mq;if(r.error)throw r.error;messages=r.data||[]}
 return {threads:threads||[],messages}
}
async function post(req:Request,a:any){
 const body=await req.json();const action=text(body.action);const data=body.data||{};const isStaff=!!a.staff?.is_active&&STAFF_ROLES.has(String(a.staff.role));
 if(['customer_create','customer_update','customer_delete','pricing_update','fx_update','alert_create','shipment_update'].includes(action)&&(!isStaff||!WRITE_ROLES.has(String(a.staff.role))))throw new Error('Admin permission required')
 if(action==='customer_create'){
  const code=gc(data.gc_code||data.code)||`GC-${String(Math.floor(1000+Math.random()*9000))}`;const password=text(data.password)||crypto.randomUUID().slice(0,12)+'Aa!';
  const email=text(data.email)||`${code.toLowerCase()}@globall-cloud.local`;const {data:u,error:ue}=await a.admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:text(data.name),gc_code:code,phone:text(data.phone)}});if(ue)throw ue
  const {data:row,error}=await a.admin.from('customer_directory').insert({code,gc_code:code,normalized_gc_code:code,name:text(data.name)||'Customer',phone:text(data.phone),email,auth_user_id:u.user.id,is_active:true,city:text(data.city),delivery_location:text(data.delivery_location),preferred_language:text(data.preferred_language)||'ckb',preferred_contact_channel:text(data.preferred_contact_channel)||'whatsapp'}).select('*').single();if(error)throw error
  return {customer:row,temporary_password:password}
 }
 if(action==='customer_update'){const id=text(data.id);const patch={name:text(data.name),phone:text(data.phone),phone2:text(data.phone2),email:text(data.email),city:text(data.city),delivery_location:text(data.delivery_location),note:text(data.note),is_active:data.is_active!==false,preferred_language:text(data.preferred_language)||'ckb',preferred_contact_channel:text(data.preferred_contact_channel)||'whatsapp',updated_at:new Date().toISOString()};const {data:row,error}=await a.admin.from('customer_directory').update(patch).eq('id',id).select('*').single();if(error)throw error;return {customer:row}}
 if(action==='customer_delete'){const id=text(data.id);const {data:row,error}=await a.admin.from('customer_directory').update({is_active:false,updated_at:new Date().toISOString()}).eq('id',id).select('id,gc_code,name,is_active').single();if(error)throw error;return {customer:row}}
 if(action==='pricing_update'){const id=text(data.id);const patch:any={amount:Number(data.amount),transit_min_days:data.transit_min_days==null?null:Number(data.transit_min_days),transit_max_days:data.transit_max_days==null?null:Number(data.transit_max_days),is_active:data.is_active!==false,notes:text(data.notes),updated_by:a.staff.id,updated_at:new Date().toISOString()};const {data:row,error}=await a.admin.from('pricing_rates').update(patch).eq('id',id).select('*').single();if(error)throw error;await a.admin.from('staff_activity_log').insert({staff_id:a.staff.id,staff_name:a.staff.full_name,action:'pricing.update',target_id:id,details:JSON.stringify({amount:patch.amount})});return {rate:row}}
 if(action==='fx_update'){const value=Number(data.usd_to_iqd);if(!Number.isFinite(value)||value<=0)throw new Error('Invalid USD/IQD rate');const {data:row,error}=await a.admin.from('exchange_rates').insert({usd_to_iqd:value,source:text(data.source)||'manual',effective_on:new Date().toISOString().slice(0,10)}).select('*').single();if(error)throw error;await a.admin.from('staff_activity_log').insert({staff_id:a.staff.id,staff_name:a.staff.full_name,action:'exchange_rate.update',target_id:row.id,details:JSON.stringify({usd_to_iqd:value})});return {rate:row}}
 if(action==='alert_create'){const {data:row,error}=await a.admin.from('staff_alerts').insert({kind:text(data.kind)||'info',title:text(data.title)||'Alert',body:text(data.body),entity_type:text(data.entity_type),entity_id:text(data.entity_id),action_url:text(data.action_url),severity:text(data.severity)||'normal',audience_role:text(data.audience_role)||null}).select('*').single();if(error)throw error;return {alert:row}}
 if(action==='alert_read'){const {data:row,error}=await a.admin.from('staff_alerts').select('read_by').eq('id',text(data.id)).single();if(error)throw error;const readBy=Array.isArray(row.read_by)?row.read_by:[];if(!readBy.includes(a.staff.id))readBy.push(a.staff.id);const r=await a.admin.from('staff_alerts').update({read_by:readBy}).eq('id',text(data.id));if(r.error)throw r.error;return {ok:true}}
 if(action==='shipment_update'){const id=text(data.id);const patch:any={status:text(data.status),transport_mode:text(data.transport_mode),origin_warehouse:text(data.origin_warehouse),destination_warehouse:text(data.destination_warehouse),cargo_description:text(data.cargo_description),carton_count:Number(data.carton_count||0),actual_weight_kg:data.actual_weight_kg==null?null:Number(data.actual_weight_kg),length_cm:data.length_cm==null?null:Number(data.length_cm),width_cm:data.width_cm==null?null:Number(data.width_cm),height_cm:data.height_cm==null?null:Number(data.height_cm),volumetric_weight_kg:data.length_cm&&data.width_cm&&data.height_cm?Number(data.length_cm)*Number(data.width_cm)*Number(data.height_cm)/6000:null,chargeable_weight_kg:data.chargeable_weight_kg==null?null:Number(data.chargeable_weight_kg),updated_at:new Date().toISOString()};if(patch.chargeable_weight_kg==null)patch.chargeable_weight_kg=Math.max(Number(patch.actual_weight_kg||0),Number(patch.volumetric_weight_kg||0));const {data:row,error}=await a.admin.from('shipments').update(patch).eq('id',id).select('*').single();if(error)throw error;await a.admin.from('staff_activity_log').insert({staff_id:a.staff.id,staff_name:a.staff.full_name,action:'shipment.update',target_id:id,details:JSON.stringify(patch)});return {shipment:row}}
 if(action==='chat_send'){
  if(!isStaff&&data.customer_user_id&&String(data.customer_user_id)!==String(a.user.id))throw new Error('Forbidden');let threadId=text(data.thread_id);if(!threadId){const r=await a.admin.from('customer_chat_threads').insert({customer_user_id:isStaff?text(data.customer_user_id)||null:a.user.id,gc_code:gc(data.gc_code),subject:text(data.subject)||'Support',assigned_staff_id:isStaff?a.staff.id:null}).select('id').single();if(r.error)throw r.error;threadId=r.data.id}
  const r=await a.admin.from('customer_chat_messages').insert({thread_id:threadId,sender_user_id:a.user.id,sender_type:isStaff?'staff':'customer',body:text(data.body),attachments:Array.isArray(data.attachments)?data.attachments:[]}).select('*').single();if(r.error)throw r.error;await a.admin.from('customer_chat_threads').update({last_message_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',threadId);return {message:r.data,thread_id:threadId}
 }
 throw new Error('Unsupported action')
}
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response(null,{headers:cors(req)});try{const a=await actor(req);if(req.method==='POST')return json(req,await post(req,a));const u=new URL(req.url);const kind=text(u.searchParams.get('kind'))||'overview';const staffOnly=['shipments','shipment','customers','alerts','pricing','finance','chat'];if(staffOnly.includes(kind)&&(!a.staff?.is_active||!STAFF_ROLES.has(String(a.staff.role))))throw new Error('Staff permission required');if(kind==='shipments')return json(req,{items:await listShipments(a.admin,gc(u.searchParams.get('gc'))||undefined)});if(kind==='shipment')return json(req,await shipmentDetail(a.admin,text(u.searchParams.get('id'))));if(kind==='customers')return json(req,{items:await customers(a.admin)});if(kind==='alerts')return json(req,{items:await alerts(a.admin,a.staff.id)});if(kind==='pricing')return json(req,await pricing(a.admin));if(kind==='finance')return json(req,await finance(a.admin));if(kind==='chat')return json(req,await chat(req,a));return json(req,{ok:true,service:'operations-v4',time:new Date().toISOString()})}catch(e){const m=e instanceof Error?e.message:String(e);const s=/Unauthorized/i.test(m)?401:/permission|Forbidden/i.test(m)?403:/not found|required|Invalid/i.test(m)?400:500;return json(req,{error:m},s)}})