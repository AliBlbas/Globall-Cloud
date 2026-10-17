import { createClient } from 'npm:@supabase/supabase-js@2'
const ALLOWED_ORIGINS=new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const ALLOWED_ROLES=new Set(['admin','super_admin','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','delivery'])
const BUCKET='warehouse-receipts'
const SIGNED_URL_TTL=60*60*24
function cors(req:Request){const origin=req.headers.get('origin')||'';return{'Access-Control-Allow-Origin':ALLOWED_ORIGINS.has(origin)?origin:'https://globall-cloud.pages.dev','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-auth-token, x-idempotency-key','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'}}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(req)}})}
function text(v:FormDataEntryValue|null){if(typeof v!=='string')return null;const s=v.trim();return s||null}
function num(v:FormDataEntryValue|null){const s=text(v);if(!s)return null;const n=Number(s);return Number.isFinite(n)&&n>=0?n:null}
function gcCode(v:string|null){if(!v)return null;const n=v.normalize('NFKC').toUpperCase().replace(/[–—−]/g,'-').replace(/\s+/g,'');return/^GC-[A-Z0-9-]{2,30}$/.test(n)?n:null}
function stageForLocation(location:string|null){const v=String(location||'').toLowerCase();if(v==='china')return'china_received';if(v==='dubai'||v==='uae')return'uae_arrived';if(v==='erbil')return'erbil_arrived';return'received'}
function hubForLocation(location:string|null){const v=String(location||'').toLowerCase();if(v==='china')return'china';if(v==='dubai'||v==='uae')return'dubai';if(v==='erbil')return'erbil';return v||'warehouse'}
function locationAllowed(staff:Record<string,any>,location:string){
 const role=String(staff.role||'');
 const target=hubForLocation(location);
 if(role==='super_admin'||role==='admin')return true;
 if(role==='warehouse_china'&&target!=='china')return false;
 if(role==='warehouse_uae'&&target!=='dubai')return false;
 if(role==='warehouse_erbil'&&target!=='erbil')return false;
 const branch=String(staff.branch||'all').toLowerCase();
 const branchHub=hubForLocation(branch);
 if(branch!=='all'&&branchHub&&branchHub!=='all'&&target!==branchHub)return false;
 return true;
}
function safeName(name:string){return name.normalize('NFKC').replace(/[^A-Za-z0-9._-]+/g,'_').slice(-120)||'package.jpg'}
async function ensureReceiptCartons(admin:ReturnType<typeof createClient>,staff:Record<string,any>,receipt:Record<string,any>,code:string,location:string,cartonCount:number){
 if(!receipt?.id||!receipt?.directory_customer_id)throw new Error('Receipt is missing its customer link');
 if(!Number.isInteger(cartonCount)||cartonCount<1||cartonCount>999)throw new Error('Carton count must be between 1 and 999');
 const normalized=gcCode(code);
 if(!normalized)throw new Error('Valid GC code is required for every carton');
 const receiptToken=String(receipt.id).replace(/-/g,'').slice(0,12).toUpperCase();
 const receivedAt=receipt.received_at?new Date(receipt.received_at).toISOString():new Date().toISOString();
 const now=new Date().toISOString();
 const rows=Array.from({length:cartonCount},(_,index)=>{
  const cartonIndex=index+1;
  const cartonLabel=String(cartonIndex).padStart(3,'0');
  return{
   receipt_id:receipt.id,
   customer_directory_id:receipt.directory_customer_id,
   gc_code:normalized,
   carton_index:cartonIndex,
   carton_total:cartonCount,
   carton_code:`${normalized}-${receiptToken}-C${cartonLabel}`,
   warehouse_location:location,
   received_at:receivedAt,
   created_by:staff.id,
   created_by_name:staff.full_name||null,
   notes:receipt.notes||receipt.description||null,
   updated_at:now
  };
 });
 const saved=await admin.from('warehouse_receipt_cartons').upsert(rows,{onConflict:'receipt_id,carton_index',ignoreDuplicates:true});
 if(saved.error)throw saved.error;
 const result=await admin.from('warehouse_receipt_cartons')
  .select('id,receipt_id,customer_directory_id,gc_code,carton_index,carton_total,carton_code,warehouse_location,received_at,status,package_id,created_by_name,notes,created_at')
  .eq('receipt_id',receipt.id)
  .eq('customer_directory_id',receipt.directory_customer_id)
  .order('carton_index',{ascending:true});
 if(result.error)throw result.error;
 const cartons=result.data||[];
 if(cartons.length!==cartonCount)throw new Error(`Carton manifest incomplete: expected ${cartonCount}, found ${cartons.length}`);
 return cartons;
}
function storagePath(value:unknown){const raw=String(value||'').trim();if(!raw)return null;if(!raw.startsWith('http'))return raw.replace(/^\/+/, '');const markers=[`/storage/v1/object/public/${BUCKET}/`,`/storage/v1/object/sign/${BUCKET}/`,`/storage/v1/object/authenticated/${BUCKET}/`];for(const marker of markers){const index=raw.indexOf(marker);if(index>=0)return decodeURIComponent(raw.slice(index+marker.length).split('?')[0])}return null}
async function signedPhotos(admin:ReturnType<typeof createClient>,photos:unknown){const values=Array.isArray(photos)?photos:[];const paths=values.map(storagePath).filter((v):v is string=>Boolean(v));if(!paths.length)return[];const{data,error}=await admin.storage.from(BUCKET).createSignedUrls(paths,SIGNED_URL_TTL);if(error)throw error;return(data||[]).map(item=>item.signedUrl).filter((v):v is string=>Boolean(v))}
function nextDeliveryTimeOutsideQuietHours(quietStart:unknown,quietEnd:unknown,now=new Date()){
 const parse=(value:unknown)=>{const match=String(value||'').match(/^(\\d{1,2}):(\\d{2})/);if(!match)return null;const h=Number(match[1]),m=Number(match[2]);return h>=0&&h<24&&m>=0&&m<60?h*60+m:null};
 const start=parse(quietStart),end=parse(quietEnd);
 if(start===null||end===null||start===end)return now.toISOString();
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Baghdad',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const hour=Number(parts.find(p=>p.type==='hour')?.value||0),minute=Number(parts.find(p=>p.type==='minute')?.value||0),current=hour*60+minute;
 const quiet=start<end?(current>=start&&current<end):(current>=start||current<end);
 if(!quiet)return now.toISOString();
 let delay=(end-current+1440)%1440;if(delay===0)delay=1440;
 return new Date(now.getTime()+delay*60000+1000).toISOString();
}
async function cancelQueuedReceiptChannel(admin:ReturnType<typeof createClient>,eventKey:string,channel:'email'|'whatsapp',reason:string){
 const {data,error}=await admin.from('notification_outbox')
  .update({status:'cancelled',last_error:reason,updated_at:new Date().toISOString()})
  .eq('event_key',eventKey).eq('channel',channel).in('status',['pending','processing','retry','queued'])
  .select('id');
 if(error)throw error;
 return (data||[]).length;
}
async function queueReceiptNotifications(admin:ReturnType<typeof createClient>,receipt:Record<string,any>,knownCustomer?:Record<string,any>,signedPhotoUrls?:string[]){
 const errors:string[]=[];
 let customer=knownCustomer||null;
 if(!customer&&receipt.directory_customer_id){
  const r=await admin.from('customer_directory').select('id,code,gc_code,name,phone,phone2,whatsapp_phone,email,auth_user_id,preferred_language').eq('id',receipt.directory_customer_id).maybeSingle();
  if(r.error)errors.push('customer_lookup: '+r.error.message);else customer=r.data;
 }
 if(!customer)return{ok:false,account_linked:false,in_app_queued:false,whatsapp_queued:false,email_queued:false,whatsapp_opted_in:false,email_opted_in:false,photo_count:0,errors:[...errors,'Customer directory record was not found.']};
 const metadata=receipt.label_metadata&&typeof receipt.label_metadata==='object'?receipt.label_metadata:{};
 const gc=String(customer.gc_code||customer.code||receipt.gc_code_detected||receipt.gc_code||'').normalize('NFKC').trim().toUpperCase();
 const warehouse=String(receipt.location||receipt.source_warehouse||receipt.warehouse||'warehouse');
 const cartons=Math.max(1,Number(receipt.carton_count??metadata.total_packages??1)||1);
 const weight=Number(receipt.weight_actual??metadata.gross_weight_kg??0)||0;
 const photos=Array.isArray(signedPhotoUrls)?signedPhotoUrls:await signedPhotos(admin,receipt.photos);
 let cartonRows:Array<Record<string,any>>=Array.isArray(receipt.cartons)?receipt.cartons:[];
 if(!cartonRows.length&&receipt.id&&receipt.directory_customer_id){
  const cartonResult=await admin.from('warehouse_receipt_cartons')
   .select('carton_index,carton_total,carton_code,warehouse_location,received_at,status')
   .eq('receipt_id',receipt.id).eq('customer_directory_id',receipt.directory_customer_id)
   .order('carton_index',{ascending:true});
  if(cartonResult.error)errors.push('cartons: '+cartonResult.error.message);
  else cartonRows=cartonResult.data||[];
 }
 const cartonCodes=cartonRows.map(x=>String(x.carton_code||'')).filter(Boolean);
 const cartonLine=cartonCodes.length
  ? `کۆدی کارتۆنەکان: ${cartonCodes.slice(0,15).join(', ')}${cartonCodes.length>15?` و ${cartonCodes.length-15} دانەی تر`:''}`
  : 'کۆدی تاکەکارتۆن: لە تۆماری وەرگرتندا بەردەست نییە';
 const eventKey=`warehouse_received:${String(receipt.id)}`;
 const actionUrl='/#records';
 const receivedAt=receipt.received_at||new Date().toISOString();
 const localTime=new Intl.DateTimeFormat('ku-IQ',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Baghdad'}).format(new Date(receivedAt));
 const title='کاڵاکەت لە کۆگا وەرگیرا';
 const bodyText=`GC: ${gc}\nکۆگا: ${warehouse}\nکارتۆن: ${cartons}\n${cartonLine}\nکێش: ${weight>0?`${weight} kg`:'تۆمارنەکراوە'}\nبەروار و کات (هەولێر): ${localTime}\nژمارەی وێنەکان: ${photos.length}\nBatch: ${String(receipt.batch_code||'—')}`;
 const payloadBase={title,body:bodyText,action_url:actionUrl,gc_code:gc,warehouse,carton_count:cartons,carton_codes:cartonCodes,weight_kg:weight||null,receipt_id:String(receipt.id),batch_code:String(receipt.batch_code||''),received_at:String(receivedAt),photo_count:photos.length,media_url:photos[0]||null};
 let preferences:Record<string,any>|null=null;
 if(customer.auth_user_id){
  const result=await admin.from('customer_notification_preferences').select('email_enabled,whatsapp_enabled,in_app_enabled,quiet_hours_start,quiet_hours_end').eq('customer_user_id',customer.auth_user_id).maybeSingle();
  if(result.error)errors.push('preferences: '+result.error.message);else preferences=result.data;
 }
 // In-app notifications default on for linked customers; external channels require explicit opt-in.
 const inAppAllowed=Boolean(customer.auth_user_id)&&preferences?.in_app_enabled!==false;
 const whatsappOptedIn=preferences?.whatsapp_enabled===true;
 const emailOptedIn=preferences?.email_enabled===true;
 const nextAttemptAt=nextDeliveryTimeOutsideQuietHours(preferences?.quiet_hours_start,preferences?.quiet_hours_end);
 let inAppQueued=false,whatsappQueued=false,emailQueued=false;
 if(inAppAllowed){
  const r=await admin.from('customer_notifications').upsert({
   customer_user_id:customer.auth_user_id,shipment_id:receipt.shipment_id?String(receipt.shipment_id):null,
   kind:'warehouse_received',event_key:eventKey,title,body:bodyText,action_url:actionUrl
  },{onConflict:'customer_user_id,event_key',ignoreDuplicates:true});
  if(r.error)errors.push('in_app: '+r.error.message);else inAppQueued=true;
 }
 const whatsappRecipient=String(customer.whatsapp_phone||customer.phone||customer.phone2||'').trim();
 if(whatsappOptedIn&&whatsappRecipient){
  const r=await admin.from('notification_outbox').upsert({
   customer_user_id:customer.auth_user_id||null,shipment_id:receipt.shipment_id?String(receipt.shipment_id):null,
   channel:'whatsapp',event_key:eventKey,recipient:whatsappRecipient,next_attempt_at:nextAttemptAt,
   payload:{...payloadBase,template_name:Deno.env.get('WHATSAPP_TEMPLATE_NAME')||'globall_warehouse_received',template_language:String(customer.preferred_language||'ckb')}
  },{onConflict:'event_key,channel',ignoreDuplicates:true});
  if(r.error)errors.push('whatsapp: '+r.error.message);else whatsappQueued=true;
 }else{
  try{await cancelQueuedReceiptChannel(admin,eventKey,'whatsapp','Customer has not opted in to WhatsApp notifications.')}catch(error){errors.push('whatsapp_cancel: '+(error instanceof Error?error.message:String(error)))}
 }
 const emailRecipient=String(customer.email||'').trim();
 if(emailOptedIn&&emailRecipient){
  const r=await admin.from('notification_outbox').upsert({
   customer_user_id:customer.auth_user_id||null,shipment_id:receipt.shipment_id?String(receipt.shipment_id):null,
   channel:'email',event_key:eventKey,recipient:emailRecipient,next_attempt_at:nextAttemptAt,payload:{...payloadBase,subject:title}
  },{onConflict:'event_key,channel',ignoreDuplicates:true});
  if(r.error)errors.push('email: '+r.error.message);else emailQueued=true;
 }else{
  try{await cancelQueuedReceiptChannel(admin,eventKey,'email','Customer has not opted in to email notifications.')}catch(error){errors.push('email_cancel: '+(error instanceof Error?error.message:String(error)))}
 }
 return{ok:errors.length===0,account_linked:Boolean(customer.auth_user_id),in_app_queued:inAppQueued,whatsapp_queued:whatsappQueued,email_queued:emailQueued,whatsapp_opted_in:whatsappOptedIn,email_opted_in:emailOptedIn,external_opt_in:whatsappOptedIn||emailOptedIn,photo_count:photos.length,next_external_attempt_at:nextAttemptAt,errors};
}

async function actor(req:Request){const url=Deno.env.get('SUPABASE_URL')!;const anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;const auth=req.headers.get('Authorization')||'';if(!auth.toLowerCase().startsWith('bearer '))throw new Error('Unauthorized');const authClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});const{data,error}=await authClient.auth.getUser();if(error||!data.user)throw new Error('Unauthorized');const admin=createClient(url,service,{auth:{persistSession:false}});const{data:staff,error:staffError}=await admin.from('staff').select('id,full_name,role,branch,is_active').eq('id',data.user.id).maybeSingle();if(staffError)throw staffError;if(!staff?.is_active||!ALLOWED_ROLES.has(String(staff.role)))throw new Error('Warehouse permission required');return{admin,staff}}
async function linkShipmentChain(
 admin:ReturnType<typeof createClient>,
 staff:Record<string,any>,
 receiptId:string,
 customerAuthUserId:string|null,
 code:string,
 batchCode:string,
 location:string,
 stage:string,
 metadata:Record<string,unknown>,
 explicitShipmentId:string|null,
 idempotency:string
){
 let shipmentId=explicitShipmentId;
 if(!shipmentId){
  const lookup=await admin.from('shipments')
   .select('id,customer_user_id,directory_customer_id,customer_gc_code,current_step_index,operational_status,current_location_label')
   .eq('external_reference',batchCode).maybeSingle();
  if(lookup.error)throw lookup.error;
  shipmentId=lookup.data?.id||null;
 }
 const receiptResult=await admin.from('warehouse_receipts')
  .select('id,directory_customer_id,gc_code,gc_code_detected,received_at,carton_count,weight_actual,photos,location,source_warehouse,warehouse')
  .eq('id',receiptId).maybeSingle();
 if(receiptResult.error)throw receiptResult.error;
 const receipt=receiptResult.data;
 if(!receipt)throw new Error('Warehouse receipt not found for carton linking');
 const cartonResult=await admin.from('warehouse_receipt_cartons')
  .select('id,customer_directory_id,gc_code,carton_index,carton_total,carton_code,warehouse_location,received_at,status,package_id')
  .eq('receipt_id',receiptId).eq('customer_directory_id',receipt.directory_customer_id)
  .order('carton_index',{ascending:true});
 if(cartonResult.error)throw cartonResult.error;
 const cartons=cartonResult.data||[];
 if(!cartons.length)return{linked:false,reason:'carton_manifest_empty',cartons_linked:0};
 if(!shipmentId)return{linked:false,reason:'no_shipment_id',cartons_linked:cartons.length,carton_codes:cartons.map((x:any)=>x.carton_code)};
 const shipmentResult=await admin.from('shipments')
  .select('id,customer_user_id,directory_customer_id,customer_gc_code,current_step_index,operational_status,current_location_label')
  .eq('id',shipmentId).maybeSingle();
 if(shipmentResult.error)throw shipmentResult.error;
 const shipment=shipmentResult.data;
 if(!shipment)throw new Error(`Shipment ${shipmentId} was not found`);
 const wantedCode=gcCode(code);
 const shipmentCode=gcCode(String(shipment.customer_gc_code||''));
 let ownerMatched=false;
 if(shipment.directory_customer_id){
  if(String(shipment.directory_customer_id)!==String(receipt.directory_customer_id))throw new Error(`Shipment ${shipmentId} belongs to a different customer directory account`);
  ownerMatched=true;
 }
 if(shipment.customer_gc_code){
  if(!shipmentCode||!wantedCode||shipmentCode!==wantedCode)throw new Error(`Shipment ${shipmentId} GC code does not match ${code}`);
  ownerMatched=true;
 }
 if(shipment.customer_user_id){
  if(customerAuthUserId&&String(shipment.customer_user_id)!==String(customerAuthUserId))throw new Error(`Shipment ${shipmentId} login account does not match ${code}`);
  if(customerAuthUserId&&String(shipment.customer_user_id)===String(customerAuthUserId))ownerMatched=true;
  if(!customerAuthUserId&&!shipment.directory_customer_id&&!shipment.customer_gc_code)throw new Error(`Shipment ${shipmentId} owner cannot be verified for ${code}`);
 }
 if(!ownerMatched)throw new Error(`Shipment ${shipmentId} owner cannot be verified for ${code}; link the correct customer GC account first`);
 const now=new Date().toISOString();
 const packageIds:string[]=[];
 for(const carton of cartons){
  // A batch weight must not be copied to every carton. Keep individual package
  // weight only when the receipt contains exactly one carton.
  const packageWeight=cartons.length===1?(metadata.gross_weight_kg??null):null;
  const packageResult=await admin.rpc('upsert_shipment_package',{
   p_actor_id:staff.id,
   p_shipment_id:String(shipmentId),
   p_package_code:String(carton.carton_code),
   p_weight_kg:packageWeight,
   p_length_cm:null,p_width_cm:null,p_height_cm:null,
   p_hub_code:hubForLocation(location),
   p_status:'received',
   p_metadata:{
    gc_code:wantedCode,
    customer_directory_id:receipt.directory_customer_id,
    batch_code:batchCode,
    receipt_id:receiptId,
    carton_code:carton.carton_code,
    carton_index:carton.carton_index,
    carton_total:carton.carton_total,
    stage,
    warehouse_location:location,
    received_at:carton.received_at,
    evidence_photo_count:Array.isArray(receipt.photos)?receipt.photos.length:0
   }
  });
  if(packageResult.error)throw packageResult.error;
  const packageId=packageResult.data?.id?String(packageResult.data.id):null;
  if(!packageId)throw new Error(`Package registration did not return an ID for ${carton.carton_code}`);
  const attach=await admin.from('warehouse_receipt_cartons')
   .update({package_id:packageId,status:'received',updated_at:now})
   .eq('id',carton.id).eq('receipt_id',receiptId).eq('customer_directory_id',receipt.directory_customer_id);
  if(attach.error)throw attach.error;
  const movementResult=await admin.rpc('record_warehouse_movement',{
   p_actor_id:staff.id,p_shipment_id:String(shipmentId),p_package_id:packageId,p_receipt_id:receiptId,
   p_from_hub:shipment.current_location_label||null,p_to_hub:hubForLocation(location),
   p_movement_type:'intake',p_scan_code:String(carton.carton_code),
   p_notes:`Carton ${carton.carton_index}/${carton.carton_total} received for ${wantedCode} at ${location}`,
   p_metadata:{
    stage,batch_code:batchCode,gc_code:wantedCode,carton_code:carton.carton_code,
    carton_index:carton.carton_index,carton_total:carton.carton_total
   },
   p_idempotency_key:`${idempotency}:carton:${carton.carton_index}:movement`
  });
  if(movementResult.error)throw movementResult.error;
  packageIds.push(packageId);
 }
 const target=stage==='china_received'?{status:'received_origin',step:0}:stage==='uae_arrived'?{status:'at_transit_hub',step:2}:null;
 let transition=null;
 if(target&&Number(shipment.current_step_index||0)<target.step){
  const transitionResult=await admin.rpc('record_shipment_transition',{
   p_actor_id:staff.id,p_shipment_id:String(shipmentId),p_to_status:target.status,p_to_step:target.step,
   p_location_code:hubForLocation(location),
   p_note:`Warehouse receipt ${receiptId} linked to ${wantedCode} (${cartons.length} cartons)`,
   p_metadata:{receipt_id:receiptId,batch_code:batchCode,gc_code:wantedCode,carton_codes:cartons.map((x:any)=>x.carton_code)},
   p_idempotency_key:`${idempotency}:transition:${target.status}`
  });
  if(transitionResult.error)throw transitionResult.error;
  transition=transitionResult.data;
 }
 return{
  linked:true,shipment_id:shipmentId,package_id:packageIds[0]||null,
  package_ids:packageIds,cartons_linked:packageIds.length,
  carton_codes:cartons.map((x:any)=>x.carton_code),transition
 };
}
async function retryExistingChain(admin:ReturnType<typeof createClient>,staff:Record<string,unknown>,existing:Record<string,any>){const directoryId=existing.directory_customer_id?String(existing.directory_customer_id):null;let customerAuthUserId:string|null=null;if(directoryId){const{data,error}=await admin.from('customer_directory').select('auth_user_id').eq('id',directoryId).maybeSingle();if(error)throw error;customerAuthUserId=data?.auth_user_id||null}const metadata=existing.label_metadata&&typeof existing.label_metadata==='object'?{...existing.label_metadata,gross_weight_kg:existing.weight_actual??existing.label_metadata.gross_weight_kg,tracking_number:existing.barcode??existing.label_metadata.tracking_number,carrier_tracking_number:existing.barcode??existing.label_metadata.carrier_tracking_number}: {gross_weight_kg:existing.weight_actual??null,tracking_number:existing.barcode??null,carrier_tracking_number:existing.barcode??null};const location=String(existing.location||existing.warehouse||'Dubai');return linkShipmentChain(admin,staff,String(existing.id),customerAuthUserId,String(existing.gc_code||''),String(existing.batch_code||''),location,String(existing.stage||stageForLocation(location)),metadata,existing.shipment_id?String(existing.shipment_id):null,String(existing.idempotency_key||'retry'))}
async function createReceipt(req:Request){const{admin,staff}=await actor(req);const form=await req.formData();const code=gcCode(text(form.get('customer_code')));const location=text(form.get('location'))||'Dubai';const submittedBatchCode=text(form.get('batch_code'));const batchCode=submittedBatchCode||`${code}-${new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14)}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;if(!code)throw new Error('Valid GC customer code is required');if(!batchCode)throw new Error('Batch code is required');if(!locationAllowed(staff,location))throw new Error('Warehouse branch is not authorized for this location');const{data:customer,error:customerError}=await admin.from('customer_directory').select('id,code,gc_code,normalized_gc_code,name,phone,phone2,whatsapp_phone,email,auth_user_id,preferred_language').or(`gc_code.eq.${code},normalized_gc_code.eq.${code},code.eq.${code}`).maybeSingle();if(customerError)throw customerError;if(!customer)throw new Error(`Customer ${code} was not found`);const tracking=text(form.get('tracking_number'));const grossWeight=num(form.get('gross_weight_kg'));const declaredValue=num(form.get('declared_value'));const totalPackages=num(form.get('total_packages'));if(totalPackages!==null&&(!Number.isInteger(totalPackages)||totalPackages<1||totalPackages>999))throw new Error('Carton count must be between 1 and 999');const itemSummary=text(form.get('item_summary'));const notes=text(form.get('notes'));const labelMetadata={invoice_number:text(form.get('invoice_number')),quantity:num(form.get('quantity')),gross_weight_kg:grossWeight,declared_value:declaredValue,declared_currency:text(form.get('declared_currency'))||'USD',total_packages:totalPackages,carrier:text(form.get('carrier')),service_level:text(form.get('service_level')),tracking_number:tracking,carrier_tracking_number:tracking,shipper:text(form.get('shipper')),origin:text(form.get('origin')),destination:text(form.get('destination')),item_summary:itemSummary,source:'warehouse_receiving'};const idempotency=text(form.get('idempotency_key'))||req.headers.get('x-idempotency-key')||crypto.randomUUID();const{data:existing}=await admin.from('warehouse_receipts').select('*').eq('idempotency_key',idempotency).maybeSingle();if(existing){
 const existingCode=gcCode(String(existing.gc_code_detected||existing.gc_code||code));
 if(!existingCode||existingCode!==code)throw new Error('Idempotency key was already used for another GC code');
 const existingCartonCount=Math.max(1,Number(existing.carton_count??existing.label_metadata?.total_packages??1)||1);
 const cartons=await ensureReceiptCartons(admin,staff,existing,existingCode,String(existing.location||existing.source_warehouse||existing.warehouse||location),existingCartonCount);
 let chain;try{chain=await retryExistingChain(admin,staff,existing)}catch(error){const message=error instanceof Error?error.message:String(error);console.error('[warehouse-receiving] retry existing chain failed',message);chain={linked:false,reason:'retry_failed',error:message}}
 const signed=await signedPhotos(admin,existing.photos);
 const receiptWithCartons={...existing,cartons};
 const notification=await queueReceiptNotifications(admin,receiptWithCartons,undefined,signed).catch(error=>({ok:false,account_linked:Boolean(existing.directory_customer_id),in_app_queued:false,whatsapp_queued:false,email_queued:false,photo_count:signed.length,errors:[error instanceof Error?error.message:String(error)]}));
 return{receipt:{...receiptWithCartons,photos:signed},duplicate:true,chain,notification}
}
const files=form.getAll('photos').filter((x):x is File=>x instanceof File).slice(0,8);if(!files.length)throw new Error('At least one package photo is required');const photoPaths:string[]=[];const receiptKey=`${code}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}`;for(const file of files){if(!file.type.startsWith('image/'))throw new Error('Only image files are allowed');if(file.size>12*1024*1024)throw new Error('Each photo must 12MB or smaller');const path=`${receiptKey}/${safeName(file.name)}`;const{error}=await admin.storage.from(BUCKET).upload(path,file,{contentType:file.type||'image/jpeg',upsert:false});if(error)throw error;photoPaths.push(path)}const receivedAt=new Date().toISOString();const stage=stageForLocation(location);const cartonCount=totalPackages!=null?totalPackages:1;const whatsappMessage=[`Globall Cloud | ${code}`,`وەرگیرا: ${location} · ${stage}`,`Batch: ${batchCode}`,labelMetadata.invoice_number?`Invoice: ${labelMetadata.invoice_number}`:null,labelMetadata.carrier?`Carrier: ${labelMetadata.carrier}`:null,tracking?`Tracking: ${tracking}`:null,grossWeight!=null?`Weight: ${grossWeight} kg`:null,declaredValue!=null?`Declared: ${declaredValue} ${labelMetadata.declared_currency}`:null,`Packages: ${cartonCount}`,`${photoPaths.length} وێنەی بەڵگەی وەرگرتن`].filter(Boolean).join('\n');const payload={gc_code:code,batch_code:batchCode,warehouse:location,carton_count:cartonCount,weight_actual:grossWeight,received_at:receivedAt,photos:photoPaths,product_type:itemSummary,description:notes,barcode:tracking,source_warehouse:location,customer_name:customer.name,notes,idempotency_key:idempotency,location,created_by:staff.id,created_by_name:staff.full_name,directory_customer_id:customer.id,directory_phone:customer.phone||customer.phone2||text(form.get('customer_phone')),scan_code:code,scan_type:text(form.get('scan_type'))==='barcode'?'barcode':'qr',scanned_at:receivedAt,verified_at:receivedAt,verification_status:'verified',stage,photo_taken_at:text(form.get('photo_taken_at'))||receivedAt,latitude:num(form.get('latitude')),longitude:num(form.get('longitude')),gc_code_detected:code,ocr_text:text(form.get('ocr_text')),ocr_confidence:num(form.get('ocr_confidence')),ai_detected_items:itemSummary?[{summary:itemSummary}]:[],auto_assigned:true,label_metadata:labelMetadata,label_captured_at:receivedAt,label_capture_method:text(form.get('label_capture_method'))||(text(form.get('scan_type'))==='barcode'?'barcode':'manual'),whatsapp_message:whatsappMessage,evidence_version:1,shipment_id:text(form.get('shipment_id')),consolidated:false};const{data:receipt,error}=await admin.from('warehouse_receipts').insert(payload).select('*').single();
 if(error){await admin.storage.from(BUCKET).remove(photoPaths);throw error}
 let cartonManifest:Array<Record<string,any>>;
 try{
  cartonManifest=await ensureReceiptCartons(admin,staff,receipt,code,location,cartonCount);
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  await admin.from('warehouse_receipts').delete().eq('id',receipt.id);
  await admin.storage.from(BUCKET).remove(photoPaths);
  throw new Error('Receipt saved but carton manifest failed; receipt was rolled back: '+message);
 }
 let chain;
 try{chain=await linkShipmentChain(admin,staff,receipt.id,customer.auth_user_id||null,code,batchCode,location,stage,labelMetadata,text(form.get('shipment_id')),idempotency)}
 catch(error){const message=error instanceof Error?error.message:String(error);console.error('[warehouse-receiving] chain link failed',message);chain={linked:false,reason:'chain_link_failed',error:message,cartons_linked:0};}
 const securedPhotos=await signedPhotos(admin,receipt.photos);
 const receiptWithCartons={...receipt,cartons:cartonManifest};
 const notification=await queueReceiptNotifications(admin,receiptWithCartons,customer,securedPhotos).catch(error=>({ok:false,account_linked:Boolean(customer.auth_user_id),in_app_queued:false,whatsapp_queued:false,email_queued:false,photo_count:securedPhotos.length,errors:[error instanceof Error?error.message:String(error)]}));
 try{
  await admin.from('staff_activity_log').insert({
   staff_id:staff.id,staff_name:staff.full_name,action:'warehouse.receipt.created',target_id:String(receipt.id),
   details:JSON.stringify({gc_code:code,warehouse:location,batch_code:batchCode,cartons:cartonCount,carton_codes:cartonManifest.map(x=>x.carton_code),photos:securedPhotos.length,notification_ok:notification.ok,shipment_linked:chain.linked===true})
  });
 }catch{}
 const securedReceipt={...receiptWithCartons,photos:securedPhotos};
 return{receipt:securedReceipt,customer:{id:customer.id,code:customer.gc_code||customer.code,name:customer.name,phone:customer.whatsapp_phone||customer.phone||customer.phone2},chain,whatsapp_message:whatsappMessage,notification,duplicate:false}}
async function listReceipts(req:Request){
 const{admin,staff}=await actor(req);
 const{data,error}=await admin.from('warehouse_receipts').select('*').order('received_at',{ascending:false}).limit(500);
 if(error)throw error;
 const visible=(data||[]).filter(item=>locationAllowed(staff,String(item.location||item.source_warehouse||item.warehouse||''))).slice(0,100);
 if(!visible.length)return{items:[]};
 const ids=visible.map(item=>String(item.id));
 const cartonResult=await admin.from('warehouse_receipt_cartons')
  .select('id,receipt_id,customer_directory_id,gc_code,carton_index,carton_total,carton_code,warehouse_location,received_at,status,package_id,created_by_name,notes,created_at')
  .in('receipt_id',ids).order('carton_index',{ascending:true});
 if(cartonResult.error)throw cartonResult.error;
 const byReceipt=new Map<string,Array<Record<string,any>>>();
 for(const carton of cartonResult.data||[]){
  const list=byReceipt.get(String(carton.receipt_id))||[];
  list.push(carton);byReceipt.set(String(carton.receipt_id),list);
 }
 const items=await Promise.all(visible.map(async item=>({
  ...item,
  photos:await signedPhotos(admin,item.photos),
  cartons:(byReceipt.get(String(item.id))||[]).filter(carton=>String(carton.customer_directory_id)===String(item.directory_customer_id))
 })));
 return{items}
}
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response(null,{headers:cors(req)});try{if(req.method==='POST')return json(req,await createReceipt(req));if(req.method==='GET')return json(req,await listReceipts(req));return json(req,{error:'Method not allowed'},405)}catch(error){const message=error instanceof Error?error.message:String(error);const status=/Unauthorized/i.test(message)?401:/Forbidden|permission|branch/i.test(message)?403:/not found|required|must be|belong/i.test(message)?400:500;return json(req,{error:message},status)}})
