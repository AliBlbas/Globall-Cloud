import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>
type Hash = 'SHA-1' | 'SHA-256'
type NormalizedStatus = 'accepted' | 'sent' | 'delivered' | 'read' | 'failed' | 'rejected'

const json = (body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const text = (body: string, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
const encoder = new TextEncoder()
const toHex = (value: ArrayBuffer) => Array.from(new Uint8Array(value)).map((part) => part.toString(16).padStart(2, '0')).join('')
const toBase64 = (value: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(value)))
const timingSafeEqual = (left: string, right: string) => {
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  if (a.length !== b.length) return false
  let result = 0
  for (let index = 0; index < a.length; index += 1) result |= a[index] ^ b[index]
  return result === 0
}
const hmac = async (hash: Hash, secret: Uint8Array, value: string) => {
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash }, false, ['sign'])
  return crypto.subtle.sign('HMAC', key, encoder.encode(value))
}
const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !key) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
const parseJson = (raw: string) => {
  try { return JSON.parse(raw) as Json } catch { throw new Error('Invalid JSON webhook payload') }
}
const decodeBase64 = (value: string) => {
  const binary = atob(value)
  return new Uint8Array(Array.from(binary).map((char) => char.charCodeAt(0)))
}
const decodeResendSecret = (secret: string) => decodeBase64(secret.replace(/^whsec_/, ''))
const logEvent = (event: string, fields: Json = {}) => console.info(JSON.stringify({ service: 'notification-webhook', event, at: new Date().toISOString(), ...fields }))
const normalizeStatus = (value: unknown): NormalizedStatus => {
  const status = String(value || '').toLowerCase()
  if (['accepted', 'queued', 'sending', 'pending'].includes(status)) return 'accepted'
  if (['sent', 'submitted'].includes(status)) return 'sent'
  if (['delivered', 'delivery'].includes(status)) return 'delivered'
  if (['read', 'opened', 'click', 'clicked'].includes(status)) return 'read'
  if (['rejected', 'bounced', 'complained'].includes(status)) return 'rejected'
  return 'failed'
}
const recordEvent = async (service: ReturnType<typeof serviceClient>, provider: string, eventId: string, messageId: string | null, status: NormalizedStatus, recipient: string | null, occurredAt: string, payload: Json) => {
  const result = await service.rpc('record_notification_delivery_event', { p_provider: provider, p_provider_event_id: eventId, p_provider_message_id: messageId, p_status: status, p_recipient: recipient, p_occurred_at: occurredAt, p_raw_payload: payload })
  if (result.error) throw result.error
  return result.data
}

const verifyResend = async (request: Request, raw: string) => {
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET')
  const id = request.headers.get('svix-id')
  const timestamp = request.headers.get('svix-timestamp')
  const signature = request.headers.get('svix-signature')
  if (!secret || !id || !timestamp || !signature) throw new Error('Resend webhook verification is not configured')
  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) throw new Error('Resend webhook timestamp is outside the allowed window')
  const expected = toBase64(await hmac('SHA-256', decodeResendSecret(secret), `${id}.${timestamp}.${raw}`))
  const valid = signature.split(' ').some((part) => {
    const [version, value] = part.split(',', 2)
    return version === 'v1' && Boolean(value) && timingSafeEqual(value, expected)
  })
  if (!valid) throw new Error('Invalid Resend webhook signature')
}

const handleResend = async (request: Request, raw: string, service: ReturnType<typeof serviceClient>) => {
  await verifyResend(request, raw)
  const event = parseJson(raw)
  const data = event.data && typeof event.data === 'object' ? event.data as Json : {}
  const eventType = String(event.type || '')
  const messageId = String(data.email_id || data.id || '')
  if (!messageId) throw new Error('Resend email id is missing')
  const recipient = Array.isArray(data.to) ? String(data.to[0] || '') : String(data.to || '')
  const eventId = request.headers.get('svix-id') || `${messageId}:${eventType}:${String(event.created_at || '')}`
  const occurredAt = String(event.created_at || new Date().toISOString())
  const status = normalizeStatus(eventType.replace(/^email\./, ''))
  await recordEvent(service, 'resend', eventId, messageId, status, recipient || null, occurredAt, event)
  logEvent('status_recorded', { provider: 'resend', provider_message_id: messageId, status, event_id: eventId })
  return json({ accepted: true, provider: 'resend', event_id: eventId })
}

