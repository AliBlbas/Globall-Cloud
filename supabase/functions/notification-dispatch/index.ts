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
type DeliveryReceipt = {
  provider: 'resend' | 'gmail' | 'whatsapp' | 'twilio'
  providerMessageId?: string | null
  providerStatus?: string | null
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
const responseBody = async (response: Response) => await response.json().catch(() => ({})) as Json
const responseError = async (provider: string, response: Response) => {
  const body = await responseBody(response)
  const message = body.error && typeof body.error === 'object' ? (body.error as Json).message : body.message
  return new Error(`${provider} provider returned ${response.status}${message ? `: ${String(message).slice(0, 180)}` : ''}`)
}
const base64Url = (value: string) => btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

const gmailAccessToken = async () => {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN')
  if (!clientId || !clientSecret || !refreshToken) throw new Error('Gmail provider is not configured')
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }) })
  const tokenBody = await tokenResponse.json()
  if (!tokenResponse.ok || !tokenBody.access_token) throw new Error(`Gmail OAuth returned ${tokenResponse.status}`)
  return String(tokenBody.access_token)
}

const deliverResend = async (item: OutboxItem): Promise<DeliveryReceipt> => {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  if (!apiKey || !from) throw new Error('Resend provider is not configured')
  if (!item.recipient) throw new Error('Email recipient is missing')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `globall-cloud-${item.id}` },
    body: JSON.stringify({
      from,
      to: [item.recipient],
      subject: payloadTitle(item),
      text: payloadText(item),
      tags: [{ name: 'globall_outbox_id', value: item.id }, { name: 'globall_event_key', value: item.event_key.slice(0, 256) }],
    }),
  })
  if (!response.ok) throw await responseError('Resend', response)
  const body = await responseBody(response)
  return { provider: 'resend', providerMessageId: String(body.id || ''), providerStatus: 'sent' }
}

