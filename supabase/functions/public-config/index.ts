import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const WINDOW_SECONDS = 10 * 60
const MAX_PER_WINDOW = 60
const RATE_LIMIT_PREFIX = 'globall-cloud:public-config:v1:'
const headers = (origin = '') => ({
  'Content-Type': 'application/json; charset=utf-8',
  ...(ALLOWED_ORIGINS.has(origin) ? {'Access-Control-Allow-Origin': origin} : {}),
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Cache-Control': 'no-store',
  'Vary': 'Origin',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
})
const json = (req: Request, body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {status, headers: headers(req.headers.get('origin') || '')})
const env = (name: string) => { const v = Deno.env.get(name); if (!v) throw new Error(`${name} is not configured`); return v }
const serviceKey = () => env('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || ''
const serviceClient = () => createClient(env('SUPABASE_URL'), serviceKey(), {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}})
const clientKey = (req: Request) => (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 80) || 'unknown'
const sha256Hex = async (value: string) => { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('') }

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || ''
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, {error: 'Origin not allowed'}, 403)
  if (req.method === 'OPTIONS') return new Response('ok', {headers: headers(origin)})
  if (req.method !== 'GET') return json(req, {error: 'Method not allowed'}, 405)
  try {
    const client = serviceClient()
    const keyHash = await sha256Hex(`${RATE_LIMIT_PREFIX}${clientKey(req)}`)
    const limit = await client.rpc('consume_public_message_rate_limit', {p_key_hash: keyHash, p_window_seconds: WINDOW_SECONDS, p_max_requests: MAX_PER_WINDOW})
    if (limit.error) throw limit.error
    if (limit.data !== true) return json(req, {error: 'Too many requests. Please try again later.'}, 429)
    const key = new URL(req.url).searchParams.get('key') || 'usd_iqd_rate'
    if (key !== 'usd_iqd_rate') return json(req, {error: 'Unsupported configuration key'}, 400)
    const {data, error} = await client.from('app_settings').select('key,value').eq('key', key).maybeSingle()
    if (error) { console.error('[public-config] read error', error.message); return json(req, {error: 'Internal server error'}, 500) }
    if (!data) return json(req, {error: 'Configuration not found'}, 404)
    return json(req, {key: data.key, value: data.value})
  } catch (error) {
    console.error('[public-config] unexpected error', error instanceof Error ? error.message : String(error))
    return json(req, {error: 'Internal server error'}, 500)
  }
})
