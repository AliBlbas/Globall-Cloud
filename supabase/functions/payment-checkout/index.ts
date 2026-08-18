import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  cancelProviderPayment,
  createProviderPayment,
  getProviderPayment,
  normalizeProviderStatus,
  type PaymentProvider,
} from '../_shared/payment-providers.ts'

type Json = Record<string, unknown>
const ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const headers = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://globall-cloud.pages.dev',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-idempotency-key',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}
const json = (req: Request, body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(req) })
const requiredText = (value: unknown, name: string, max = 240) => {
  const text = String(value ?? '').trim()
  if (!text || text.length > max) throw new Error(`${name} is required`)
  return text
}
const providerValue = (value: unknown): PaymentProvider => {
  const provider = String(value ?? '').trim().toLowerCase()
  if (provider !== 'qicard' && provider !== 'fib') throw new Error('provider must be qicard or fib')
  return provider
}
const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !key) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
const authenticate = async (req: Request) => {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const authorization = req.headers.get('authorization') || ''
  if (!url || !anon || !authorization.toLowerCase().startsWith('bearer ')) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: headers(req) })
  const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: authorization } } })
  const result = await userClient.auth.getUser()
  if (result.error || !result.data.user) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: headers(req) })
  const service = serviceClient()
  const staff = await service.from('staff').select('id,role,is_active').eq('id', result.data.user.id).maybeSingle()
  if (staff.error) throw staff.error
  return { service, userId: result.data.user.id, staff: staff.data && staff.data.is_active ? staff.data : null }
}
const assertSessionAccess = async (service: ReturnType<typeof serviceClient>, sessionId: string, userId: string, isStaff: boolean) => {
  const result = await service.from('payment_sessions').select('*').eq('id', sessionId).maybeSingle()
  if (result.error) throw result.error
  if (!result.data) throw new Error('Payment session not found')
  if (!isStaff && result.data.customer_user_id !== userId) throw new Error('Payment session access denied')
  return result.data as Record<string, unknown>
}
const finishUrl = () => Deno.env.get('PAYMENT_FINISH_URL')?.trim() || 'https://globall-cloud.pages.dev/payment-checkout.html'
const webhookUrl = (provider: PaymentProvider) => {
  const configured = Deno.env.get(provider === 'qicard' ? 'QICARD_WEBHOOK_URL' : 'FIB_CALLBACK_URL')?.trim()
  if (configured) return configured
  const base = Deno.env.get('SUPABASE_URL')
  if (!base) throw new Error('SUPABASE_URL is not configured')
  return `${base}/functions/v1/payment-webhook/${provider}`
}

const createSession = async (req: Request, service: ReturnType<typeof serviceClient>, userId: string, isStaff: boolean, data: Json) => {
  const provider = providerValue(data.provider)
  const invoiceId = requiredText(data.invoice_id, 'invoice_id', 80)
  const idempotencyKey = requiredText(data.idempotency_key || req.headers.get('x-idempotency-key'), 'idempotency_key', 180)
  const amount = Number(data.amount)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('amount must be positive')
  const invoice = await service.from('shipment_invoices').select('id,shipment_id,customer_user_id,total,paid_total,currency,invoice_number').eq('id', invoiceId).maybeSingle()
  if (invoice.error) throw invoice.error
  if (!invoice.data) throw new Error('Invoice not found')
  if (!isStaff && invoice.data.customer_user_id !== userId) throw new Error('Invoice access denied')
  const sessionResult = await service.rpc('create_payment_session', {
    p_actor_id: userId,
    p_invoice_id: invoiceId,
    p_provider: provider,
    p_amount: amount,
    p_currency: invoice.data.currency,
    p_idempotency_key: idempotencyKey,
    p_metadata: { invoice_number: invoice.data.invoice_number, requested_by: userId },
  })
  if (sessionResult.error) throw sessionResult.error
  const session = sessionResult.data as Record<string, unknown>
  if (session.provider_payment_id && session.checkout_url) return { session, reused: true }
  try {
    const providerPayment = await createProviderPayment(provider, {
      requestId: String(session.id),
      amount: Number(session.amount),
      currency: String(session.currency),
      finishPaymentUrl: finishUrl(),
      notificationUrl: webhookUrl(provider),
      description: `Globall ${invoice.data.invoice_number}`,
    })
    const update = await service.from('payment_sessions').update({
      status: 'pending',
      provider_request_id: providerPayment.providerRequestId || null,
      provider_payment_id: providerPayment.providerPaymentId || null,
      provider_status: providerPayment.providerStatus || null,
      checkout_url: providerPayment.checkoutUrl || null,
      qr_code: providerPayment.qrCode || null,
      readable_code: providerPayment.readableCode || null,
      expires_at: providerPayment.validUntil || null,
      metadata: providerPayment.raw,
      updated_at: new Date().toISOString(),
    }).eq('id', String(session.id)).select('*').single()
    if (update.error) throw update.error
    return { session: update.data, provider: providerPayment, reused: false }
  } catch (error) {
    await service.from('payment_sessions').update({ status: 'failed', failure_reason: error instanceof Error ? error.message : 'Provider create failed', updated_at: new Date().toISOString() }).eq('id', String(session.id))
    throw new Error(`Provider payment creation failed: ${error instanceof Error ? error.message : 'unknown provider error'}`)
  }
}

