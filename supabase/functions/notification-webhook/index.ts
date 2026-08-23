import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>
const json = (body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const textEncoder = new TextEncoder()
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes)).map((value) => value.toString(16).padStart(2, '0')).join('')
const timingSafeEqual = (left: string, right: string) => left.length === right.length && Array.from(left).reduce((ok, value, index) => ok && value === right[index], true)
const hmacSha256 = async (secret: string, body: string) => hex(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', textEncoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), textEncoder.encode(body)))
const serviceClient = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
const verifyMetaSignature = async (req: Request, rawBody: string) => {
  const appSecret = Deno.env.get('WHATSAPP_WEBHOOK_APP_SECRET')
  if (!appSecret) return false
  const provided = req.headers.get('x-hub-signature-256') || ''
  const expected = `sha256=${await hmacSha256(appSecret, rawBody)}`
  return timingSafeEqual(provided, expected)
}
const statusFromValue = (value: string) => ({ sent: 'sent', delivered: 'delivered', read: 'read', failed: 'failed' } as Record<string, string>)[value] || null
const logEvent = (event: string, fields: Record<string, unknown> = {}) => console.info(JSON.stringify({ service: 'notification-webhook', event, at: new Date().toISOString(), ...fields }))
Deno.serve(async (req) => {
  const url = new URL(req.url)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token && challenge && token === Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN')) return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain' } })
    return json({ error: 'Webhook verification failed' }, 403)
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const rawBody = await req.text()
  if (!(await verifyMetaSignature(req, rawBody))) {
    logEvent('signature_rejected', { method: req.method })
    return json({ error: 'Invalid webhook signature' }, 401)
  }
  try {
    const payload = JSON.parse(rawBody) as Json
    const service = serviceClient()
    const events: Json[] = []
    for (const entry of (Array.isArray(payload.entry) ? payload.entry : []) as Json[]) {
      const changes = Array.isArray(entry.changes) ? entry.changes : []
      for (const change of changes as Json[]) {
        const value = (change.value && typeof change.value === 'object' ? change.value : {}) as Json
        const statuses = Array.isArray(value.statuses) ? value.statuses : []
        for (const status of statuses as Json[]) {
          const providerMessageId = typeof status.id === 'string' ? status.id : null
          const providerStatus = typeof status.status === 'string' ? statusFromValue(status.status) : null
          if (!providerMessageId || !providerStatus) continue
          const eventId = `${providerMessageId}:${String(status.status)}:${String(status.timestamp || '')}`
          const result = await service.rpc('record_notification_delivery_event', { p_provider: 'whatsapp', p_provider_event_id: eventId, p_provider_message_id: providerMessageId, p_status: providerStatus, p_recipient: typeof status.recipient_id === 'string' ? status.recipient_id : null, p_occurred_at: typeof status.timestamp === 'string' ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString(), p_raw_payload: status })
          if (result.error) throw result.error
          logEvent('status_recorded', { provider: 'whatsapp', provider_message_id: providerMessageId, status: providerStatus, event_id: eventId })
          events.push({ provider_message_id: providerMessageId, status: providerStatus })
        }
      }
    }
    logEvent('payload_accepted', { provider: 'whatsapp', events: events.length })
    return json({ accepted: true, events: events.length })
  } catch (error) {
    console.error(JSON.stringify({ service: 'notification-webhook', event: 'processing_error', at: new Date().toISOString(), error: error instanceof Error ? error.message : 'invalid payload' }))
    return json({ error: 'Webhook processing failed' }, 400)
  }
})
