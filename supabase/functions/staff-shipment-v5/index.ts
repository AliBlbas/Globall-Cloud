import { createClient } from 'npm:@supabase/supabase-js@2'
const ORIGINS=new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const headers=(req:Request)=>({'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':ORIGINS.has(req.headers.get('origin')||'')?(req.headers.get('origin')||''):'https://globall-cloud.pages.dev','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'})
const out=(req:Request,b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:headers(req)})
const t=(v:unknown)=>v==null?null:String(v).trim()||null
const gc=(v:unknown)=>{const s=t(v);if(!s)return null;const x=s.normalize('NFKC').toUpperCase().replace(/\s+/g,'');return /^GC-[A-Z0-9-]{2,30}$/.test(x)?x:null}
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

function nonNegativeNumber(value:unknown,label:string,integer=false) {
 if(value==null||value==='')return null;
 const n=Number(value);
 if(!Number.isFinite(n)||n<0||(integer&&!Number.isSafeInteger(n)))throw new Error('Invalid '+label);
 return n;
}


const CARGO_CURRENCIES=new Set(['USD','IQD','AED'])
function normalizeCargoRows(raw, fallbackCode) {
 if(raw==null)return []
 if(!Array.isArray(raw))throw new Error('Cargo items must be a list')
 if(raw.length>100)throw new Error('A shipment can contain at most 100 cargo rows')
 return raw.map((entry:any)=>{
  if(!entry||typeof entry!=='object'||Array.isArray(entry))throw new Error('Invalid cargo item')
  const itemName=t(entry.item_name)
  if(!itemName||itemName!.length>200)throw new Error('Each cargo item needs a name of at most 200 characters')
  const code=t(entry.customer_gc_code)||fallbackCode
  const customerCode=gc(code)
  if(!customerCode)throw new Error('Each cargo item requires a valid GC customer code')
  if(t(entry.id))throw new Error('New shipments cannot update existing cargo item ids')
  const number=(v:any,label:string,integer:boolean)=>{const n=v==null||v===''?0:Number(v);if(!Number.isFinite(n)||n<0||(integer&&!Number.isSafeInteger(n)))throw new Error('Invalid cargo '+label);return n}
  const currency=String(t(entry.currency)||'USD').toUpperCase()
  if(!CARGO_CURRENCIES.has(currency))throw new Error('Invalid cargo currency')
  const itemStatus=String(t(entry.item_status)||'received_origin')
  if(!['received_origin','in_transit','at_transit_hub','customs','out_for_delivery','delivered','on_hold','cancelled'].includes(itemStatus))throw new Error('Invalid cargo item status')
  const notes=t(entry.notes)
  if((notes||'').length>500)throw new Error('Cargo notes are limited to 500 characters')
  return {customer_gc_code:customerCode,item_name:itemName,quantity_pc:number(entry.quantity_pc,'piece count',true),box_count:number(entry.box_count,'box count',true),weight_kg:number(entry.weight_kg,'weight',false),declared_value:number(entry.declared_value,'declared value',false),currency,item_status:itemStatus,notes}
 })
}
async function resolveCargoDirectoryIds(db:any,items:any[]) {
 const cache=new Map<string,string|null>()
 for(const item of items){
  if(!cache.has(item.customer_gc_code)){
   const found=await db.from('customer_directory').select('id').or('gc_code.eq.'+item.customer_gc_code+',code.eq.'+item.customer_gc_code).limit(1).maybeSingle()
   if(found.error)throw found.error
   if(!found.data)throw new Error('GC customer code not found: '+item.customer_gc_code)
   cache.set(item.customer_gc_code,found.data.id)
  }
  item.customer_directory_id=cache.get(item.customer_gc_code)
 }
 return items
}