const verifyWhatsApp = async (request: Request, raw: string) => {
  const secret = Deno.env.get('WHATSAPP_WEBHOOK_APP_SECRET') || Deno.env.get('META_APP_SECRET')
  const provided = request.headers.get('x-hub-signature-256') || ''
  if (!secret || !provided) throw new Error('WhatsApp webhook verification is not configured')
  const expected = `sha256=${toHex(await hmac('SHA-256', encoder.encode(secret), raw))}`
  if (!timingSafeEqual(provided, expected)) throw new Error('Invalid WhatsApp webhook signature')
}

const handleWhatsApp = async (request: Request, raw: string, service: ReturnType<typeof serviceClient>) => {
  if (request.method === 'GET') {
    const url = new URL(request.url)
    const token = url.searchParams.get('hub.verify_token')
    const expectedToken = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || Deno.env.get('META_WEBHOOK_VERIFY_TOKEN')
    if (url.searchParams.get('hub.mode') === 'subscribe' && token && expectedToken && token === expectedToken) return text(url.searchParams.get('hub.challenge') || '')
    return text('Webhook verification failed', 403)
  }
  await verifyWhatsApp(request, raw)
  const payload = parseJson(raw)
  let count = 0
  for (const entry of (Array.isArray(payload.entry) ? payload.entry : []) as Json[]) {
    const changes = entry && Array.isArray(entry.changes) ? entry.changes as Json[] : []
    for (const change of changes) {
      const value = change.value && typeof change.value === 'object' ? change.value as Json : {}
      const statuses = Array.isArray(value.statuses) ? value.statuses as Json[] : []
      for (const status of statuses) {
        const messageId = typeof status.id === 'string' ? status.id : ''
        if (!messageId) continue
        const providerStatus = normalizeStatus(status.status)
        const eventId = `${messageId}:${String(status.status || '')}:${String(status.timestamp || '')}`
        const occurredAt = typeof status.timestamp === 'string' ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString()
        await recordEvent(service, 'whatsapp', eventId, messageId, providerStatus, typeof status.recipient_id === 'string' ? status.recipient_id : null, occurredAt, status)
        count += 1
      }
    }
  }
  logEvent('payload_accepted', { provider: 'whatsapp', events: count })
  return json({ accepted: true, provider: 'whatsapp', events: count })
}

const verifyTwilio = async (request: Request, raw: string, params: URLSearchParams) => {
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const signature = request.headers.get('x-twilio-signature')
  const callbackUrl = Deno.env.get('TWILIO_STATUS_CALLBACK_URL') || request.url
  if (!token || !signature) throw new Error('Twilio webhook verification is not configured')
  const sortedFields = [...params.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}${value}`).join('')
  const expected = toBase64(await hmac('SHA-1', encoder.encode(token), callbackUrl + sortedFields))
  if (!timingSafeEqual(signature, expected)) throw new Error('Invalid Twilio webhook signature')
}

const handleTwilio = async (request: Request, raw: string, service: ReturnType<typeof serviceClient>) => {
  const params = new URLSearchParams(raw)
  await verifyTwilio(request, raw, params)
  const messageId = params.get('MessageSid') || params.get('SmsSid')
  if (!messageId) throw new Error('Twilio message SID is missing')
  const providerStatus = normalizeStatus(params.get('MessageStatus'))
  const eventId = `${messageId}:${params.get('MessageStatus') || ''}:${params.get('Timestamp') || ''}`
  const occurredAt = params.get('Timestamp') || new Date().toISOString()
  await recordEvent(service, 'twilio', eventId, messageId, providerStatus, params.get('To'), occurredAt, Object.fromEntries(params.entries()))
  logEvent('status_recorded', { provider: 'twilio', provider_message_id: messageId, status: providerStatus, event_id: eventId })
  return text('', 200)
}

Deno.serve(async (request) => {
  const url = new URL(request.url)
  const requestedProvider = String(url.searchParams.get('provider') || request.headers.get('x-notification-provider') || 'whatsapp').toLowerCase()
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405)
  try {
    const service = serviceClient()
    const raw = await request.text()
    if (requestedProvider === 'resend') return await handleResend(request, raw, service)
    if (requestedProvider === 'whatsapp' || requestedProvider === 'meta') return await handleWhatsApp(request, raw, service)
    if (requestedProvider === 'twilio' || requestedProvider === 'sms') return await handleTwilio(request, raw, service)
    return json({ error: 'Unsupported notification provider' }, 404)
  } catch (error) {
    logEvent('processing_error', { provider: requestedProvider, error: error instanceof Error ? error.message : 'invalid payload' })
    const status = error instanceof Error && error.message.toLowerCase().includes('signature') ? 401 : 400
    return json({ error: error instanceof Error ? error.message : 'Webhook processing failed' }, status)
  }
})
