import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })

const safeEqual = (left: Uint8Array, right: Uint8Array) => left.length === right.length && left.every((value, index) => value === right[index])
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes)).map((value) => value.toString(16).padStart(2, '0')).join('')

const verifyHmac = async (body: string, signature: string, secret: string) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const normalized = signature.replace(/^sha256=/i, '').trim().toLowerCase()
  const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return safeEqual(new TextEncoder().encode(hex(expected)), new TextEncoder().encode(normalized))
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const rawBody = await req.text()
    if (rawBody.length > 512_000) return json({ error: 'Payload too large' }, 413)
    const body = JSON.parse(rawBody) as Record<string, unknown>
    const provider = String(body.provider || req.headers.get('x-provider') || '').trim().toLowerCase()
    const eventId = String(body.event_id || req.headers.get('x-event-id') || '').trim()
    const eventType = String(body.event_type || req.headers.get('x-event-type') || '').trim().toLowerCase()
    const signature = String(req.headers.get('x-webhook-signature') || '').trim()
    const payload = (body.payload && typeof body.payload === 'object' ? body.payload : body) as Record<string, unknown>
    if (!provider || !eventId || !eventType || !signature) return json({ error: 'provider, event_id, event_type and x-webhook-signature header are required' }, 400)
    if (!/^[a-z0-9._-]{2,64}$/.test(provider) || !/^[a-zA-Z0-9._:-]{2,180}$/.test(eventId)) return json({ error: 'Invalid webhook identity' }, 400)
    const secret = Deno.env.get(`INTEGRATION_WEBHOOK_SECRET_${provider.toUpperCase()}`) || Deno.env.get('INTEGRATION_WEBHOOK_SECRET')
    if (!secret) return json({ error: 'Webhook provider is not configured' }, 503)
    if (!(await verifyHmac(rawBody, signature, secret))) return json({ error: 'Invalid signature' }, 401)
    const url = Deno.env.get('SUPABASE_URL')
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
    if (!url || !serviceRole) return json({ error: 'Backend configuration unavailable' }, 500)
    const service = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const inserted = await service.from('integration_inbox').insert({ provider, event_id: eventId, event_type: eventType, payload, signature_valid: true, status: 'received' }).select('id,provider,event_id,event_type,status,received_at').maybeSingle()
    if (inserted.error?.code === '23505') return json({ ok: true, duplicate: true, provider, event_id: eventId })
    if (inserted.error) throw inserted.error
    return json({ ok: true, accepted: true, event: inserted.data })
  } catch (error) {
    console.error('integration-webhook error', error)
    return json({ error: error instanceof Error ? error.message : 'Invalid webhook request' }, 400)
  }
})
