import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])

function headers(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://globall-cloud.pages.dev',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Vary': 'Origin',
  }
}
function json(req: Request, body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: headers(req) }) }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: headers(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) return json(req, { error: 'Authentication service is not configured' }, 500)
  try {
    const body = await req.json().catch(() => ({}))
    const code = String(body.code || '').trim().toUpperCase()
    const password = String(body.password || '')
    if (!/^GC-[0-9]{3,}$/.test(code) || !password) return json(req, { error: 'GC code and password are required' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const { data: customer, error: lookupError } = await admin
      .from('customer_directory')
      .select('email,auth_user_id,is_active')
      .or(`code.eq.${code},gc_code.eq.${code}`)
      .eq('is_active', true)
      .maybeSingle()
    if (lookupError) throw lookupError
    // Deliberately return the same generic error for missing, inactive, or unlinked accounts.
    if (!customer?.email || !customer.auth_user_id) return json(req, { error: 'Invalid GC code or password' }, 401)

    const auth = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const { data, error } = await auth.auth.signInWithPassword({ email: customer.email, password })
    if (error || !data.session) return json(req, { error: 'Invalid GC code or password' }, 401)
    return json(req, { session: data.session, user: data.user })
  } catch (error) {
    console.error('customer-gc-login error', error)
    return json(req, { error: 'Unable to sign in with this GC code' }, 500)
  }
})
