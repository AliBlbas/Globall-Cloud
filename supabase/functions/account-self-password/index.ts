import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
])

function cors(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  }
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req) },
  })
}

function env(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

  const auth = req.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return json(req, { error: 'Unauthorized' }, 401)

  try {
    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const password = text(payload.password)
    if (password.length < 12) return json(req, { error: 'Password must be at least 12 characters.' }, 400)
    if (password.length > 128) return json(req, { error: 'Password is too long.' }, 400)

    const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: auth } },
    })

    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) return json(req, { error: 'Unauthorized' }, 401)

    const { error } = await client.auth.updateUser({ password })
    if (error) {
      console.error('account-self-password error', error)
      return json(req, { error: 'Password change was not completed.' }, 400)
    }

    return json(req, { ok: true, message: 'Password updated successfully.' })
  } catch (error) {
    console.error('account-self-password error', error)
    return json(req, { error: 'Password change was not completed.' }, 500)
  }
})
