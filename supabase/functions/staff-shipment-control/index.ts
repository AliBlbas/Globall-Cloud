import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGINS = new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const STAFF_ROLES = new Set(['super_admin','admin','accountant','finance','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','delivery','driver'])
const ADMIN_ROLES = new Set(['super_admin','admin'])
const OPS_ROLES = new Set(['super_admin','admin','operations','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','delivery','driver'])
const STATUS = new Set(['received_origin','in_transit','at_transit_hub','customs','out_for_delivery','delivered','on_hold','cancelled'])

const cors = (req: Request) => ({
  'Content-Type':'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': ORIGINS.has(req.headers.get('origin') || '') ? (req.headers.get('origin') || '') : 'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Cache-Control':'no-store',
  'Vary':'Origin'
})
const out = (req:Request, body:unknown, status=200) => new Response(JSON.stringify(body), { status, headers: cors(req) })
const text = (v:unknown) => v == null ? '' : String(v).trim()
const finite = (v:unknown) => v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null

const CARGO_CURRENCIES = new Set(['USD','IQD','AED']);
function normalizeCargoRows(raw, fallbackCode, allowIds) {
  if (!Array.isArray(raw)) throw new Error('Cargo items must be a list');
  if (raw.length > 100) throw new Error('A shipment can contain at most 100 cargo rows');
  return raw.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid cargo item');
    const itemName = text(entry.item_name);
    if (!itemName || itemName.length > 200) throw new Error('Each cargo item needs a name of at most 200 characters');
    const code = text(entry.customer_gc_code) || fallbackCode;
    const customerCode = code ? String(code).normalize('NFKC').trim().toUpperCase().replace(/\s+/g,'') : '';
    if (!/^GC-[A-Z0-9-]{2,30}$/.test(customerCode)) throw new Error('Each cargo item requires a valid GC customer code');
    const id = text(entry.id);
    if (id && (!allowIds || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) throw new Error('Invalid cargo item id');
    const number = (value, label, integer) => {
      const n = value == null || value === '' ? 0 : Number(value);
      if (!Number.isFinite(n) || n < 0 || (integer && !Number.isSafeInteger(n))) throw new Error('Invalid cargo ' + label);
      return n;
    };
    const currency = text(entry.currency || 'USD').toUpperCase();
    if (!CARGO_CURRENCIES.has(currency)) throw new Error('Invalid cargo currency');
    const itemStatus = text(entry.item_status || 'received_origin');
    if (!STATUS.has(itemStatus)) throw new Error('Invalid cargo item status');
    const notes = text(entry.notes);
    if (notes.length > 500) throw new Error('Cargo notes are limited to 500 characters');
    return { id: id || null, customer_gc_code: customerCode, item_name: itemName, quantity_pc: number(entry.quantity_pc, 'piece count', true), box_count: number(entry.box_count, 'box count', true), weight_kg: number(entry.weight_kg, 'weight', false), declared_value: number(entry.declared_value, 'declared value', false), currency, item_status: itemStatus, notes: notes || null };
  });
}
async function resolveCargoDirectoryIds(db, items) {
  const cache = new Map();
  for (const item of items) {
    if (!cache.has(item.customer_gc_code)) {
      const found = await db.from('customer_directory').select('id').or('gc_code.eq.' + item.customer_gc_code + ',code.eq.' + item.customer_gc_code).limit(1).maybeSingle();
      if (found.error) throw found.error;
      if (!found.data) throw new Error('GC customer code not found: ' + item.customer_gc_code);
      cache.set(item.customer_gc_code, found.data.id);
    }
    item.customer_directory_id = cache.get(item.customer_gc_code);
  }
  return items;
}


async function auth(req:Request) {
  const url = Deno.env.get('SUPABASE_URL') || ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || ''
  const authorization = req.headers.get('Authorization') || ''
  if (!url || !anon || !service || !/^Bearer\s+/i.test(authorization)) throw new Error('Unauthorized')
  const ac = createClient(url, anon, { global:{headers:{Authorization:authorization}}, auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} })
  const u = await ac.auth.getUser()
  if (u.error || !u.data.user) throw new Error('Unauthorized')
  const db = createClient(url, service, { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} })
  const { data: staff, error } = await db.from('staff').select('id,full_name,role,branch,is_active,email').eq('id',u.data.user.id).maybeSingle()
  if (error) throw error
  if (!staff?.is_active || !STAFF_ROLES.has(String(staff.role))) throw new Error('Staff permission required')
  return { db, user:u.data.user, staff }
}

