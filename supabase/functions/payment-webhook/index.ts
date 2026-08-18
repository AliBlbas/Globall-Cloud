import { createClient } from 'npm:@supabase/supabase-js@2'
import { getProviderPayment, normalizeProviderStatus, type PaymentProvider } from '../_shared/payment-providers.ts'

type Json = Record<string, unknown>
const json = (body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' } })
const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !key) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
const decodeBase64 = (value: string) => {
  const binary = atob(value.replace(/\s+/g, ''))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}
const pemToDer = (pem: string) => {
  const clean = pem.replace(/-----BEGIN PUBLIC KEY-----/g, '').replace(/-----END PUBLIC KEY-----/g, '').replace(/\s+/g, '')
  return decodeBase64(clean)
}
const verifyQiCardSignature = async (payload: Json, signature: string) => {
  const publicKeyPem = Deno.env.get('QICARD_WEBHOOK_PUBLIC_KEY')?.trim()
  if (!publicKeyPem || !signature) return false
  const amount = payload.amount === undefined || payload.amount === null ? '-' : `${Number(payload.amount).toFixed(3)}`
  const data = [payload.paymentId || '-', amount, payload.currency || '-', payload.creationDate || '-', payload.status || '-'].join('|')
  const key = await crypto.subtle.importKey('spki', pemToDer(publicKeyPem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  return crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, decodeBase64(signature), new TextEncoder().encode(data))
}
const providerFromPath = (req: Request): PaymentProvider => {
  const segment = new URL(req.url).pathname.split('/').filter(Boolean).pop()?.toLowerCase()
  if (segment !== 'qicard' && segment !== 'fib') throw new Error('Provider path must be qicard or fib')
  return segment
}
const safeString = (value: unknown, max = 240) => String(value ?? '').trim().slice(0, max)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const provider = providerFromPath(req)
    const rawBody = await req.text()
    if (rawBody.length > 256_000) return json({ error: 'Payload too large' }, 413)
    const body = JSON.parse(rawBody) as Json
    const paymentId = safeString(body.paymentId || body.id, 180)
    const providerStatus = safeString(body.status, 80)
    if (!paymentId || !providerStatus) return json({ error: 'payment id and status are required' }, 400)
    let signatureValid = false
    if (provider === 'qicard') {
      signatureValid = await verifyQiCardSignature(body, req.headers.get('x-signature') || '')
      if (!signatureValid) return json({ error: 'Invalid QiCard webhook signature' }, 401)
    }
    const eventKey = provider === 'qicard'
      ? safeString(body.requestId || `${paymentId}:${providerStatus}:${safeString(body.creationDate, 80)}`, 240)
      : `${paymentId}:${providerStatus}`
    const service = serviceClient()
    const insert = await service.from('payment_webhook_events').insert({
      provider,
      event_key: eventKey,
      signature_valid: signatureValid,
      provider_status: providerStatus,
      payload: body,
    }).select('id').maybeSingle()
    if (insert.error?.code === '23505') return json({ ok: true, duplicate: true })
    if (insert.error) throw insert.error
    const session = await service.from('payment_sessions').select('id,provider,provider_payment_id').eq('provider', provider).eq('provider_payment_id', paymentId).maybeSingle()
    if (session.error) throw session.error
    if (!session.data) {
      await service.from('payment_webhook_events').update({ processed_at: new Date().toISOString(), processing_error: 'No matching payment session' }).eq('id', insert.data?.id)
      return json({ ok: true, matched: false })
    }
    const providerPayment = await getProviderPayment(provider, paymentId)
    const normalized = normalizeProviderStatus(provider, providerPayment.providerStatus || providerStatus)
    const settled = await service.rpc('settle_payment_session', {
      p_session_id: session.data.id,
      p_status: normalized,
      p_provider_payment_id: paymentId,
      p_provider_status: providerPayment.providerStatus || providerStatus,
      p_provider_amount: providerPayment.amount ?? null,
      p_provider_currency: providerPayment.currency || null,
      p_metadata: { webhook: body, status_requeried: true, fib_callback_signature: signatureValid },
    })
    if (settled.error) throw settled.error
    await service.from('payment_webhook_events').update({ payment_session_id: session.data.id, processed_at: new Date().toISOString() }).eq('id', insert.data?.id)
    return json({ ok: true, matched: true, status: normalized })
  } catch (error) {
    console.error('payment-webhook error', error)
    return json({ error: error instanceof Error ? error.message : 'Webhook processing failed' }, 500)
  }
})
