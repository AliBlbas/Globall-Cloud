import { createClient } from 'npm:@supabase/supabase-js@2'
import { getProviderPayment, normalizeProviderStatus, type PaymentProvider } from '../_shared/payment-providers.ts'

type Json = Record<string, unknown>
const response = (body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !key) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405)
  try {
    const workerSecret = Deno.env.get('PAYMENT_WORKER_SECRET')?.trim()
    if (!workerSecret || req.headers.get('x-payment-worker-secret') !== workerSecret) return response({ error: 'Unauthorized worker' }, 401)
    const service = serviceClient()
    const limit = Math.min(100, Math.max(1, Number((await req.clone().json().catch(() => ({})) as Json).limit || 50)))
    const pending = await service.from('payment_sessions').select('id,provider,provider_payment_id,status,amount,currency,expires_at').in('status', ['created', 'pending']).not('provider_payment_id', 'is', null).order('created_at', { ascending: true }).limit(limit)
    if (pending.error) throw pending.error
    const summary = { checked: 0, succeeded: 0, failed: 0, pending: 0, expired: 0, errors: [] as string[] }
    for (const session of pending.data || []) {
      summary.checked += 1
      try {
        const provider = String(session.provider) as PaymentProvider
        const providerPayment = await getProviderPayment(provider, String(session.provider_payment_id))
        const normalized = normalizeProviderStatus(provider, providerPayment.providerStatus || '')
        const finalStatus = normalized === 'pending' && session.expires_at && new Date(session.expires_at).getTime() <= Date.now() ? 'expired' : normalized
        const settled = await service.rpc('settle_payment_session', {
          p_session_id: session.id,
          p_status: finalStatus,
          p_provider_payment_id: session.provider_payment_id,
          p_provider_status: providerPayment.providerStatus || null,
          p_provider_amount: providerPayment.amount ?? null,
          p_provider_currency: providerPayment.currency || null,
          p_metadata: { reconciliation: true, checked_at: new Date().toISOString(), provider: providerPayment.raw },
        })
        if (settled.error) throw settled.error
        if (finalStatus === 'succeeded') summary.succeeded += 1
        else if (finalStatus === 'failed') summary.failed += 1
        else if (finalStatus === 'expired') summary.expired += 1
        else summary.pending += 1
      } catch (error) {
        summary.errors.push(`${session.id}: ${error instanceof Error ? error.message : 'unknown error'}`)
      }
    }
    return response({ ok: true, summary })
  } catch (error) {
    console.error('payment-reconcile error', error)
    return response({ error: error instanceof Error ? error.message : 'Reconciliation failed' }, 500)
  }
})