async function activity(db:any, staff:any, action:string, targetId:string, details:unknown) {
  await db.from('staff_activity_log').insert({
    staff_id:staff.id, staff_name:staff.full_name, action, target_id:targetId,
    details:JSON.stringify(details ?? {})
  })
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

Deno.serve(async (req:Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers:cors(req)})
  try {
    if (req.method !== 'POST') return out(req,{error:'Method not allowed'},405)
    const a = await auth(req)
    const body = await req.json().catch(() => ({}))
    const p = body.data || body
    const id = text(p.id)
    if (!id) return out(req,{error:'Shipment id is required'},400)

    const role = String(a.staff.role)
    if (!OPS_ROLES.has(role)) return out(req,{error:'Operational permission required'},403)
    if (['finance','accountant'].includes(role)) return out(req,{error:'Operational permission required'},403)

    const requestedStatus = text(p.status)
    if (requestedStatus && !STATUS.has(requestedStatus)) return out(req,{error:'Invalid shipment status'},400)

    const current = await a.db.from('shipments').select('*').eq('id',id).maybeSingle()
    if (current.error) throw current.error
    if (!current.data) return out(req,{error:'Shipment not found'},404)

    const hasCargoItems = Object.prototype.hasOwnProperty.call(p, 'cargo_items')
    const hasDeletedCargoIds = Object.prototype.hasOwnProperty.call(p, 'deleted_cargo_item_ids')
    let cargoItems = []
    let deletedCargoIds = []
    let existingCargoIds = new Set()
    if (hasCargoItems || hasDeletedCargoIds) {
      const existingCargo = await a.db.from('shipment_cargo_items').select('id').eq('shipment_id',id)
      if (existingCargo.error) throw existingCargo.error
      existingCargoIds = new Set((existingCargo.data || []).map((item) => String(item.id)))
    }
    if (hasCargoItems) {
      cargoItems = normalizeCargoRows(p.cargo_items, text(current.data.customer_gc_code), true)
      for (const item of cargoItems) {
        if (item.id && !existingCargoIds.has(item.id)) return out(req,{error:'Cargo item does not belong to this shipment'},400)
      }
      await resolveCargoDirectoryIds(a.db, cargoItems)
    }
    if (hasDeletedCargoIds) {
      if (!Array.isArray(p.deleted_cargo_item_ids) || p.deleted_cargo_item_ids.length > 100) return out(req,{error:'Invalid deleted cargo item list'},400)
      deletedCargoIds = Array.from(new Set(p.deleted_cargo_item_ids.map((value) => text(value))))
      if (deletedCargoIds.some((cargoId) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cargoId) || !existingCargoIds.has(cargoId))) return out(req,{error:'Deleted cargo item does not belong to this shipment'},400)
      if (cargoItems.some((item) => item.id && deletedCargoIds.includes(item.id))) return out(req,{error:'Cargo row cannot be edited and deleted in the same request'},400)
    }

    const isAdmin = ADMIN_ROLES.has(role)
    const patch:any = {}
    const add = (key:string, value:unknown) => { if (value !== undefined) patch[key] = value }

    add('status', requestedStatus || current.data.status)
    add('operational_status', requestedStatus || current.data.operational_status || current.data.status)
    add('transport_mode', text(p.transport_mode) || current.data.transport_mode)
    add('origin_warehouse', text(p.origin_warehouse) || current.data.origin_warehouse)
    add('destination_warehouse', text(p.destination_warehouse) || current.data.destination_warehouse)
    add('current_location_label', text(p.current_location_label) || text(p.location_label) || current.data.current_location_label || current.data.origin_warehouse)
    add('cargo_description', p.cargo_description !== undefined ? text(p.cargo_description) : current.data.cargo_description)
    add('carton_count', p.carton_count !== undefined ? Math.max(0,Number(p.carton_count || 0)) : current.data.carton_count)
    add('actual_weight_kg', p.actual_weight_kg !== undefined ? finite(p.actual_weight_kg) : current.data.actual_weight_kg)
    add('length_cm', p.length_cm !== undefined ? finite(p.length_cm) : current.data.length_cm)
    add('width_cm', p.width_cm !== undefined ? finite(p.width_cm) : current.data.width_cm)
    add('height_cm', p.height_cm !== undefined ? finite(p.height_cm) : current.data.height_cm)
    add('eta', p.eta !== undefined ? (text(p.eta) || null) : current.data.eta)
    add('priority', p.priority !== undefined ? (text(p.priority) || 'normal') : current.data.priority)
    if (p.dispatched_at !== undefined) {
      const rawDispatchedAt = text(p.dispatched_at)
      let normalizedDispatchedAt:string|null = null
      if (rawDispatchedAt) {
        const timestamp = new Date(rawDispatchedAt).getTime()
        if (!Number.isFinite(timestamp)) return out(req,{error:'Invalid dispatch date'},400)
        normalizedDispatchedAt = new Date(timestamp).toISOString()
      }
      patch.dispatched_at = normalizedDispatchedAt
      const stepDates = { ...(current.data.step_dates || {}) }
      if (normalizedDispatchedAt) stepDates.departed = normalizedDispatchedAt
      else delete stepDates.departed
      patch.step_dates = stepDates
    }

    if (p.length_cm !== undefined || p.width_cm !== undefined || p.height_cm !== undefined || p.actual_weight_kg !== undefined) {
      const l = finite(addValue(p.length_cm,current.data.length_cm))
      const w = finite(addValue(p.width_cm,current.data.width_cm))
      const h = finite(addValue(p.height_cm,current.data.height_cm))
      const actual = finite(addValue(p.actual_weight_kg,current.data.actual_weight_kg))
      const vol = l != null && w != null && h != null ? (l*w*h)/6000 : null
      patch.volumetric_weight_kg = vol
      patch.chargeable_weight_kg = p.chargeable_weight_kg !== undefined ? finite(p.chargeable_weight_kg) : (vol == null ? actual : Math.max(actual || 0, vol))
      patch.weight_kg = actual
    }

    if (isAdmin) {
      add('total_amount', p.total_amount !== undefined ? Math.max(0,Number(p.total_amount || 0)) : current.data.total_amount)
      add('paid_amount', p.paid_amount !== undefined ? Math.max(0,Number(p.paid_amount || 0)) : current.data.paid_amount)
      add('assigned_staff_id', p.assigned_staff_id !== undefined ? (text(p.assigned_staff_id) || null) : current.data.assigned_staff_id)
      add('branch', p.branch !== undefined ? (text(p.branch) || a.staff.branch || 'all') : current.data.branch)
    } else {
      delete patch.total_amount
      delete patch.paid_amount
      delete patch.assigned_staff_id
      delete patch.branch
    }

    if (hasCargoItems) {
      const liveItems = cargoItems.filter((item) => !item.id || !deletedCargoIds.includes(item.id))
      const totalPieces = liveItems.reduce((sum, item) => sum + Number(item.quantity_pc || 0), 0)
      const totalBoxes = liveItems.reduce((sum, item) => sum + Number(item.box_count || 0), 0)
      patch.items_count = totalPieces
      patch.pc_count = totalPieces
      patch.box_count = totalBoxes
      patch.carton_count = totalBoxes
    }

    patch.updated_at = new Date().toISOString()
    patch.tracking_updated_at = new Date().toISOString()

    const changedStatus = requestedStatus && requestedStatus !== current.data.status
    const changedLocation = text(p.current_location_label || p.location_label) && text(p.current_location_label || p.location_label) !== text(current.data.current_location_label)
    if (changedStatus) {
      const now = new Date().toISOString()
      const stepDates = { ...(patch.step_dates || current.data.step_dates || {}) }
      stepDates[requestedStatus] = now
      if (requestedStatus === 'in_transit' && !stepDates.departed && p.dispatched_at === undefined) stepDates.departed = now
      patch.step_dates = stepDates
      patch.current_step_index = stepIndex(requestedStatus)
    }

    const { data: row, error } = await a.db.from('shipments').update(patch).eq('id',id).select('*').single()
    if (error) throw error

    let cargoRowsUpdated = 0
    if (hasCargoItems) {
      for (const item of cargoItems) {
        const record = {
          shipment_id:id, customer_directory_id:item.customer_directory_id, customer_gc_code:item.customer_gc_code,
          item_name:item.item_name, quantity_pc:item.quantity_pc, box_count:item.box_count, weight_kg:item.weight_kg,
          declared_value:item.declared_value, currency:item.currency, item_status:item.item_status, notes:item.notes,
          updated_by:a.staff.id, updated_at:new Date().toISOString()
        }
        if (item.id) {
          const updated = await a.db.from('shipment_cargo_items').update(record).eq('shipment_id',id).eq('id',item.id).select('id').maybeSingle()
          if (updated.error) throw updated.error
          if (!updated.data) throw new Error('Cargo item update failed')
        } else {
          record.created_by = a.staff.id
          const inserted = await a.db.from('shipment_cargo_items').insert(record).select('id').single()
          if (inserted.error) throw inserted.error
        }
        cargoRowsUpdated++
      }
      if (deletedCargoIds.length) {
        const deleted = await a.db.from('shipment_cargo_items').delete().eq('shipment_id',id).in('id',deletedCargoIds)
        if (deleted.error) throw deleted.error
      }
    }

    const linkedCustomers = await syncShipmentCustomerLinks(a.db,id,current.data.directory_customer_id ? String(current.data.directory_customer_id) : null,a.staff.id,true)
    let eventSeeded = false
    let notificationResult = {attempted:0,saved:0,warning:null as string|null}
    if (changedStatus || changedLocation || text(p.note) || hasCargoItems || hasDeletedCargoIds) {
      const isContentUpdate = Boolean(hasCargoItems || hasDeletedCargoIds)
      const title = changedStatus ? 'Status گۆڕدرا بۆ ' + requestedStatus : isContentUpdate ? 'ناوەڕۆکی بار نوێکرایەوە' : 'نوێکردنەوەی عملیات'
      const note = text(p.note) || (changedStatus ? 'Status لەلایەن ' + a.staff.full_name + ' نوێکرایەوە.' : isContentUpdate ? 'وردەکاریی ناوەڕۆکی بار لەلایەن ' + a.staff.full_name + ' نوێکرایەوە.' : 'دۆخی بار لەلایەن ' + a.staff.full_name + ' نوێکرایەوە.')
      const ev = await a.db.from('shipment_tracking_events').insert({
        shipment_id:id,
        status_key:requestedStatus || row.status || 'received_origin',
        title,
        note,
        location_label: text(p.current_location_label || p.location_label) || row.current_location_label || row.origin_warehouse,
        created_by:a.staff.id,
        created_by_name:a.staff.full_name,
        is_public:p.is_public !== false
      }).select('id').single()
      if (ev.error) throw ev.error
      eventSeeded = true
      if (p.is_public !== false) {
        const kind = changedStatus ? 'shipment_status' : isContentUpdate ? 'shipment_contents' : 'shipment_update'
        notificationResult = await notifyShipmentCustomers(a.db,linkedCustomers,String(id),String(row.tracking_id || row.tracking_number || row.customer_gc_code || id),'event-' + String(ev.data.id),kind,String(row.operational_status || row.status || ''),String(row.current_location_label || row.origin_warehouse || ''))
      }
    }

    await activity(a.db,a.staff,'shipment.update',id,{before:{status:current.data.status,location:current.data.current_location_label,dispatched_at:current.data.dispatched_at},after:{status:row.status,location:row.current_location_label,dispatched_at:row.dispatched_at},cargo_items:{submitted:hasCargoItems,upserted:cargoRowsUpdated,deleted:deletedCargoIds.length,items:cargoItems.map((item) => ({id:item.id||null,customer_gc_code:item.customer_gc_code,item_name:item.item_name,quantity_pc:item.quantity_pc,box_count:item.box_count}))},role})
    return out(req,{shipment:row,event_seeded:eventSeeded,cargo_items_saved:cargoRowsUpdated,cargo_items_deleted:deletedCargoIds.length,linked_customer_count:linkedCustomers.length,notifications_attempted:notificationResult.attempted,notifications_saved:notificationResult.saved,notification_warning:notificationResult.warning})
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const status = /Unauthorized/i.test(message) ? 401 : /permission|Forbidden/i.test(message) ? 403 : /already exists/i.test(message) ? 409 : /required|requires|needs|Invalid|invalid|at most|cannot|must be|not found/i.test(message) ? 400 : 500
    return out(req,{error:message},status)
  }
})

function addValue(next:unknown, fallback:unknown) { return next === undefined ? fallback : next }
function stepIndex(status:string) {
  return ({received_origin:0,in_transit:1,at_transit_hub:2,customs:3,out_for_delivery:4,delivered:5,on_hold:6,cancelled:7} as Record<string,number>)[status] ?? 0
}