const deliverGmail = async (item: OutboxItem): Promise<DeliveryReceipt> => {
  const from = Deno.env.get('GOOGLE_SENDER_EMAIL')
  if (!from) throw new Error('Gmail sender is not configured')
  if (!item.recipient) throw new Error('Email recipient is missing')
  const mime = [`From: ${from}`, `To: ${item.recipient}`, `Subject: ${payloadTitle(item)}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '', payloadText(item)].join('\r\n')
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${await gmailAccessToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: base64Url(mime) }) })
  if (!response.ok) throw await responseError('Gmail', response)
  const body = await responseBody(response)
  return { provider: 'gmail', providerMessageId: String(body.id || body.threadId || ''), providerStatus: 'sent' }
}

const deliverEmail = async (item: OutboxItem) => {
  if (Deno.env.get('RESEND_API_KEY') && Deno.env.get('RESEND_FROM_EMAIL')) return deliverResend(item)
  return deliverGmail(item)
}

const deliverWhatsApp = async (item: OutboxItem): Promise<DeliveryReceipt> => {
  const token = Deno.env.get('META_ACCESS_TOKEN') || Deno.env.get('WHATSAPP_ACCESS_TOKEN')
  const phoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID') || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const templateName = String(item.payload?.template_name || Deno.env.get('WHATSAPP_TEMPLATE_NAME') || 'globall_notification')
  const language = String(item.payload?.template_language || Deno.env.get('WHATSAPP_TEMPLATE_LANGUAGE') || 'en_US')
  if (!token || !phoneNumberId) throw new Error('WhatsApp provider is not configured')
  if (!item.recipient) throw new Error('WhatsApp recipient is missing')
  const response = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(phoneNumberId)}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': `globall-cloud-${item.id}` }, body: JSON.stringify({ messaging_product: 'whatsapp', to: item.recipient, type: 'template', template: { name: templateName, language: { code: language }, components: [{ type: 'body', parameters: [{ type: 'text', text: payloadTitle(item).slice(0, 1024) }, { type: 'text', text: payloadText(item).slice(0, 1024) }] }] } }) })
  if (!response.ok) throw await responseError('WhatsApp', response)
  const body = await responseBody(response)
  const messageId = Array.isArray(body.messages) && body.messages[0] && typeof body.messages[0] === 'object' ? String((body.messages[0] as Json).id || '') : ''
  return { provider: 'whatsapp', providerMessageId: messageId, providerStatus: 'accepted' }
}

const deliverSms = async (item: OutboxItem): Promise<DeliveryReceipt> => {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_FROM_NUMBER')
  if (!sid || !token || !from) throw new Error('SMS provider is not configured')
  if (!item.recipient) throw new Error('SMS recipient is missing')
  const callbackUrl = Deno.env.get('TWILIO_STATUS_CALLBACK_URL')
  const params: Record<string, string> = { To: item.recipient, From: from, Body: `${payloadTitle(item)}: ${payloadText(item)}` }
  if (callbackUrl) params.StatusCallback = callbackUrl
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) })
  if (!response.ok) throw await responseError('Twilio', response)
  const body = await responseBody(response)
  return { provider: 'twilio', providerMessageId: String(body.sid || ''), providerStatus: String(body.status || 'accepted') }
}

const deliverInApp = async (service: ReturnType<typeof serviceClient>, item: OutboxItem): Promise<DeliveryReceipt> => {
  if (!item.customer_user_id) throw new Error('In-app notification customer is missing')
  let query = service.from('customer_notifications').select('id').eq('customer_user_id', item.customer_user_id).eq('kind', item.event_key)
  query = item.shipment_id ? query.eq('shipment_id', item.shipment_id) : query.is('shipment_id', null)
  const existing = await query.limit(1)
  if (existing.error) throw existing.error
  if (existing.data?.length) return { provider: 'gmail', providerStatus: 'sent' }
  const result = await service.from('customer_notifications').insert({ customer_user_id: item.customer_user_id, shipment_id: item.shipment_id, kind: item.event_key, title: payloadTitle(item), body: payloadText(item), action_url: String(item.payload?.action_url || (item.shipment_id ? `/?track=${encodeURIComponent(item.shipment_id)}` : '/customer-portal.html')) })
  if (result.error) throw result.error
  return { provider: 'gmail', providerStatus: 'sent' }
}

const deliver = async (service: ReturnType<typeof serviceClient>, item: OutboxItem): Promise<DeliveryReceipt> => {
  if (item.channel === 'in_app') return deliverInApp(service, item)
  if (item.channel === 'email') return deliverEmail(item)
  if (item.channel === 'whatsapp') return deliverWhatsApp(item)
  if (item.channel === 'sms') return deliverSms(item)
  throw new Error(`Unsupported notification channel: ${item.channel}`)
}

const saveReceipt = async (service: ReturnType<typeof serviceClient>, item: OutboxItem, receipt: DeliveryReceipt) => {
  if (item.channel === 'in_app' || (!receipt.providerMessageId && !receipt.providerStatus)) return
  const result = await service.from('notification_outbox').update({ provider_message_id: receipt.providerMessageId || null, provider_status: receipt.providerStatus || 'accepted', updated_at: new Date().toISOString() }).eq('id', item.id)
  if (result.error) throw result.error
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
        const receipt = await deliver(service, item)
        await saveReceipt(service, item, receipt)
        const completed = await service.rpc('complete_notification_outbox', { p_id: item.id, p_success: true, p_error: null })
        if (completed.error) {
          console.error('notification success acknowledgement failed', completed.error.message)
          results.push({ id: item.id, channel: item.channel, status: 'ack_failed', attempts: item.attempts ?? null, error: completed.error.message.slice(0, 240) })
          continue
        }
        results.push({ id: item.id, channel: item.channel, status: 'sent', provider: receipt.provider, provider_message_id: receipt.providerMessageId || null })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Notification delivery failed'
        const completed = await service.rpc('complete_notification_outbox', { p_id: item.id, p_success: false, p_error: message })
        if (completed.error) console.error('notification failure acknowledgement failed', completed.error.message)
        results.push({ id: item.id, channel: item.channel, status: 'retryable', attempts: item.attempts ?? null, error: message.slice(0, 240) })
      }
    }
    return json({ claimed: results.length, results })
  } catch (error) {
    console.error('notification-dispatch error', error)
    return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})
