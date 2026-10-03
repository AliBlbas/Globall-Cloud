import { createClient } from 'npm:@supabase/supabase-js@2'

type Body = { name?: unknown; email?: unknown; phone?: unknown; company_website?: unknown }
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || ''
const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
const text = (value: unknown, max = 240) => String(value ?? '').trim().slice(0, max)
const headers = (req: Request) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(req.headers.get('origin') || '') ? req.headers.get('origin')! : 'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Origin',
})
const json = (req: Request, body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(req) })
const genericSuccess = { ok: true, message: 'داواکارییەکەت وەرگیرا؛ ستاف پێداچوونەوەی دەکات و دوای دیاریکردنی کۆدی GC ئاگادارت دەکاتەوە.' }

async function rateLimit(req: Request) {
  const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 80)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`globall-cloud:customer-account-request:v1:${ip}`))
  const keyHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  const result = await service.rpc('consume_public_message_rate_limit', {
    p_key_hash: keyHash,
    p_window_seconds: 10 * 60,
    p_max_requests: 5,
  })
  if (result.error) throw result.error
  return result.data === true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: headers(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  try {
    const body = await req.json().catch(() => ({})) as Body
    if (text(body.company_website, 120)) return json(req, genericSuccess, 202)
    const name = text(body.name, 160)
    const email = text(body.email, 180).toLowerCase()
    const phone = text(body.phone, 40)
    if (name.length < 2) return json(req, { error: 'ناوەکە کەمە' }, 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(req, { error: 'ئیمەیڵ دروست نییە' }, 400)
    if (!(await rateLimit(req))) return json(req, { error: 'زۆر داواکاری نێردراوە؛ تکایە دواتر هەوڵ بدە.' }, 429)
    const { error } = await service.from('customer_account_requests').insert({ name, email, phone: phone || null })
    if (error && error.code !== '23505') throw error
    // Do not disclose whether this email is already registered or has a pending request.
    return json(req, genericSuccess, 202)
  } catch (error) {
    console.error('customer-gc-register request failed', error instanceof Error ? error.message : String(error))
    return json(req, { error: 'نەتوانرا داواکارییەکەت تۆمار بکرێت؛ تکایە دواتر هەوڵ بدە.' }, 503)
  }
})