const refreshSession = async (service: ReturnType<typeof serviceClient>, session: Record<string, unknown>) => {
  const provider = String(session.provider) as PaymentProvider
  const paymentId = String(session.provider_payment_id || '')
  if (!paymentId) throw new Error('Provider payment is not created yet')
  const providerPayment = await getProviderPayment(provider, paymentId)
  const status = normalizeProviderStatus(provider, providerPayment.providerStatus || '')
  const settled = await service.rpc('settle_payment_session', {
    p_session_id: String(session.id),
    p_status: status,
    p_provider_payment_id: paymentId,
    p_provider_status: providerPayment.providerStatus || null,
    p_provider_amount: providerPayment.amount ?? null,
    p_provider_currency: providerPayment.currency || null,
    p_metadata: providerPayment.raw,
  })
  if (settled.error) throw settled.error
  return { session: settled.data, provider: providerPayment }
}

const cancelSession = async (service: ReturnType<typeof serviceClient>, session: Record<string, unknown>) => {
  const provider = String(session.provider) as PaymentProvider
  const paymentId = String(session.provider_payment_id || '')
  if (!paymentId) throw new Error('Provider payment is not created yet')
  await cancelProviderPayment(provider, paymentId)
  const result = await service.rpc('settle_payment_session', {
    p_session_id: String(session.id),
    p_status: 'cancelled',
    p_provider_payment_id: paymentId,
    p_provider_status: 'CANCELLED',
    p_metadata: { cancelled_by: 'customer_or_staff' },
  })
  if (result.error) throw result.error
  return result.data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: headers(req) })
  try {
    const { service, userId, staff } = await authenticate(req)
    const isStaff = Boolean(staff && ['admin', 'super_admin', 'accountant'].includes(String(staff.role)))
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const invoiceId = url.searchParams.get('invoice_id')?.trim()
      if (invoiceId) {
        const invoice = await service.from('shipment_invoices').select('id,invoice_number,shipment_id,customer_user_id,total,paid_total,currency,status,due_at').eq('id', invoiceId).maybeSingle()
        if (invoice.error) throw invoice.error
        if (!invoice.data || (!isStaff && invoice.data.customer_user_id && invoice.data.customer_user_id !== userId)) return json(req, { error: 'Invoice not found' }, 404)
        return json(req, { invoice: invoice.data })
      }
      const sessionId = requiredText(url.searchParams.get('session_id'), 'session_id', 80)
      const session = await assertSessionAccess(service, sessionId, userId, isStaff)
      return json(req, { session })
    }
    if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
    const body = await req.json().catch(() => ({})) as Json
    const action = String(body.action || '').trim().toLowerCase()
    if (action === 'create') return json(req, await createSession(req, service, userId, isStaff, (body.data || body) as Json))
    const sessionId = requiredText((body.data as Json)?.session_id || body.session_id, 'session_id', 80)
    const session = await assertSessionAccess(service, sessionId, userId, isStaff)
    if (action === 'status') return json(req, await refreshSession(service, session))
    if (action === 'cancel') return json(req, { session: await cancelSession(service, session) })
    return json(req, { error: 'Unsupported action' }, 400)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('payment-checkout error', error)
    return json(req, { error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})