async function syncShipmentCustomerLinks(db:any, shipmentId:string, primaryDirectoryId:string|null, staffId:string, reconcile=true) {
  const idsSet=new Set<string>(); if(primaryDirectoryId)idsSet.add(String(primaryDirectoryId));
  const cargoResult=await db.from('shipment_cargo_items').select('customer_directory_id').eq('shipment_id',shipmentId);
  if(cargoResult.error)throw cargoResult.error;
  for(const item of cargoResult.data||[])if(item.customer_directory_id)idsSet.add(String(item.customer_directory_id));
  if(!idsSet.size)return [];
  const ids=[...idsSet];
  const customerResult=await db.from('customer_directory').select('id,code,gc_code,name,auth_user_id,is_active,preferred_language').in('id',ids);
  if(customerResult.error)throw customerResult.error;
  const customers=customerResult.data||[];
  const byId=new Map(customers.map((item:any)=>[String(item.id),item]));
  if(ids.some(id=>!byId.has(id)))throw new Error('Shipment cargo points to a missing customer directory record');
  const existingResult=await db.from('shipment_customer_links').select('id,customer_directory_id').eq('shipment_id',shipmentId);
  if(existingResult.error)throw existingResult.error;
  const existing=existingResult.data||[];
  const existingIds=new Set(existing.map((item:any)=>String(item.customer_directory_id)));
  const newRows=customers.filter((item:any)=>!existingIds.has(String(item.id))).map((item:any)=>({
    shipment_id:shipmentId,customer_directory_id:item.id,customer_user_id:item.auth_user_id||null,
    customer_gc_code:item.gc_code||item.code||null,created_by:staffId
  }));
  if(newRows.length){
    const added=await db.from('shipment_customer_links').upsert(newRows,{onConflict:'shipment_id,customer_directory_id',ignoreDuplicates:true});
    if(added.error)throw added.error;
  }
  const freshResult=await db.from('shipment_customer_links').select('id,customer_directory_id').eq('shipment_id',shipmentId);
  if(freshResult.error)throw freshResult.error;
  const fresh=freshResult.data||[];
  for(const link of fresh){
    const directoryId=String(link.customer_directory_id); if(!idsSet.has(directoryId))continue;
    const customer=byId.get(directoryId) as any;
    const saved=await db.from('shipment_customer_links').update({
      customer_user_id:customer.auth_user_id||null,customer_gc_code:customer.gc_code||customer.code||null,updated_at:new Date().toISOString()
    }).eq('id',link.id);
    if(saved.error)throw saved.error;
  }
  if(reconcile){
    const stale=fresh.filter((item:any)=>!idsSet.has(String(item.customer_directory_id))).map((item:any)=>item.id);
    if(stale.length){const removed=await db.from('shipment_customer_links').delete().in('id',stale);if(removed.error)throw removed.error;}
  }
  return customers;
}
async function notifyShipmentCustomers(db:any, customers:any[], shipmentId:string, trackingId:string, suffix:string, eventKind:string, status:string|null=null, location:string|null=null) {
  const users=new Map<string,any>();
  for(const customer of customers||[])if(customer?.is_active===true&&customer?.auth_user_id)users.set(String(customer.auth_user_id),customer);
  const rows=[...users.entries()].map(([userId,customer])=>{
    const language=String(customer.preferred_language||'ckb').toLowerCase();
    let title='بارەکەت نوێکرایەوە'; let body='دۆخی بارەکەت لە Globall Cloud نوێکرایەوە.';
    if(eventKind==='shipment_created'){
      title=language==='en'?'Shipment registered':language==='ar'?'تم تسجيل الشحنة':'بارەکەت تۆمار کرا';
      body=language==='en'?'Shipment '+trackingId+' was registered and is now available in your customer console.':language==='ar'?'تم تسجيل الشحنة '+trackingId+' وأصبحت متاحة في حسابك.':'باری '+trackingId+' تۆمار کرا و لە کونسۆلی کڕیارەکەتدا بەردەستە.';
    }else if(eventKind==='shipment_status'){
      title=language==='en'?'Shipment status updated':language==='ar'?'تم تحديث حالة الشحنة':'دۆخی بارەکەت نوێکرایەوە';
      body=language==='en'?'The public status for shipment '+trackingId+' is now '+String(status||'updated')+(location?' · '+location:'')+'.':language==='ar'?'تم تحديث حالة الشحنة '+trackingId+' إلى '+String(status||'updated')+(location?' · '+location:'')+'.':'دۆخی گشتی باری '+trackingId+' نوێکرایەوە'+(location?' · شوێن: '+location:'')+'.';
    }else if(eventKind==='shipment_contents'){
      title=language==='en'?'Shipment contents updated':language==='ar'?'تم تحديث محتويات الشحنة':'ناوەڕۆکی باری کڕیار نوێکرایەوە';
      body=language==='en'?'The cargo details for shipment '+trackingId+' were updated.':language==='ar'?'تم تحديث تفاصيل البضائع للشحنة '+trackingId+'.':'وردەکاریی کاڵاکانی باری '+trackingId+' نوێکرانەوە.';
    }else{
      title=language==='en'?'Shipment update':language==='ar'?'تحديث الشحنة':'نوێکردنەوەی بار';
      body=language==='en'?'There is a new public update for shipment '+trackingId+'.':language==='ar'?'هناك تحديث جديد للشحنة '+trackingId+'.':'نوێکردنەوەیەکی گشتی بۆ باری '+trackingId+' هەیە.';
    }
    return {customer_user_id:userId,shipment_id:String(shipmentId),kind:eventKind,title,body,action_url:'/#shipmentsSection',event_key:'shipment:'+String(shipmentId)+':'+suffix};
  });
  if(!rows.length)return {attempted:0,saved:0,warning:null as string|null};
  const result=await db.from('customer_notifications').upsert(rows,{onConflict:'customer_user_id,event_key',ignoreDuplicates:true});
  if(result.error){console.warn('customer shipment notification insert failed',result.error.message);return {attempted:rows.length,saved:0,warning:result.error.message};}
  return {attempted:rows.length,saved:rows.length,warning:null as string|null};
}

