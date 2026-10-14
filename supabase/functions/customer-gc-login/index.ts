import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])

function headers(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://globall-cloud.pages.dev',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    Vary: 'Origin',
  }
}
function json(req: Request, body: Json, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(req) })
}
function text(value: unknown, max = 240) { return String(value ?? '').trim().slice(0, max) }
const RATE_WINDOW_SECONDS = 10 * 60
const MAX_LOGIN_REQUESTS_PER_IP = 40
const MAX_LOGIN_REQUESTS_PER_IP_CODE = 8
const RATE_LIMIT_PREFIX = 'globall-cloud:customer-gc-login:v1:'
const clientKey = (req: Request) => (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 80) || 'unknown'
const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
async function rateAllowed(value: string, maximum: number) {
  const key = await sha256Hex(RATE_LIMIT_PREFIX + value)
  const result = await service.rpc('consume_public_message_rate_limit', {
    p_key_hash: key,
    p_window_seconds: RATE_WINDOW_SECONDS,
    p_max_requests: maximum,
  })
  if (result.error) throw result.error
  return result.data === true
}
function normalizeCode(value: unknown) {
  const code = text(value, 40).normalize('NFKC').toUpperCase().replace(/[–—−]/g, '-').replace(/\s+/g, '')
  return /^GC-[A-Z0-9-]{2,30}$/.test(code) ? code : ''
}

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) console.error('customer-gc-login is missing Supabase runtime secrets')
const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const auth = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: headers(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  try {
    const ipKey = clientKey(req)
    if (!(await rateAllowed('ip:' + ipKey, MAX_LOGIN_REQUESTS_PER_IP))) {
      return json(req, { error: 'Too many login attempts. Please try again in 10 minutes.' }, 429)
    }
    const body = await req.json().catch(() => ({})) as Json
    const code = normalizeCode(body.code ?? body.gc_code)
    const password = text(body.password, 200)
    if (!code || !password) return json(req, { error: 'GC code and password are required' }, 400)
    if (!(await rateAllowed('ip-code:' + ipKey + ':' + code, MAX_LOGIN_REQUESTS_PER_IP_CODE))) {
      return json(req, { error: 'Too many login attempts for this GC code. Please try again in 10 minutes.' }, 429)
    }
    const { data: customer, error: customerError } = await service.from('customer_directory').select('id,code,gc_code,name,email,phone,auth_user_id,is_active').or(`code.eq.${code},gc_code.eq.${code}`).limit(1).maybeSingle()
    if (customerError) throw customerError
    if (!customer || customer.is_active !== true || !customer.auth_user_id) return json(req, { error: 'Invalid GC code or password' }, 401)
    const { data: authUser, error: authUserError } = await service.auth.admin.getUserById(String(customer.auth_user_id))
    if (authUserError || !authUser.user?.email) return json(req, { error: 'Customer account is not ready; contact staff' }, 403)
    const { data: session, error: signInError } = await auth.auth.signInWithPassword({ email: authUser.user.email, password })
    if (signInError || !session.session) return json(req, { error: 'Invalid GC code or password' }, 401)
    return json(req, { ok: true, session: { access_token: session.session.access_token, refresh_token: session.session.refresh_token, expires_in: session.session.expires_in, expires_at: session.session.expires_at, token_type: session.session.token_type }, customer: { id: customer.id, code: customer.gc_code || customer.code, name: customer.name } })
  } catch (error) {
    console.error('customer-gc-login error', error instanceof Error ? error.message : String(error))
    return json(req, { error: 'Unable to sign in right now' }, 500)
  }
})
