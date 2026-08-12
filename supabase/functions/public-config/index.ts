import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
])

function originAllowed(req: Request): boolean {
  const origin = req.headers.get('origin')
  return !origin || ALLOWED_ORIGINS.has(origin)
}

function cors(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
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

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

Deno.serve(async (req) => {
  if (!originAllowed(req)) return json(req, { error: 'Origin not allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'GET') return json(req, { error: 'Method not allowed' }, 405)

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')

    const client = createClient(env('SUPABASE_URL'), serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const key = new URL(req.url).searchParams.get('key') || 'usd_iqd_rate'
    if (key !== 'usd_iqd_rate') return json(req, { error: 'Unsupported configuration key' }, 400)

    const { data, error } = await client
      .from('app_settings')
      .select('key,value')
      .eq('key', key)
      .maybeSingle()

    if (error) throw error
    if (!data) return json(req, { error: 'Configuration not found' }, 404)

    return json(req, { key: data.key, value: data.value })
  } catch (_error) {
    console.error('public-config error')
    return json(req, { error: 'Internal server error' }, 500)
  }
})
