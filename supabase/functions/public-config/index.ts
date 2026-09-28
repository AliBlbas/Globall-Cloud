import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const WINDOW_SECONDS = 10 * 60
const MAX_PER_WINDOW = 60
const buckets = new Map<string, { startedAt: number; count: number }>()

const headers = (origin = '') => ({
  'Content-Type': 'application/json; charset=utf-8',
  ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
  'Vary': 'Origin',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
})
const json = (req: Request, body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(req.headers.get('origin') || '') })
const env = (name: string) => { const value = Deno.env.get(name)?.trim(); if (!value) throw new Error(`${name} is not configured`); return value }
const clientKey = (req: Request) => (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 80) || 'unknown'
function withinRateLimit(key: string) {
  const now = Date.now(); const previous = buckets.get(key)
  if (!previous || now - previous.startedAt >= WINDOW_SECONDS * 1000) { buckets.set(key, { startedAt: now, count: 1 }); if (buckets.size > 512) buckets.delete(buckets.keys().next().value as string); return true }
  previous.count += 1; return previous.count <= MAX_PER_WINDOW
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || ''
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { error: 'Origin not allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: headers(origin) })
  if (req.method !== 'GET') return json(req, { error: 'Method not allowed' }, 405)
  if (!withinRateLimit(`public-config:${clientKey(req)}`)) return json(req, { error: 'Too many requests. Please try again later.' }, 429)
  const key = new URL(req.url).searchParams.get('key') || 'usd_iqd_rate'
  if (key !== 'usd_iqd_rate') return json(req, { error: 'Unsupported configuration key' }, 400)
  try {
    const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const { data, error } = await client.from('app_settings').select('key,value').eq('key', key).maybeSingle()
    if (error) { console.error('[public-config] read error', error.message); return json(req, { error: 'Internal server error' }, 500) }
    if (!data) return json(req, { error: 'Configuration not found' }, 404)
    return json(req, { key: data.key, value: data.value })
  } catch (error) { console.error('[public-config] unexpected error', error instanceof Error ? error.message : String(error)); return json(req, { error: 'Internal server error' }, 500) }
})
