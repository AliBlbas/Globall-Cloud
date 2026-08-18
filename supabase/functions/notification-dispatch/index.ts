import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>
type OutboxItem = {
  id: string
  customer_user_id: string | null
  shipment_id: string | null
  channel: string
  event_key: string
  recipient: string | null
  payload: Json
  attempts?: number
}

const json = (body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !key) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
const payloadText = (item: OutboxItem) => String(item.payload?.body || item.payload?.text || item.payload?.note || 'Your Globall Cloud shipment has a new update.').slice(0, 4000)
const payloadTitle = (item: OutboxItem) => String(item.payload?.title || item.payload?.subject || 'Globall Cloud shipment update').slice(0, 180)

const deliverEmail = async (item: OutboxItem) => {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  if (!apiKey || !from) throw new Error('Email provider is not configured')
  if (!item.recipient) throw new Error('Email recipient is missing')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `globall-cloud-${item.id}` },
    body: JSON.stringify({
      from,
      to: [item.recipient],
      subject: payloadTitle(item),
      text: payloadText(item),
      html: String(item.payload?.html || `<p>${payloadText(item).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c))}</p>`),
    }),
  })
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`)
}

const deliverWhatsApp = async (item: OutboxItem) => {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  if (!token || !phoneNumberId) throw new Error('WhatsApp provider is not configured')
  if (!item.recipient) throw new Error('WhatsApp recipient is missing')
  const response = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: item.recipient, type: 'text', text: { preview_url: false, body: `${payloadTitle(item)}\n\n${payloadText(item)}` } }),
  })
  if (!response.ok) throw new Error(`WhatsApp provider returned ${response.status}`)
}

const deliverSms = async (item: OutboxItem) => {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_FROM_NUMBER')
  if (!sid || !token || !from) throw new Error('SMS provider is not configured')
  if (!item.recipient) throw new Error('SMS recipient is missing')
  const body = new URLSearchParams({ To: item.recipient, From: from, Body: `${payloadTitle(item)}: ${payloadText(item)}` })
  const auth = btoa(`${sid}:${token}`)
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!response.ok) throw new Error(`SMS provider returned ${response.status}`)
}

const deliverInApp = async (service: ReturnType<typeof serviceClient>, item: OutboxItem) => {
  if (!item.customer_user_id) throw new Error('In-app notification customer is missing')
  let query = service.from('customer_notifications').select('id').eq('customer_user_id', item.customer_user_id).eq('kind', item.event_key)
  query = item.shipment_id ? query.eq('shipment_id', item.shipment_id) : query.is('shipment_id', null)
  const existing = await query.limit(1)
  if (existing.error) throw existing.error
  if (existing.data?.length) return
  const result = await service.from('customer_notifications').insert({
    customer_user_id: item.customer_user_id,
    shipment_id: item.shipment_id,
    kind: item.event_key,
    title: payloadTitle(item),
    body: payloadText(item),
    action_url: String(item.payload?.action_url || (item.shipment_id ? `/?track=${encodeURIComponent(item.shipment_id)}` : '/customer-portal.html')),
  })
  if (result.error) throw result.error
}

const deliver = async (service: ReturnType<typeof serviceClient>, item: OutboxItem) => {
  if (item.channel === 'in_app') return deliverInApp(service, item)
  if (item.channel === 'email') return deliverEmail(item)
  if (item.channel === 'whatsapp') return deliverWhatsApp(item)
  if (item.channel === 'sms') return deliverSms(item)
  throw new Error(`Unsupported notification channel: ${item.channel}`)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const workerSecret = Deno.env.get('NOTIFICATION_WORKER_SECRET')
  if (!workerSecret || req.headers.get('x-notification-worker-secret') !== workerSecret) return json({ error: 'Unauthorized' }, 401)
  try {
    const body = await req.json().catch(() => ({})) as Json
    const limit = Math.min(100, Math.max(1, Number(body.limit || 25)))
    const service = serviceClient()
    const claimed = await service.rpc('claim_notification_outbox_external', { p_limit: limit })
    if (claimed.error) throw claimed.error
    const results: Array<Json> = []
    for (const item of (claimed.data || []) as OutboxItem[]) {
      try {
        await deliver(service, item)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Notification delivery failed'
        const completed = await service.rpc('complete_notification_outbox', { p_id: item.id, p_success: false, p_error: message })
        if (completed.error) console.error('notification failure acknowledgement failed', completed.error.message)
        results.push({ id: item.id, channel: item.channel, status: 'retryable', attempts: item.attempts ?? null, error: message.slice(0, 240) })
        continue
      }
      const completed = await service.rpc('complete_notification_outbox', { p_id: item.id, p_success: true, p_error: null })
      if (completed.error) {
        // Do not mark a provider-accepted message as failed: retrying it may duplicate delivery.
        console.error('notification success acknowledgement failed', completed.error.message)
        results.push({ id: item.id, channel: item.channel, status: 'ack_failed', attempts: item.attempts ?? null, error: completed.error.message.slice(0, 240) })
        continue
      }
      results.push({ id: item.id, channel: item.channel, status: 'sent' })
    }
    return json({ claimed: results.length, results })
  } catch (error) {
    console.error('notification-dispatch error', error)
    return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})
