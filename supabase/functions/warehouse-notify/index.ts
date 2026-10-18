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
function nextDeliveryTimeOutsideQuietHours(quietStart: unknown, quietEnd: unknown, now = new Date()) {
  const parse = (value: unknown) => {
    const match = String(value || '').match(/^(\\d{1,2}):(\\d{2})/)
    if (!match) return null
    const h = Number(match[1]), m = Number(match[2])
    return h >= 0 && h < 24 && m >= 0 && m < 60 ? h * 60 + m : null
  }
  const start = parse(quietStart), end = parse(quietEnd)
  if (start === null || end === null || start === end) return now.toISOString()
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const hour = Number(parts.find(p => p.type === 'hour')?.value || 0), minute = Number(parts.find(p => p.type === 'minute')?.value || 0)
  const current = hour * 60 + minute
  const quiet = start < end ? current >= start && current < end : current >= start || current < end
  if (!quiet) return now.toISOString()
  let delay = (end - current + 1440) % 1440
  if (delay === 0) delay = 1440
  return new Date(now.getTime() + delay * 60000 + 1000).toISOString()
}
async function cancelQueuedChannel(admin: ReturnType<typeof createClient>, eventKey: string, channel: Channel, reason: string) {
  const { data, error } = await admin.from('notification_outbox')
    .update({ status: 'cancelled', last_error: reason, updated_at: new Date().toISOString() })
    .eq('event_key', eventKey).eq('channel', channel).in('status', ['pending', 'processing', 'retry', 'queued'])
    .select('id')
  if (error) throw error
  return (data || []).length
}
async function queueOutboxChannel(
  admin: ReturnType<typeof createClient>,
  args: { channel: Channel; eventKey: string; recipient: string; customerUserId: string | null; shipmentId: string | null; payload: Json; nextAttemptAt: string },
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
        .update({ status: 'pending', attempts: 0, last_error: null, next_attempt_at: args.nextAttemptAt, recipient: args.recipient, payload: args.payload, updated_at: now })
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
      next_attempt_at: args.nextAttemptAt,
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
      .select('id,gc_code,gc_code_detected,batch_code,warehouse,source_warehouse,location,carton_count,weight_actual,received_at,photo_taken_at,photos,shipment_id,directory_customer_id,label_metadata,notes,created_by_name')
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
    const errors: string[] = []
    let preferences: Record<string, unknown> | null = null
    if (customer.auth_user_id) {
      const result = await admin.from('customer_notification_preferences')
        .select('email_enabled,whatsapp_enabled,in_app_enabled,quiet_hours_start,quiet_hours_end')
        .eq('customer_user_id', customer.auth_user_id)
        .maybeSingle()
      if (result.error) errors.push(`preferences: ${result.error.message}`)
      else preferences = result.data
    }
    const inAppAllowed = Boolean(customer.auth_user_id) && preferences?.in_app_enabled !== false
    const whatsappOptedIn = preferences?.whatsapp_enabled === true
    const emailOptedIn = preferences?.email_enabled === true
    const nextAttemptAt = nextDeliveryTimeOutsideQuietHours(preferences?.quiet_hours_start, preferences?.quiet_hours_end)
    const gcCode = String(customer.gc_code || customer.normalized_gc_code || customer.code || receipt.gc_code_detected || receipt.gc_code || '').normalize('NFKC').trim().toUpperCase()
    const warehouse = String(receipt.location || receipt.source_warehouse || receipt.warehouse || 'warehouse')
    const metadata = receipt.label_metadata && typeof receipt.label_metadata === 'object' ? receipt.label_metadata as Record<string, unknown> : {}
    const cartons = Math.max(1, Number(receipt.carton_count ?? metadata.total_packages ?? 1) || 1)
    const weight = Number(receipt.weight_actual ?? metadata.gross_weight_kg ?? 0) || 0
    const receivedAt = receipt.received_at || new Date().toISOString()
    const photoUrls = await signedPhotos(admin, receipt.photos)
    const cartonResult = await admin.from('warehouse_receipt_cartons')
      .select('carton_index,carton_total,carton_code,warehouse_location,received_at,status,package_id')
      .eq('receipt_id', receipt.id)
      .eq('customer_directory_id', customer.id)
      .order('carton_index', {ascending:true})
    if (cartonResult.error) throw cartonResult.error
    const cartonManifest = cartonResult.data || []
    const cartonCodes = cartonManifest.map((item: Record<string, any>) => String(item.carton_code || '')).filter(Boolean)
    const cartonSummary = cartonCodes.length
      ? `کۆدی کارتۆنەکان: ${cartonCodes.slice(0, 15).join(', ')}${cartonCodes.length > 15 ? ` و ${cartonCodes.length - 15} دانەی تر` : ''}`
      : 'کۆدی تاکەکارتۆن: بەردەست نییە'
    const localTime = new Intl.DateTimeFormat('ku-IQ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Baghdad' }).format(new Date(receivedAt))
    const isDubaiWarehouse = /^(dubai|uae|united arab emirates|دوبەی|دوبی)$/i.test(warehouse.trim())
    const title = isDubaiWarehouse ? 'کاڵاکەت لە کۆگای دوبەی وەرگیرا' : 'کاڵاکەت لە کۆگا وەرگیرا'
    const notificationBody = isDubaiWarehouse
      ? 'وردەکاری، وێنە و ژمارەی کارتۆن لە بەشی بارەکان ببینە.'
      : 'وردەکاری و بەڵگەی کاڵاکەت لە بەشی بارەکان ببینە.'
    const bodyText = [
      `GC: ${gcCode}`,
      `کۆگا: ${warehouse}`,
      `کارتۆن: ${cartons}`,
      cartonSummary,
      `کێش: ${weight > 0 ? `${weight} kg` : 'تۆمارنەکراوە'}`,
      `بەروار و کات (هەولێر): ${localTime}`,
      `ژمارەی وێنەکان: ${photoUrls.length}`,
      `Batch: ${String(receipt.batch_code || '—')}`,
    ].join('\\n')
    const eventKey = `warehouse_received:${String(receipt.id)}`
    const actionUrl = '/#shipmentsSection'
    const payload: Json = {
      title, subject: title, body: bodyText, action_url: actionUrl, gc_code: gcCode, warehouse,
      carton_count: cartons, weight_kg: weight || null, receipt_id: String(receipt.id),
      batch_code: String(receipt.batch_code || ''), received_at: String(receivedAt),
      photo_taken_at: receipt.photo_taken_at ? String(receipt.photo_taken_at) : null,
      photo_count: photoUrls.length, media_url: photoUrls[0] || null, media_urls: photoUrls,
      carton_codes: cartonCodes, carton_manifest_count: cartonManifest.length,
      cartons: cartonManifest.slice(0, 100),
      template_name: Deno.env.get('WHATSAPP_TEMPLATE_NAME') || 'globall_warehouse_received',
      template_language: String(customer.preferred_language || 'ckb'),
    }
    let inAppQueued = false
    if (inAppAllowed) {
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
          kind: 'warehouse_received', event_key: eventKey, title, body: notificationBody, action_url: actionUrl,
        })
        if (error?.code === '23505') inAppQueued = true
        else if (error) errors.push(`in_app: ${error.message}`)
        else inAppQueued = true
      } else if (existing.read_at) {
        const { error } = await admin.from('customer_notifications').update({ read_at: null, title, body: notificationBody, action_url: actionUrl, created_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) errors.push(`in_app_retry: ${error.message}`)
        else inAppQueued = true
      } else inAppQueued = true
    }
    const whatsappRecipient = String(customer.whatsapp_phone || customer.phone || customer.phone2 || '').trim()
    let whatsapp: {queued:boolean;status:string;retried:boolean} | null = null
    if (whatsappRecipient && whatsappOptedIn) {
      try {
        whatsapp = await queueOutboxChannel(admin, { channel: 'whatsapp', eventKey, recipient: whatsappRecipient, customerUserId: customer.auth_user_id || null, shipmentId: receipt.shipment_id ? String(receipt.shipment_id) : null, payload, nextAttemptAt })
      } catch (error) {
        errors.push(`whatsapp: ${error instanceof Error ? error.message : String(error)}`)
      }
    } else {
      try { await cancelQueuedChannel(admin, eventKey, 'whatsapp', 'Customer has not opted in to WhatsApp notifications.') }
      catch (error) { errors.push(`whatsapp_cancel: ${error instanceof Error ? error.message : String(error)}`) }
    }
    const emailRecipient = String(customer.email || '').trim()
    let email: {queued:boolean;status:string;retried:boolean} | null = null
    if (emailRecipient && emailOptedIn) {
      try {
        email = await queueOutboxChannel(admin, { channel: 'email', eventKey, recipient: emailRecipient, customerUserId: customer.auth_user_id || null, shipmentId: receipt.shipment_id ? String(receipt.shipment_id) : null, payload, nextAttemptAt })
      } catch (error) {
        errors.push(`email: ${error instanceof Error ? error.message : String(error)}`)
      }
    } else {
      try { await cancelQueuedChannel(admin, eventKey, 'email', 'Customer has not opted in to email notifications.') }
      catch (error) { errors.push(`email_cancel: ${error instanceof Error ? error.message : String(error)}`) }
    }
    const audit = await admin.from('staff_activity_log').insert({
      staff_id: staff.id, staff_name: staff.full_name, action: 'warehouse.notification_queued',
      target_id: String(receipt.id),
      details: JSON.stringify({ gc_code: gcCode, warehouse, cartons, photos: photoUrls.length, in_app: inAppQueued, whatsapp_opted_in: whatsappOptedIn, email_opted_in: emailOptedIn, whatsapp: whatsapp?.status || null, email: email?.status || null }),
    })
    if (audit.error) errors.push(`audit: ${audit.error.message}`)
    return json(req, {
      ok: errors.length === 0, receipt_id: receipt.id, gc_code: gcCode, warehouse, received_at: receivedAt,
      photo_count: photoUrls.length,
      notification: {
        in_app: inAppQueued, in_app_queued: inAppQueued, whatsapp_queued: Boolean(whatsapp?.queued),
        email_queued: Boolean(email?.queued), carton_manifest_count: cartonManifest.length,
        carton_codes: cartonCodes, whatsapp_status: whatsapp?.status || (!whatsappRecipient ? 'no_recipient' : whatsappOptedIn ? 'error' : 'disabled_by_preference'),
        email_status: email?.status || (!emailRecipient ? 'no_recipient' : emailOptedIn ? 'error' : 'disabled_by_preference'),
        whatsapp_opted_in: whatsappOptedIn,
        email_opted_in: emailOptedIn,
        external_opt_in: whatsappOptedIn || emailOptedIn,
        next_external_attempt_at: nextAttemptAt,
        errors,
      },
    }, errors.length ? 207 : 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = /Unauthorized/i.test(message) ? 401 : /Forbidden/i.test(message) ? 403 : /required|not found|not linked/i.test(message) ? 400 : 500
    return json(req, { error: message }, status)
  }
})
