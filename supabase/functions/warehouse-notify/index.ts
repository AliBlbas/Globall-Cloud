import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const BUCKET = 'warehouse-receipts'
const SIGNED_URL_TTL = 24 * 60 * 60
type Json = Record<string, unknown>
type Channel = 'whatsapp' | 'email'
const cors = (req: Request) => ({
  'Access-Control-Allow-Origin': ORIGINS.has(req.headers.get('origin') || '') ? (req.headers.get('origin') || '') : 'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Cache-Control': 'no-store',
  'Vary': 'Origin',
})
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req) } })
const txt = (value: unknown) => {
  const result = String(value ?? '').trim()
  return result || null
}
function storagePath(value: unknown): string | null {
  const raw = txt(value)
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw)) return decodeURIComponent(raw.replace(/^\/+/, ''))
  const markers = [
    `/storage/v1/object/public/${BUCKET}/`,
    `/storage/v1/object/sign/${BUCKET}/`,
    `/storage/v1/object/authenticated/${BUCKET}/`,
  ]
  for (const marker of markers) {
    const index = raw.indexOf(marker)
    if (index >= 0) return decodeURIComponent(raw.slice(index + marker.length).split('?')[0])
  }
  return null
}
async function actor(req: Request) {
  const auth = req.headers.get('authorization') || ''
  if (!/^Bearer\s+/i.test(auth)) throw new Error('Unauthorized')
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: auth } } })
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Unauthorized')
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: staff, error: staffError } = await admin.from('staff')
    .select('id,full_name,role,is_active')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (staffError) throw staffError
  const allowed = new Set(['admin','super_admin','accountant','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','delivery'])
  if (!staff?.is_active || !allowed.has(String(staff.role))) throw new Error('Forbidden')
  return { admin, staff }
}
async function signedPhotos(admin: ReturnType<typeof createClient>, value: unknown): Promise<string[]> {
  const paths = (Array.isArray(value) ? value : []).map(storagePath).filter((item): item is string => Boolean(item))
  if (!paths.length) return []
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
  if (error) throw error
  return (data || []).map(item => item.signedUrl).filter((url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url))
}
async function queueOutboxChannel(
  admin: ReturnType<typeof createClient>,
  args: { channel: Channel; eventKey: string; recipient: string; customerUserId: string | null; shipmentId: string | null; payload: Json },
) {
  const now = new Date().toISOString()
  const { data: existing, error: lookupError } = await admin.from('notification_outbox')
    .select('id,status,attempts')
    .eq('event_key', args.eventKey)
    .eq('channel', args.channel)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existing) {
    if (['failed','cancelled'].includes(String(existing.status))) {
      const { data: refreshed, error } = await admin.from('notification_outbox')
        .update({ status: 'pending', attempts: 0, last_error: null, next_attempt_at: now, recipient: args.recipient, payload: args.payload, updated_at: now })
        .eq('id', existing.id)
        .select('id,status')
        .single()
      if (error) throw error
      return { queued: true, status: refreshed.status, retried: true }
    }
    return { queued: ['pending','processing'].includes(String(existing.status)), status: String(existing.status), retried: false }
  }
  const { data, error } = await admin.from('notification_outbox')
    .insert({
      customer_user_id: args.customerUserId,
      shipment_id: args.shipmentId,
      channel: args.channel,
      event_key: args.eventKey,
      recipient: args.recipient,
      payload: args.payload,
      status: 'pending',
      next_attempt_at: now,
      updated_at: now,
    })
    .select('id,status')
    .single()
  if (error) {
    // A parallel retry may have inserted the unique (event_key, channel) row.
    if (error.code === '23505') {
      const raced = await admin.from('notification_outbox').select('id,status')
        .eq('event_key', args.eventKey).eq('channel', args.channel).maybeSingle()
      if (raced.error) throw raced.error
      if (raced.data) return { queued: ['pending','processing'].includes(String(raced.data.status)), status: String(raced.data.status), retried: false }
    }
    throw error
  }
  return { queued: true, status: String(data.status), retried: false }
}
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  try {
    const { admin, staff } = await actor(req)
    const input = await req.json().catch(() => ({})) as Record<string, unknown>
    const receiptId = txt(input.receipt_id)
    if (!receiptId) throw new Error('receipt_id is required')
    const { data: receipt, error: receiptError } = await admin.from('warehouse_receipts')
      .select('id,gc_code,gc_code_detected,batch_code,location,carton_count,weight_actual,received_at,photo_taken_at,photos,shipment_id,directory_customer_id,label_metadata,notes,created_by_name')
      .eq('id', receiptId)
      .maybeSingle()
    if (receiptError) throw receiptError
    if (!receipt) throw new Error('Receipt not found')
    if (!receipt.directory_customer_id) throw new Error('Receipt is not linked to a customer account record')
    const { data: customer, error: customerError } = await admin.from('customer_directory')
      .select('id,gc_code,normalized_gc_code,code,name,phone,phone2,whatsapp_phone,email,auth_user_id,is_active,preferred_language')
      .eq('id', receipt.directory_customer_id)
      .maybeSingle()
    if (customerError) throw customerError
    if (!customer) throw new Error('Customer directory record was not found')
    const gcCode = String(customer.gc_code || customer.normalized_gc_code || customer.code || receipt.gc_code_detected || receipt.gc_code || '').normalize('NFKC').trim().toUpperCase()
    const warehouse = String(receipt.location || 'warehouse')
    const metadata = receipt.label_metadata && typeof receipt.label_metadata === 'object' ? receipt.label_metadata as Record<string, unknown> : {}
    const cartons = Math.max(1, Number(receipt.carton_count ?? metadata.total_packages ?? 1) || 1)
    const weight = Number(receipt.weight_actual ?? metadata.gross_weight_kg ?? 0) || 0
    const receivedAt = receipt.received_at || new Date().toISOString()
    const photoUrls = await signedPhotos(admin, receipt.photos)
    const localTime = new Intl.DateTimeFormat('ku-IQ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Baghdad' }).format(new Date(receivedAt))
    const title = 'کاڵاکەت لە کۆگا وەرگیرا'
    const bodyText = [
      `GC: ${gcCode}`,
      `کۆگا: ${warehouse}`,
      `کارتۆن: ${cartons}`,
      `کێش: ${weight > 0 ? `${weight} kg` : 'تۆمارنەکراوە'}`,
      `بەروار و کات (هەولێر): ${localTime}`,
      `ژمارەی وێنەکان: ${photoUrls.length}`,
      `Batch: ${String(receipt.batch_code || '—')}`,
    ].join('\n')
    const eventKey = `warehouse_received:${String(receipt.id)}`
    const actionUrl = '/#shipmentsSection'
    const payload: Json = {
      title, subject: title, body: bodyText, action_url: actionUrl, gc_code: gcCode, warehouse,
      carton_count: cartons, weight_kg: weight || null, receipt_id: String(receipt.id),
      batch_code: String(receipt.batch_code || ''), received_at: String(receivedAt),
      photo_taken_at: receipt.photo_taken_at ? String(receipt.photo_taken_at) : null,
      photo_count: photoUrls.length, media_url: photoUrls[0] || null, media_urls: photoUrls,
      template_name: Deno.env.get('WHATSAPP_TEMPLATE_NAME') || 'globall_warehouse_received',
      template_language: String(customer.preferred_language || 'ckb'),
    }
    const errors: string[] = []
    let inAppQueued = false
    if (customer.auth_user_id) {
      const { data: existing, error: lookupError } = await admin.from('customer_notifications')
        .select('id,read_at')
        .eq('customer_user_id', customer.auth_user_id)
        .eq('event_key', eventKey)
        .maybeSingle()
      if (lookupError) errors.push(`in_app_lookup: ${lookupError.message}`)
      else if (!existing) {
        const { error } = await admin.from('customer_notifications').insert({
          customer_user_id: customer.auth_user_id,
          shipment_id: receipt.shipment_id ? String(receipt.shipment_id) : null,
          kind: 'warehouse_received', event_key: eventKey, title, body: bodyText, action_url: actionUrl,
        })
        if (error?.code === '23505') inAppQueued = true
        else if (error) errors.push(`in_app: ${error.message}`)
        else inAppQueued = true
      } else if (existing.read_at) {
        const { error } = await admin.from('customer_notifications').update({ read_at: null, title, body: bodyText, action_url: actionUrl, created_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) errors.push(`in_app_retry: ${error.message}`)
        else inAppQueued = true
      } else inAppQueued = true
    }
    const whatsappRecipient = String(customer.whatsapp_phone || customer.phone || customer.phone2 || '').trim()
    let whatsapp: {queued:boolean;status:string;retried:boolean} | null = null
    if (whatsappRecipient) {
      try {
        whatsapp = await queueOutboxChannel(admin, { channel: 'whatsapp', eventKey, recipient: whatsappRecipient, customerUserId: customer.auth_user_id || null, shipmentId: receipt.shipment_id ? String(receipt.shipment_id) : null, payload })
      } catch (error) {
        errors.push(`whatsapp: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    const emailRecipient = String(customer.email || '').trim()
    let email: {queued:boolean;status:string;retried:boolean} | null = null
    if (emailRecipient) {
      try {
        email = await queueOutboxChannel(admin, { channel: 'email', eventKey, recipient: emailRecipient, customerUserId: customer.auth_user_id || null, shipmentId: receipt.shipment_id ? String(receipt.shipment_id) : null, payload })
      } catch (error) {
        errors.push(`email: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    const audit = await admin.from('staff_activity_log').insert({
      staff_id: staff.id, staff_name: staff.full_name, action: 'warehouse.notification_queued',
      target_id: String(receipt.id),
      details: JSON.stringify({ gc_code: gcCode, warehouse, cartons, photos: photoUrls.length, in_app: inAppQueued, whatsapp: whatsapp?.status || null, email: email?.status || null }),
    })
    if (audit.error) errors.push(`audit: ${audit.error.message}`)
    return json(req, {
      ok: errors.length === 0, receipt_id: receipt.id, gc_code: gcCode, warehouse, received_at: receivedAt,
      photo_count: photoUrls.length,
      notification: {
        in_app: inAppQueued, in_app_queued: inAppQueued, whatsapp_queued: Boolean(whatsapp?.queued),
        email_queued: Boolean(email?.queued), whatsapp_status: whatsapp?.status || (whatsappRecipient ? 'error' : 'no_recipient'),
        email_status: email?.status || (emailRecipient ? 'error' : 'no_recipient'),
        errors,
      },
    }, errors.length ? 207 : 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = /Unauthorized/i.test(message) ? 401 : /Forbidden/i.test(message) ? 403 : /required|not found|not linked/i.test(message) ? 400 : 500
    return json(req, { error: message }, status)
  }
})
