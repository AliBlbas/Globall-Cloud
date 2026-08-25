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
    const {data: customer, error: customerError} = await service
      .from('customer_directory')
      .select('id,code,gc_code,name,email,phone,auth_user_id,is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (customerError) throw customerError
    if (!customer || customer.is_active !== true) return json(req, {error: 'Customer account is not active.'}, 403)

    if (req.method === 'POST') {
      let body: Record<string, unknown> = {}
      try { body = await req.json() } catch { return json(req, {error: 'Invalid JSON body.'}, 400) }
      const action = text(body.action, 60)
      const data = (body.data && typeof body.data === 'object') ? body.data as Record<string, unknown> : {}

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

      if (action === 'request_quote') {
        const originKey = text(data.origin_key, 100)
        const destKey = text(data.dest_key, 100)
        const transportMode = text(data.transport_mode, 30)
        const weight = numberOrNull(data.weight_kg, 50000)
        const volume = numberOrNull(data.volume_cbm, 100000)
        const items = numberOrNull(data.items_count, 1000000)
        const serviceLevel = text(data.service_level, 30) || 'standard'
        const incoterm = text(data.incoterm, 12) || 'EXW'
        const notes = text(data.notes, 2000)
        if (originKey.length < 2 || destKey.length < 2 || !['air', 'sea', 'land', 'multimodal'].includes(transportMode) || !['standard', 'express', 'priority'].includes(serviceLevel) || !['EXW', 'FOB', 'CIF', 'DDP'].includes(incoterm) || weight === null || weight <= 0) return json(req, {error: 'Please check the required quote fields.'}, 400)
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
          notes: notes || null,
          status: 'pending',
        }).select('id').single()
        if (error) throw error
        return json(req, {ok: true, request: rows}, 201)
      }
      return json(req, {error: 'Unsupported customer action.'}, 400)
    }

    const {data: shipmentRows, error: shipmentError} = await service
      .from('shipments')
      .select('id,origin_key,dest_key,current_step_index,operational_status,current_location_label,current_lat,current_lng,tracking_updated_at,total_amount,paid_amount,eta,created_at')
      .eq('customer_user_id', user.id)
      .order('created_at', {ascending: false})
      .limit(30)
    if (shipmentError) throw shipmentError
    const shipments = shipmentRows || []
    const shipmentIds = shipments.map((item) => item.id).filter(Boolean)

    const [notifications, quotes, documents, pods, invoices, payments, events, ledger, receipts, packages] = await Promise.all([
      service.from('customer_notifications').select('id,title,body,read_at,created_at').eq('customer_user_id', user.id).order('created_at', {ascending: false}).limit(12),
      service.from('quote_requests').select('id,origin_key,dest_key,transport_mode,weight_kg,volume_cbm,status,quoted_amount,currency,valid_until,created_at').eq('customer_user_id', user.id).order('created_at', {ascending: false}).limit(12),
      service.from('shipment_documents').select('id,shipment_id,document_type,title,file_url,is_public,document_status,created_at').eq('customer_user_id', user.id).order('created_at', {ascending: false}).limit(12),
      shipmentIds.length ? service.from('delivery_proofs').select('shipment_id,delivered_at,receiver_name,note,photo_urls,latitude,longitude,created_at').in('shipment_id', shipmentIds).order('created_at', {ascending: false}).limit(12) : Promise.resolve({data: [], error: null}),
      service.from('shipment_invoices').select('id,invoice_number,shipment_id,total,paid_total,currency,status,due_at,created_at').eq('customer_user_id', user.id).order('created_at', {ascending: false}).limit(20),
      shipmentIds.length ? service.from('payment_transactions').select('id,invoice_id,shipment_id,provider,status,amount,currency,method,paid_at,created_at').in('shipment_id', shipmentIds).order('created_at', {ascending: false}).limit(20) : Promise.resolve({data: [], error: null}),
      shipmentIds.length ? service.from('shipment_tracking_events').select('id,shipment_id,status_key,title,note,location_label,lat,lng,occurred_at,photos').in('shipment_id', shipmentIds).order('occurred_at', {ascending: false}).limit(100) : Promise.resolve({data: [], error: null}),
      shipmentIds.length ? service.from('shipment_financial_ledger').select('shipment_id,entry_type,amount,currency,reference,note,created_at').in('shipment_id', shipmentIds).order('created_at', {ascending: false}).limit(100) : Promise.resolve({data: [], error: null}),
      service.from('warehouse_receipts').select('id,batch_code,location,stage,photo_taken_at,gc_code_detected,verification_status,photos,shipment_id,received_at,created_at').eq('directory_customer_id', customer.id).order('received_at', {ascending: false}).limit(30),
      shipmentIds.length ? service.from('shipment_packages').select('id,shipment_id,package_code,barcode,package_type,description,weight_kg,length_cm,width_cm,height_cm,declared_value,declared_currency,current_hub,status,created_at,updated_at').in('shipment_id', shipmentIds).order('created_at', {ascending: false}).limit(100) : Promise.resolve({data: [], error: null}),
    ])
    const results = [notifications, quotes, documents, pods, invoices, payments, events, ledger, receipts, packages]
    const failed = results.find((result) => result?.error)
    if (failed?.error) throw failed.error

    return json(req, {
      ok: true,
      profile: {id: customer.id, code: customer.code || customer.gc_code || null, name: customer.name || user.user_metadata?.full_name || user.email || 'Customer', email: customer.email || user.email || null},
      shipments,
      notifications: notifications.data || [],
      quotes: quotes.data || [],
      documents: documents.data || [],
      pods: pods.data || [],
      invoices: invoices.data || [],
      payments: payments.data || [],
      events: events.data || [],
      ledger: ledger.data || [],
      receipts: receipts.data || [],
      packages: packages.data || [],
    })
  } catch (error) {
    console.error('customer-self error', error instanceof Error ? error.message : String(error))
    return json(req, {error: 'Customer data could not be loaded.'}, 500)
  }
})
