import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const cors = (req: Request) => ({
  ...(ORIGINS.has(req.headers.get('origin') || '') ? {'Access-Control-Allow-Origin': req.headers.get('origin') || ''} : {}),
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Cache-Control': 'no-store',
  'Vary': 'Origin',
})
const json = (req: Request, body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {'Content-Type': 'application/json; charset=utf-8', ...cors(req)},
})
const env = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const numberOrNull = (value: unknown, max: number) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 && number <= max ? number : null
}
const CARGO_PHOTO_BUCKET = 'customer-request-photos'
const WAREHOUSE_RECEIPT_BUCKET = 'warehouse-receipts'
const WAREHOUSE_RECEIPT_SIGNED_URL_TTL = 24 * 60 * 60
function warehouseReceiptStoragePath(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw)) return decodeURIComponent(raw.replace(/^\/+/, ''))
  const markers = [
    `/storage/v1/object/public/${WAREHOUSE_RECEIPT_BUCKET}/`,
    `/storage/v1/object/sign/${WAREHOUSE_RECEIPT_BUCKET}/`,
    `/storage/v1/object/authenticated/${WAREHOUSE_RECEIPT_BUCKET}/`
  ]
  for (const marker of markers) {
    const index = raw.indexOf(marker)
    if (index >= 0) return decodeURIComponent(raw.slice(index + marker.length).split('?')[0])
  }
  return null
}
async function secureWarehouseReceiptPhotos(service: any, receipt: Record<string, any>) {
  const values = Array.isArray(receipt.photos) ? receipt.photos : []
  const paths = values.map(warehouseReceiptStoragePath).filter((value): value is string => Boolean(value))
  if (!paths.length) return { ...receipt, photos: [] }
  try {
    const { data, error } = await service.storage.from(WAREHOUSE_RECEIPT_BUCKET).createSignedUrls(paths, WAREHOUSE_RECEIPT_SIGNED_URL_TTL)
    if (error) throw error
    const photos = (data || []).map((item: any) => item?.signedUrl || null).filter((value: unknown): value is string => typeof value === 'string' && /^https?:\/\//i.test(value))
    return { ...receipt, photos }
  } catch (error) {
    console.warn('[customer-self] receipt evidence signing failed', error instanceof Error ? error.message : String(error))
    return { ...receipt, photos: [] }
  }
}
const CARGO_PHOTO_MAX_BYTES = 10 * 1024 * 1024
const CARGO_PHOTO_MIMES_BY_EXTENSION: Record<string, string[]> = {
  jpg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  jpeg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  avif: ['image/avif'],
  gif: ['image/gif'],
  heic: ['image/heic', 'image/heif'],
  heif: ['image/heif', 'image/heic'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: cors(req)})
  if (!['GET', 'POST'].includes(req.method)) return json(req, {error: 'Method not allowed'}, 405)
  const authorization = req.headers.get('authorization') || ''
  if (!authorization.toLowerCase().startsWith('bearer ')) return json(req, {error: 'Unauthorized'}, 401)

  try {
    const url = env('SUPABASE_URL')
    const anonKey = env('SUPABASE_ANON_KEY')
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
    const authClient = createClient(url, anonKey, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}, global: {headers: {Authorization: authorization}}})
    const {data: userData, error: userError} = await authClient.auth.getUser()
    const user = userData.user
    if (userError || !user) return json(req, {error: 'Unauthorized'}, 401)

    const service = createClient(url, serviceKey, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}})
    let body: Record<string, unknown> = {}
    if (req.method === 'POST') {
      try { body = await req.json() } catch { return json(req, {error: 'Invalid JSON body.'}, 400) }
    }
    const action = text(body.action, 60)
    const data = (body.data && typeof body.data === 'object') ? body.data as Record<string, unknown> : {}

    if (req.method === 'POST' && action === 'claim_account') {
      // A GC code and a phone number alone do not prove ownership of an account.
      // Keep legacy client compatibility, but require staff-verified provisioning.
      return json(req, {
        error: 'For account safety, self-service linking is disabled. Please contact Globall Cloud staff to verify your identity and link your customer account securely.'
      }, 403)
    }

    const {data: customer, error: customerError} = await service
      .from('customer_directory')
      .select('id,code,gc_code,name,email,phone,phone2,whatsapp_phone,whatsapp_group_name,purchase_first_name,purchase_last_name,preferred_language,auth_user_id,is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (customerError) throw customerError
    if (!customer || customer.is_active !== true) return json(req, {error: 'Customer account is not active.'}, 403)

    if (req.method === 'POST') {
      // The request body was parsed once above; reusing it avoids consuming the stream twice.

      if (action === 'update_profile') {
        const name = text(data.full_name, 160)
        const phone = text(data.phone, 40)
        const email = text(data.email, 180).toLowerCase()
        const language = text(data.language, 8)
        const avatarUrl = text(data.avatar_url, 1000)
        if (name.length < 2) return json(req, {error: 'Full name is required.'}, 400)
        if (language && !['ckb', 'ar', 'en'].includes(language)) return json(req, {error: 'Unsupported language.'}, 400)
        const authPatch: Record<string, unknown> = { data: { ...user.user_metadata, full_name: name, avatar_url: avatarUrl || user.user_metadata?.avatar_url || null, preferred_language: language || customer.preferred_language || 'ckb' } }
        if (email && email !== String(user.email || '').toLowerCase()) authPatch.email = email
        if (phone && phone !== String(user.phone || '')) authPatch.phone = phone
        const {error: authUpdateError} = await authClient.auth.updateUser(authPatch)
        if (authUpdateError) return json(req, {error: authUpdateError.message || 'Profile authentication data could not be updated.'}, 400)
        const {data: updatedCustomer, error: customerUpdateError} = await service
          .from('customer_directory')
          .update({
            name,
            phone: phone || null,
            email: email || null,
            preferred_language: language || customer.preferred_language || 'ckb',
            updated_at: new Date().toISOString(),
          })
          .eq('id', customer.id)
          .select('id,code,gc_code,name,email,phone,preferred_language')
          .single()
        if (customerUpdateError) throw customerUpdateError
        return json(req, {ok: true, profile: updatedCustomer, email_confirmation_required: Boolean(email && email !== String(user.email || '').toLowerCase())})
      }

      if (action === 'update_notification_preferences') {
        const allowed = (value: unknown) => value === true
        const quietStart = text(data.quiet_hours_start, 8) || null
        const quietEnd = text(data.quiet_hours_end, 8) || null
        const {data:preferences, error} = await service.from('customer_notification_preferences').upsert({
          customer_user_id: user.id,
          email_enabled: allowed(data.email_enabled),
          whatsapp_enabled: allowed(data.whatsapp_enabled),
          sms_enabled: allowed(data.sms_enabled),
          in_app_enabled: data.in_app_enabled === undefined ? true : allowed(data.in_app_enabled),
          quiet_hours_start: quietStart,
          quiet_hours_end: quietEnd,
          updated_at: new Date().toISOString(),
        }, {onConflict:'customer_user_id'}).select('*').single()
        if (error) throw error
        return json(req, {ok: true, preferences})
      }

      if (action === 'mark_notification_read') {
        const id = text(data.id, 100)
        if (!id) return json(req, {error: 'Notification id is required.'}, 400)
        const {error} = await service.from('customer_notifications').update({read_at: new Date().toISOString()}).eq('id', id).eq('customer_user_id', user.id)
        if (error) throw error
        return json(req, {ok: true})
      }

      if (action === 'accept_quote') {
        const quoteId = text(data.id, 100)
        if (!quoteId) return json(req, {error: 'Quote id is required.'}, 400)
        const {error} = await service.rpc('accept_quote_request', {p_customer_id: user.id, p_quote_id: quoteId})
        if (error) throw error
        return json(req, {ok: true})
      }

      if (action === 'chat_send') {
        const bodyText = text(data.body, 4000)
        if (!bodyText) return json(req, {error: 'Message body is required.'}, 400)
        let threadId = text(data.thread_id, 100)
        if (threadId) {
          const {data: thread, error: threadError} = await service.from('customer_chat_threads').select('id,customer_user_id,status').eq('id', threadId).maybeSingle()
          if (threadError) throw threadError
          if (!thread || String(thread.customer_user_id) !== String(user.id)) return json(req, {error: 'Chat thread not found.'}, 404)
          if (thread.status === 'closed') return json(req, {error: 'This chat is closed.'}, 409)
        } else {
          const {data: thread, error: createError} = await service.from('customer_chat_threads').insert({customer_user_id:user.id, subject:text(data.subject, 160) || 'Customer Support', status:'open', priority:'normal'}).select('id').single()
          if (createError) throw createError
          threadId = thread.id
        }
        const {data: message, error: messageError} = await service.from('customer_chat_messages').insert({thread_id:threadId, sender_user_id:user.id, sender_type:'customer', body:bodyText, attachments:Array.isArray(data.attachments) ? data.attachments : []}).select('id,thread_id,sender_user_id,sender_type,body,created_at,read_at').single()
        if (messageError) throw messageError
        const now = new Date().toISOString()
        await service.from('customer_chat_threads').update({last_message_at:now, updated_at:now}).eq('id',threadId).eq('customer_user_id',user.id)
        return json(req, {ok:true, message, thread_id:threadId})
      }

      if (action === 'chat_mark_read') {
        const threadId = text(data.thread_id, 100)
        if (!threadId) return json(req, {error:'Thread id is required.'}, 400)
        const {data: thread, error: threadError} = await service.from('customer_chat_threads').select('id').eq('id',threadId).eq('customer_user_id',user.id).maybeSingle()
        if (threadError) throw threadError
        if (!thread) return json(req, {error:'Chat thread not found.'}, 404)
        const {error} = await service.from('customer_chat_messages').update({read_at:new Date().toISOString()}).eq('thread_id',threadId).eq('sender_type','staff').is('read_at',null)
        if (error) throw error
        return json(req, {ok:true})
      }

      if (action === 'request_quote') {
        const originKey = text(data.origin_key, 100)
        const destKey = text(data.dest_key, 100)
        const transportMode = text(data.transport_mode, 30).toLowerCase()
        const weight = numberOrNull(data.weight_kg, 50000)
        const volume = numberOrNull(data.volume_cbm, 100000)
        const items = numberOrNull(data.items_count, 1000000)
        const serviceLevel = text(data.service_level, 30) || 'standard'
        const incoterm = text(data.incoterm, 12) || 'EXW'
        const notes = text(data.notes, 2000)
        const requestType = text(data.request_type, 24) || 'quote'
        const cargoCountry = text(data.cargo_country, 100)
        const cargoDescription = text(data.cargo_description, 2000)
        const requestedCargoImagePath = text(data.cargo_image_path, 240)
        const quantityValid = transportMode === 'sea' ? volume !== null && volume > 0 : weight !== null && weight > 0
        if (originKey.length < 2 || destKey.length < 2 || !['air', 'sea', 'land', 'multimodal'].includes(transportMode) || !['standard', 'express', 'priority'].includes(serviceLevel) || !['EXW', 'FOB', 'CIF', 'DDP'].includes(incoterm) || !['quote', 'shipment'].includes(requestType) || !quantityValid) return json(req, {error: 'Please check the required quote fields.'}, 400)

        let cargoImagePath: string | null = null
        if (requestedCargoImagePath) {
          const pathParts = requestedCargoImagePath.split('/')
          const photoName = pathParts.length === 2 ? pathParts[1] : ''
          const photoMatch = photoName.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|jpeg|png|webp|avif|gif|heic|heif)$/i)
          const extension = photoMatch?.[2]?.toLowerCase() || ''
          const allowedMimes = CARGO_PHOTO_MIMES_BY_EXTENSION[extension]
          if (pathParts.length !== 2 || pathParts[0] !== user.id || !photoMatch || !allowedMimes) return json(req, {error: 'Invalid cargo image attachment.'}, 400)
          const {data:storedPhotos, error:photoListError} = await service.storage.from(CARGO_PHOTO_BUCKET).list(user.id, {limit: 100, search: photoName})
          if (photoListError) throw photoListError
          const storedPhoto = (storedPhotos || []).find((photo) => photo.name === photoName)
          const metadata = storedPhoto?.metadata as Record<string, unknown> | null | undefined
          const size = Number(metadata?.size ?? metadata?.contentLength ?? Number.NaN)
          const storedMime = text(metadata?.mimetype ?? metadata?.content_type, 100).toLowerCase()
          if (!storedPhoto || !Number.isFinite(size) || size < 1 || size > CARGO_PHOTO_MAX_BYTES || (storedMime && !allowedMimes.includes(storedMime))) return json(req, {error: 'Invalid cargo image attachment.'}, 400)
          cargoImagePath = requestedCargoImagePath
        }

        const {data: rows, error} = await service.from('quote_requests').insert({
          customer_user_id: user.id,
          customer_name: customer.name || user.user_metadata?.full_name || user.email || 'Customer',
          customer_phone: customer.phone || user.phone || null,
          origin_key: originKey,
          dest_key: destKey,
          transport_mode: transportMode,
          weight_kg: weight,
          volume_cbm: volume,
          items_count: items,
          service_level: serviceLevel,
          incoterm,
          request_type: requestType,
          cargo_country: cargoCountry || null,
          cargo_description: cargoDescription || null,
          cargo_image_path: cargoImagePath,
          notes: notes || null,
          status: 'pending',
        }).select('id').single()
        if (error) throw error
        return json(req, {ok: true, request: rows}, 201)
      }
      return json(req, {error: 'Unsupported customer action.'}, 400)
    }


    const shipmentSelect = 'id,tracking_id,tracking_number,customer_gc_code,customer_name,origin,destination,origin_key,dest_key,type,transport_mode,status,operational_status,current_step_index,current_location_label,current_lat,current_lng,tracking_updated_at,total_amount,paid_amount,eta,items_count,box_count,carton_count,weight_kg,cargo_description,directory_customer_id,created_at,updated_at'
    const [ownedLinksResult, ownCargoResult, userShipmentsResult, directoryShipmentsResult] = await Promise.all([
      service.from('shipment_customer_links').select('shipment_id,customer_directory_id,customer_user_id,customer_gc_code').eq('customer_directory_id', customer.id).limit(2000),
      service.from('shipment_cargo_items').select('id,shipment_id,customer_directory_id,item_name,quantity_pc,box_count,weight_kg,item_status,notes,declared_value,currency,created_at').eq('customer_directory_id', customer.id).order('created_at', {ascending:false}).limit(2000),
      service.from('shipments').select(shipmentSelect).eq('customer_user_id', user.id).order('created_at', {ascending:false}).limit(100),
      service.from('shipments').select(shipmentSelect).eq('directory_customer_id', customer.id).order('created_at', {ascending:false}).limit(100),
    ])
    const initialResults = [ownedLinksResult, ownCargoResult, userShipmentsResult, directoryShipmentsResult]
    const initialFailed = initialResults.find((result:any) => result?.error)
    if (initialFailed?.error) throw initialFailed.error
    const ownedLinks = ownedLinksResult.data || []
    const ownCargoAll = ownCargoResult.data || []
    const relatedIds = new Set<string>()
    for (const link of ownedLinks) if (link.shipment_id) relatedIds.add(String(link.shipment_id))
    for (const item of ownCargoAll) if (item.shipment_id) relatedIds.add(String(item.shipment_id))
    let relatedShipments:any[] = []
    if (relatedIds.size) {
      const relatedResult = await service.from('shipments').select(shipmentSelect).in('id', [...relatedIds]).order('created_at', {ascending:false}).limit(1000)
      if (relatedResult.error) throw relatedResult.error
      relatedShipments = relatedResult.data || []
    }
    const shipmentMap = new Map<string, any>()
    for (const item of userShipmentsResult.data || []) {
      if (!item.directory_customer_id || String(item.directory_customer_id) === String(customer.id)) shipmentMap.set(String(item.id), item)
    }
    for (const item of directoryShipmentsResult.data || []) shipmentMap.set(String(item.id), item)
    for (const item of relatedShipments) shipmentMap.set(String(item.id), item)
    const shipmentRows = [...shipmentMap.values()].sort((a:any,b:any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0,100)
    const shipmentIds = shipmentRows.map((item:any) => String(item.id)).filter(Boolean)
    const ownCargoRows = ownCargoAll.filter((item:any) => shipmentIds.includes(String(item.shipment_id))).map((item:any) => ({
      id:item.id, shipment_id:String(item.shipment_id), item_name:item.item_name || 'Cargo item',
      quantity_pc:Number(item.quantity_pc || 0), box_count:Number(item.box_count || 0),
      weight_kg:Number(item.weight_kg || 0), item_status:item.item_status || null,
      notes:item.notes || null, declared_value:item.declared_value ?? null, currency:item.currency || null,
      created_at:item.created_at || null
    }))
    let membershipRows:any[] = []
    let cargoOwnershipRows:any[] = []
    if (shipmentIds.length) {
      const [membershipResult, cargoMembershipResult] = await Promise.all([
        service.from('shipment_customer_links').select('shipment_id,customer_directory_id').in('shipment_id', shipmentIds).limit(5000),
        service.from('shipment_cargo_items').select('shipment_id,customer_directory_id').in('shipment_id', shipmentIds).limit(5000),
      ])
      if (membershipResult.error) throw membershipResult.error
      if (cargoMembershipResult.error) throw cargoMembershipResult.error
      membershipRows = membershipResult.data || []
      cargoOwnershipRows = cargoMembershipResult.data || []
    }
    // Build a distinct owner set from membership links, the primary directory
    // owner, and actual cargo. This remains conservative if a link row is stale
    // or temporarily missing, preventing consolidated-shipment data leaks.
    const ownersByShipment = new Map<string, Set<string>>()
    const addOwner = (shipmentId:any, directoryId:any) => {
      if (!shipmentId || !directoryId) return
      const key = String(shipmentId)
      if (!ownersByShipment.has(key)) ownersByShipment.set(key, new Set<string>())
      ownersByShipment.get(key)!.add(String(directoryId))
    }
    for (const link of membershipRows) addOwner(link.shipment_id, link.customer_directory_id)
    for (const item of shipmentRows) addOwner(item.id, item.directory_customer_id)
    for (const item of cargoOwnershipRows) addOwner(item.shipment_id, item.customer_directory_id)
    const membershipCount = new Map<string, number>()
    for (const [key, owners] of ownersByShipment) membershipCount.set(key, owners.size)
    const directOwnedShipmentIds = new Set((userShipmentsResult.data || [])
      .filter((item:any) => !item.directory_customer_id || String(item.directory_customer_id) === String(customer.id))
      .map((item:any) => String(item.id)))
    const ownCargoByShipment=new Map<string,any[]>()
    for(const item of ownCargoRows){
      const key=String(item.shipment_id)
      if(!ownCargoByShipment.has(key))ownCargoByShipment.set(key,[])
      ownCargoByShipment.get(key)!.push(item)
    }
    const soloShipmentIds=shipmentRows.filter((item:any)=>{
      const owners=membershipCount.get(String(item.id))||0
      return owners===1||(owners===0&&directOwnedShipmentIds.has(String(item.id)))
    }).map((item:any)=>String(item.id))
    const safeShipments=shipmentRows.map((item:any)=>{
      const key=String(item.id)
      const mine=ownCargoByShipment.get(key)||[]
      const shared=(membershipCount.get(key)||0)>1
      const ownPieces=mine.reduce((sum:number,row:any)=>sum+Number(row.quantity_pc||0),0)
      const ownBoxes=mine.reduce((sum:number,row:any)=>sum+Number(row.box_count||0),0)
      const ownWeight=mine.reduce((sum:number,row:any)=>sum+Number(row.weight_kg||0),0)
      const ownDescription=mine.slice(0,8).map((row:any)=>String(row.item_name||'').trim()).filter(Boolean).join(' · ')
      return {
        ...item,
        tracking_id:item.tracking_id||item.tracking_number||null,
        customer_gc_code:customer.gc_code||customer.code||null,
        customer_name:customer.name||user.user_metadata?.full_name||user.email||'Customer',
        status:item.operational_status||item.status||null,
        total_amount:shared?null:item.total_amount,
        paid_amount:shared?null:item.paid_amount,
        items_count:shared?ownPieces:(mine.length?ownPieces:item.items_count),
        box_count:shared?ownBoxes:(mine.length?ownBoxes:item.box_count),
        weight_kg:shared?ownWeight:(mine.length?ownWeight:item.weight_kg),
        cargo_description:shared?(ownDescription||'کاڵای تایبەت بە هەژماری تۆ'):(ownDescription||item.cargo_description),
        customer_cargo_count:mine.length,
        is_consolidated:shared
      }
    })
    const financeCode=String(customer.gc_code||customer.code||'').normalize('NFKC').trim().toUpperCase()
    const [notifications,preferences,quotes,documentsByUser,invoicesByUser,events,receipts,chatThreads,customerTransactions]=await Promise.all([
      service.from('customer_notifications').select('id,shipment_id,kind,title,body,action_url,event_key,read_at,created_at').eq('customer_user_id',user.id).order('created_at',{ascending:false}).limit(30),
      service.from('customer_notification_preferences').select('email_enabled,whatsapp_enabled,sms_enabled,in_app_enabled,quiet_hours_start,quiet_hours_end,updated_at').eq('customer_user_id',user.id).maybeSingle(),
      service.from('quote_requests').select('id,origin_key,dest_key,transport_mode,weight_kg,volume_cbm,status,quoted_amount,currency,valid_until,created_at').eq('customer_user_id',user.id).order('created_at',{ascending:false}).limit(30),
      service.from('shipment_documents').select('id,shipment_id,document_type,title,file_url,is_public,document_status,created_at').eq('customer_user_id',user.id).order('created_at',{ascending:false}).limit(30),
      service.from('shipment_invoices').select('id,invoice_number,shipment_id,total,paid_total,currency,status,due_at,created_at').eq('customer_user_id',user.id).order('created_at',{ascending:false}).limit(50),
      shipmentIds.length?service.from('shipment_tracking_events').select('id,shipment_id,status_key,title,note,location_label,lat,lng,occurred_at,photos').in('shipment_id',shipmentIds).eq('is_public',true).order('occurred_at',{ascending:false}).limit(200):Promise.resolve({data:[],error:null}),
      service.from('warehouse_receipts').select('id,batch_code,warehouse,source_warehouse,location,stage,photo_taken_at,gc_code,gc_code_detected,verification_status,photos,shipment_id,received_at,carton_count,weight_actual,created_by_name,scan_code,notes').eq('directory_customer_id',customer.id).order('received_at',{ascending:false}).limit(50),
      service.from('customer_chat_threads').select('id,subject,status,priority,last_message_at,created_at').eq('customer_user_id',user.id).neq('status','closed').order('last_message_at',{ascending:false}).limit(30),
      financeCode ? service.from('finance_transactions').select('id,type,gc_code,amount_usd,reference,created_at').eq('gc_code',financeCode).in('type',['customer_charge','customer_payment','refund','adjustment']).order('created_at',{ascending:false}).limit(100) : Promise.resolve({data:[],error:null}),
    ])
    const firstResults=[notifications,preferences,quotes,documentsByUser,invoicesByUser,events,receipts,chatThreads,customerTransactions]
    const firstFailure=firstResults.find((result:any)=>result?.error)
    if(firstFailure?.error)throw firstFailure.error
    // Receipts and their carton manifest are scoped to the authenticated customer's
    // directory record. Do not return a carton merely because it shares a shipment ID.
    const receiptRows = receipts.data || []
    const receiptIds = receiptRows.map((receipt: Record<string, any>) => String(receipt.id)).filter(Boolean)
    let receiptCartons: Record<string, any>[] = []
    if (receiptIds.length) {
      const cartonResult = await service.from('warehouse_receipt_cartons')
        .select('receipt_id,gc_code,carton_index,carton_total,carton_code,warehouse_location,received_at,status')
        .in('receipt_id', receiptIds)
        .eq('customer_directory_id', customer.id)
        .order('carton_index', {ascending:true})
      if (cartonResult.error) throw cartonResult.error
      receiptCartons = cartonResult.data || []
    }
    const cartonsByReceipt = new Map<string, Record<string, any>[]>()
    for (const carton of receiptCartons) {
      const key = String(carton.receipt_id)
      const items = cartonsByReceipt.get(key) || []
      items.push(carton)
      cartonsByReceipt.set(key, items)
    }
    // The photo helper signs private object paths before the response reaches the browser.
    const customerReceipts = await Promise.all(receiptRows.map((receipt: Record<string, any>) =>
      secureWarehouseReceiptPhotos(service, {
        ...receipt,
        cartons: cartonsByReceipt.get(String(receipt.id)) || [],
      })
    ))
    // Join each warehouse-received notification to the authenticated owner's receipt evidence.
    // Photos are signed on this request and remain private in Storage; raw bucket paths are never returned.
    const receiptsById = new Map<string, Record<string, any>>()
    for (const receipt of customerReceipts) receiptsById.set(String(receipt.id), receipt)
    const customerNotifications = (notifications.data || []).map((notification: Record<string, any>) => {
      const eventKey = String(notification.event_key || '')
      const prefix = 'warehouse_received:'
      if (!eventKey.startsWith(prefix)) return notification
      const receipt = receiptsById.get(eventKey.slice(prefix.length))
      if (!receipt) return notification
      return {
        ...notification,
        receipt_id: receipt.id,
        receipt_photos: Array.isArray(receipt.photos) ? receipt.photos.slice(0, 8) : [],
        receipt_gc_code: receipt.gc_code_detected || receipt.gc_code || null,
        receipt_location: receipt.location || receipt.source_warehouse || receipt.warehouse || null,
        receipt_received_at: receipt.received_at || null,
        receipt_cartons: Array.isArray(receipt.cartons) ? receipt.cartons.map((carton: Record<string, any>) => ({
          code: carton.carton_code || null,
          index: carton.carton_index || null,
          total: carton.carton_total || null,
        })) : [],
      }
    })
    // Include public documents and legacy invoices attached to single-owner
    // shipments even when older staff records predate customer_user_id linking.
    // Never attach an unowned invoice/document from a consolidated shipment.
    const [soloDocumentsResult, soloInvoicesResult] = await Promise.all([
      soloShipmentIds.length ? service.from('shipment_documents').select('id,shipment_id,document_type,title,file_url,is_public,document_status,created_at').in('shipment_id',soloShipmentIds).is('customer_user_id',null).eq('is_public',true).order('created_at',{ascending:false}).limit(100) : Promise.resolve({data:[],error:null}),
      soloShipmentIds.length ? service.from('shipment_invoices').select('id,invoice_number,shipment_id,total,paid_total,currency,status,due_at,created_at').in('shipment_id',soloShipmentIds).is('customer_user_id',null).order('created_at',{ascending:false}).limit(100) : Promise.resolve({data:[],error:null}),
    ])
    if(soloDocumentsResult.error)throw soloDocumentsResult.error
    if(soloInvoicesResult.error)throw soloInvoicesResult.error
    const documentMap=new Map<string,any>()
    for(const row of documentsByUser.data||[])documentMap.set(String(row.id),row)
    for(const row of soloDocumentsResult.data||[])documentMap.set(String(row.id),row)
    const documents=[...documentMap.values()].sort((a:any,b:any)=>new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime()).slice(0,100)
    const invoiceMap=new Map<string,any>()
    for(const row of invoicesByUser.data||[])invoiceMap.set(String(row.id),row)
    for(const row of soloInvoicesResult.data||[])invoiceMap.set(String(row.id),row)
    const invoices=[...invoiceMap.values()].sort((a:any,b:any)=>new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime()).slice(0,100)
    const invoiceIds=invoices.map((item:any)=>item.id).filter(Boolean)
    const [payments,pods,ledger,packages]=await Promise.all([
      invoiceIds.length?service.from('payment_transactions').select('id,invoice_id,shipment_id,provider,status,amount,currency,method,paid_at,created_at').in('invoice_id',invoiceIds).order('created_at',{ascending:false}).limit(100):Promise.resolve({data:[],error:null}),
      soloShipmentIds.length?service.from('delivery_proofs').select('shipment_id,delivered_at,receiver_name,note,photo_urls,latitude,longitude,created_at').in('shipment_id',soloShipmentIds).order('created_at',{ascending:false}).limit(30):Promise.resolve({data:[],error:null}),
      soloShipmentIds.length?service.from('shipment_financial_ledger').select('shipment_id,entry_type,amount,currency,reference,note,created_at').in('shipment_id',soloShipmentIds).order('created_at',{ascending:false}).limit(200):Promise.resolve({data:[],error:null}),
      soloShipmentIds.length?service.from('shipment_packages').select('id,shipment_id,package_code,package_type,description,weight_kg,metadata').in('shipment_id',soloShipmentIds).order('created_at',{ascending:false}).limit(200):Promise.resolve({data:[],error:null}),
    ])
    const secondResults=[payments,pods,ledger,packages]
    const secondFailure=secondResults.find((result:any)=>result?.error)
    if(secondFailure?.error)throw secondFailure.error
    return json(req,{
      ok:true,
      profile:{
        id:customer.id,code:customer.gc_code||customer.code||null,
        name:customer.name||user.user_metadata?.full_name||user.email||'Customer',
        email:customer.email||user.email||null,phone:customer.phone||customer.phone2||user.phone||null,
        whatsapp_phone:customer.whatsapp_phone||customer.phone||customer.phone2||user.phone||null,
        whatsapp_group_name:customer.whatsapp_group_name||(customer.gc_code?String(customer.gc_code).replace(/^GC-/,'Gc-'):null),
        purchase_first_name:customer.purchase_first_name||(customer.gc_code?String(customer.gc_code).replace(/^GC-/,'Gc-'):null),
        purchase_last_name:customer.purchase_last_name||customer.name||user.user_metadata?.full_name||user.email||'Customer',
        preferred_language:customer.preferred_language||user.user_metadata?.preferred_language||'ckb',
        avatar_url:user.user_metadata?.avatar_url||null
      },
      shipments:safeShipments,cargo_items:ownCargoRows,notifications:customerNotifications,
      quotes:quotes.data||[],documents,pods:pods.data||[],invoices,
      payments:payments.data||[],customer_transactions:customerTransactions.data||[],events:events.data||[],ledger:ledger.data||[],receipts:customerReceipts,
      packages:packages.data||[],chat_threads:chatThreads.data||[],
      notification_preferences:preferences.data||{email_enabled:false,whatsapp_enabled:false,sms_enabled:false,in_app_enabled:true}
    })
  } catch (error) {
    console.error('customer-self error', error instanceof Error ? error.message : JSON.stringify(error))
    return json(req, {error: 'Customer data could not be loaded.'}, 500)
  }
})