async function auth(req:Request){const url=Deno.env.get('SUPABASE_URL')||'';const anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||'';const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'';const authorization=req.headers.get('Authorization')||'';if(!url||!anon||!service||!/^Bearer\s+/i.test(authorization))throw out(req,{error:'Unauthorized'},401);const ac=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const u=await ac.auth.getUser();if(u.error||!u.data.user)throw out(req,{error:'Unauthorized'},401);const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const s=await db.from('staff').select('id,full_name,role,branch,is_active').eq('id',u.data.user.id).maybeSingle();if(s.error)throw s.error;if(!s.data?.is_active)throw out(req,{error:'Forbidden'},403);if(!['admin','super_admin','operations','warehouse','warehouse_china','warehouse_uae','warehouse_erbil'].includes(String(s.data.role)))throw out(req,{error:'Forbidden'},403);return{db,staff:s.data}}
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:headers(req)});try{if(req.method!=='POST')return out(req,{error:'Method not allowed'},405);const a=await auth(req);const body=await req.json().catch(()=>({}));const p=body.data||body;const id=uuid(t(p.id))?t(p.id)!:crypto.randomUUID();let customer:any=null;const customerCode=gc(p.customer_gc_code||p.gc_code);if(!customerCode)return out(req,{error:'A valid GC customer code is required'},400);if(customerCode){const q=await a.db.from('customer_directory').select('id,name,phone,email,auth_user_id,gc_code,code').or(`gc_code.eq.${customerCode},code.eq.${customerCode}`).limit(1).maybeSingle();if(q.error)throw q.error;if(!q.data)return out(req,{error:'Customer GC code not found'},404);customer=q.data}const actual=nonNegativeNumber(p.actual_weight_kg==null?p.weight_kg:p.actual_weight_kg,'actual weight');const length=nonNegativeNumber(p.length_cm,'length');const width=nonNegativeNumber(p.width_cm,'width');const height=nonNegativeNumber(p.height_cm,'height');const inputVolume=nonNegativeNumber(p.volume_cbm,'volume');const inputItemCount=nonNegativeNumber(p.items_count,'piece count',true);const inputCartonCount=nonNegativeNumber(p.carton_count,'carton count',true);const totalAmount=nonNegativeNumber(p.total_amount==null?0:p.total_amount,'total amount');const paidAmount=nonNegativeNumber(p.paid_amount==null?0:p.paid_amount,'paid amount');const vol=length!=null&&width!=null&&height!=null?length*width*height/6000:null;if(vol!=null&&!Number.isFinite(vol))throw new Error('Invalid volumetric weight');const tracking=t(p.tracking_id||p.tracking_number)||`GC-${new Date().getFullYear()}-${id.slice(0,8).toUpperCase()}`;const existing=await a.db.from('shipments').select('id,tracking_id,tracking_number').or(`id.eq.${id},tracking_id.eq.${tracking},tracking_number.eq.${tracking}`).limit(1).maybeSingle();if(existing.error)throw existing.error;if(existing.data)return out(req,{error:'Shipment or tracking already exists',item:existing.data},409);const requestedMode=String(t(p.transport_mode)||t(p.type)||'air').toLowerCase();if(!['air','land','sea'].includes(requestedMode))return out(req,{error:'Invalid transport mode'},400);const requestedStatus=t(p.status)||'received_origin';const initialStatus=['received_origin','in_transit','at_transit_hub','customs','out_for_delivery','delivered','on_hold','cancelled'].includes(requestedStatus)?requestedStatus:'received_origin';const cargoItems=await resolveCargoDirectoryIds(a.db,normalizeCargoRows(p.cargo_items,customerCode));const cargoPieces=cargoItems.reduce((sum:number,item:any)=>sum+item.quantity_pc,0);const cargoBoxes=cargoItems.reduce((sum:number,item:any)=>sum+item.box_count,0);const now=new Date().toISOString();const stepDates=p.step_dates&&typeof p.step_dates==='object'?{...p.step_dates}:{};stepDates.created=stepDates.created||now;if(initialStatus==='received_origin')stepDates.received_origin=stepDates.received_origin||now;if(initialStatus==='in_transit')stepDates.departed=stepDates.departed||now;const row={id,tracking_id:tracking,tracking_number:tracking,customer_name:customer?.name||t(p.customer_name)||'Customer',customer_phone:customer?.phone||t(p.customer_phone),customer_email:customer?.email||t(p.customer_email),customer_user_id:customer?.auth_user_id||null,customer_gc_code:customer?.gc_code||customer?.code||customerCode,directory_customer_id:customer?.id||null,origin:t(p.origin)||t(p.origin_key)||'China',destination:t(p.destination)||t(p.dest_key)||'Erbil',origin_key:t(p.origin_key)||'china',dest_key:t(p.dest_key)||'erbil',route:t(p.route)||`${t(p.origin_key)||'china'}-${t(p.dest_key)||'erbil'}`,type:requestedMode,transport_mode:requestedMode,status:initialStatus,operational_status:initialStatus,notes:t(p.notes)||t(p.cargo_description),cargo_description:t(p.cargo_description)||t(p.notes),weight_kg:actual,actual_weight_kg:actual,volume_cbm:inputVolume,items_count:cargoItems.length?cargoPieces:inputItemCount,box_count:cargoBoxes,pc_count:cargoPieces,carton_count:cargoItems.length&&cargoBoxes>0?cargoBoxes:(inputCartonCount==null?inputItemCount:inputCartonCount),length_cm:length,width_cm:width,height_cm:height,volumetric_weight_kg:vol,chargeable_weight_kg:vol==null?actual:Math.max(actual||0,vol),total_amount:totalAmount==null?0:totalAmount,paid_amount:paidAmount==null?0:paidAmount,current_step_index:p.current_step_index==null?0:Number(p.current_step_index),step_dates:stepDates,eta:t(p.eta),batch_code:t(p.batch_code),branch:t(p.branch)||a.staff.branch||'all',priority:t(p.priority)||'normal',assigned_staff_id:t(p.assigned_staff_id),origin_warehouse:t(p.origin_warehouse)||t(p.origin_key)||'China',destination_warehouse:t(p.destination_warehouse)||t(p.dest_key)||'Erbil',current_location_label:t(p.origin_warehouse)||t(p.origin_key)||'China',tracking_updated_at:new Date().toISOString(),currency:t(p.currency)||'USD'};const r=await a.db.from('shipments').insert(row).select('*').single();if(r.error)throw r.error;if(cargoItems.length){const cargoRows=cargoItems.map((item:any)=>({...item,shipment_id:id,created_by:a.staff.id,updated_by:a.staff.id}));const cargoResult=await a.db.from('shipment_cargo_items').insert(cargoRows);if(cargoResult.error){await a.db.from('shipments').delete().eq('id',id);throw cargoResult.error}}let linkedCustomers:any[]=[];try{linkedCustomers=await syncShipmentCustomerLinks(a.db,id,customer.id,a.staff.id,true)}catch(linkError){await a.db.from('shipment_cargo_items').delete().eq('shipment_id',id);await a.db.from('shipments').delete().eq('id',id);throw linkError}const event={shipment_id:id,status_key:initialStatus,title:'بار دروست کرا',note:t(p.cargo_description)||'بارەکە لە Staff OS دروست کرا.',location_label:row.current_location_label,created_by:a.staff.id,created_by_name:a.staff.full_name,is_public:true};const er=await a.db.from('shipment_tracking_events').insert(event);if(er.error)console.warn('tracking event seed failed',er.error.message);const notificationResult=await notifyShipmentCustomers(a.db,linkedCustomers,id,tracking,'created','shipment_created',initialStatus,row.current_location_label);await a.db.from('staff_activity_log').insert({staff_id:a.staff.id,staff_name:a.staff.full_name,action:'create_shipment',target_id:id,details:JSON.stringify({tracking_id:tracking,customer_gc_code:row.customer_gc_code,mode:row.transport_mode,status:initialStatus,cargo_items:cargoItems.length,cargo_pieces:cargoPieces,cargo_boxes:cargoBoxes})});return out(req,{item:r.data,event_seeded:!er.error,linked_customer_count:linkedCustomers.length,notifications_attempted:notificationResult.attempted,notifications_saved:notificationResult.saved,notification_warning:notificationResult.warning})}catch(e){if(e instanceof Response)return e;const message=e instanceof Error?e.message:String(e);const status=/unauthorized/i.test(message)?401:/forbidden|permission/i.test(message)?403:/already exists/i.test(message)?409:/customer gc code not found/i.test(message)?404:/required|requires|needs|invalid|at most|cannot|must be/i.test(message)?400:500;return out(req,{error:message},status)}})