import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
])

const ALLOWED_ROLES = new Set([
  'admin',
  'super_admin',
  'accountant',
  'finance',
  'warehouse',
  'warehouse_china',
  'warehouse_uae',
  'warehouse_erbil',
  'operations',
  'driver',
  'delivery',
])

function headers(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Vary': 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(req) })
}

function serviceKey() {
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || ''
}

function publicKey() {
  return Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
}

async function getUser(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = publicKey()
  if (!url || !anon) throw new Error('Supabase public configuration is missing')

  const authorization = req.headers.get('Authorization') || ''
  if (!authorization) return null

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } },
  })

  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: headers(req) })
  if (req.method !== 'GET') return json(req, { error: 'Method not allowed' }, 405)

  try {
    const user = await getUser(req)
    if (!user?.id) return json(req, { authorized: false, error: 'Unauthorized' }, 401)

    const url = Deno.env.get('SUPABASE_URL')
    const service = serviceKey()
    if (!url || !service) throw new Error('Supabase service configuration is missing')

    const db = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const { data: staff, error } = await db
      .from('staff')
      .select('id,full_name,role,branch,is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (error) throw error
    if (!staff) return json(req, { authorized: false, error: 'Staff account not found' }, 403)
    if (staff.is_active !== true) return json(req, { authorized: false, error: 'Staff account is inactive' }, 403)
    if (!ALLOWED_ROLES.has(String(staff.role || ''))) return json(req, { authorized: false, error: 'Staff role is not allowed' }, 403)

    return json(req, {
      authorized: true,
      staff: {
        ...staff,
        email: user.email || null,
      },
    })
  } catch (error) {
    console.error('staff-auth-verify error', error)
    return json(req, { authorized: false, error: error instanceof Error ? error.message : 'Staff verification failed' }, 500)
  }
})
