import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const ALLOWED_ROUTE_ORIGINS = new Set(['guangzhou', 'shenzhen', 'dubai', 'sharjah', 'china', 'uae', 'usa'])
const ALLOWED_ROUTE_DESTINATIONS = new Set(['erbil', 'sulaymaniyah', 'duhok', 'baghdad', 'basra', 'kirkuk', 'mosul', 'hawler', 'slimani', 'bakhdad', 'kerkuk'])
const WINDOW_SECONDS = 10 * 60
const POST_MAX_PER_WINDOW = 5
const GET_MAX_PER_WINDOW = 30
const RATE_LIMIT_PREFIX = 'globall-cloud:public-quote:v1:'

type Json = Record<string, unknown>
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)
const numberOrNull = (value: unknown, max: number) => {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 && number <= max ? number : null
}
const env = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(name + ' is not configured')
  return value
}
const serviceClient = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const clientKey = (req: Request) => (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 80) || 'unknown'
const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
const headers = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}
const reply = (req: Request, body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(req) })

async function applyRateLimit(db: ReturnType<typeof serviceClient>, req: Request, maxRequests: number, scope: string) {
  const key = await sha256Hex(`${RATE_LIMIT_PREFIX}${scope}:${clientKey(req)}`)
  const result = await db.rpc('consume_public_message_rate_limit', {
    p_key_hash: key,
    p_window_seconds: WINDOW_SECONDS,
    p_max_requests: maxRequests,
  })
  if (result.error) throw result.error
  return result.data === true
}

async function listPublicRates(db: ReturnType<typeof serviceClient>) {
  const result = await db.from('pricing_rates')
    .select('rate_key,origin_key,destination_key,transport_mode,product_type,unit,amount,currency,transit_min_days,transit_max_days,effective_from')
    .eq('destination_key', 'Erbil')
    .eq('is_active', true)
    .order('origin_key', { ascending: true })
    .order('transport_mode', { ascending: true })
    .order('product_type', { ascending: true })
    .limit(100)
  if (result.error) throw result.error
  return result.data || []
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || ''
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(req, { error: 'Origin not allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: headers(req) })
  if (!['GET', 'POST'].includes(req.method)) return reply(req, { error: 'Method not allowed' }, 405)

  try {
    const db = serviceClient()
    const allowed = await applyRateLimit(db, req, req.method === 'GET' ? GET_MAX_PER_WINDOW : POST_MAX_PER_WINDOW, req.method.toLowerCase())
    if (!allowed) return reply(req, { error: 'Too many requests. Please try again later.' }, 429)

    if (req.method === 'GET') {
      if (new URL(req.url).searchParams.get('catalog') !== '1') return reply(req, { error: 'Catalog flag required' }, 400)
      return reply(req, { rates: await listPublicRates(db) })
    }

    const body = await req.json().catch(() => ({})) as Json
    if (text(body.company_website, 120)) return reply(req, { ok: true })

    const name = text(body.name, 100)
    const email = text(body.email, 160).toLowerCase()
    const phone = text(body.phone, 40)
    const originKey = text(body.origin_key, 100)
    const destKey = text(body.dest_key, 100)
    const mode = text(body.transport_mode, 30)
    const level = text(body.service_level, 30) || 'standard'
    const incoterm = text(body.incoterm, 12) || 'EXW'
    const notes = text(body.notes, 2000)
    const weight = numberOrNull(body.weight_kg, 100000)
    const volume = numberOrNull(body.volume_cbm, 100000)
    const items = numberOrNull(body.items_count, 1000000)
    const quantityValid = mode === 'sea' ? volume !== null && volume > 0 : weight !== null && weight > 0

    if (
      name.length < 2 ||
      (email && !/^\S+@\S+\.\S+$/.test(email)) ||
      !ALLOWED_ROUTE_ORIGINS.has(originKey) ||
      !ALLOWED_ROUTE_DESTINATIONS.has(destKey) ||
      !['air', 'sea', 'land', 'multimodal'].includes(mode) ||
      !['standard', 'express', 'priority'].includes(level) ||
      !['EXW', 'FOB', 'CIF', 'DDP'].includes(incoterm) ||
      !quantityValid
    ) return reply(req, { error: 'Please check the required quote fields.' }, 400)

    const response = await fetch(`${env('SUPABASE_URL')}/rest/v1/quote_requests`, {
      method: 'POST',
      headers: {
        apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
        Authorization: 'Bearer ' + env('SUPABASE_SERVICE_ROLE_KEY'),
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        customer_name: name,
        customer_email: email || null,
        customer_phone: phone || null,
        origin_key: originKey,
        dest_key: destKey,
        transport_mode: mode,
        weight_kg: weight,
        volume_cbm: volume,
        items_count: items,
        service_level: level,
        incoterm,
        notes: notes || null,
        status: 'pending',
      }),
    })
    if (!response.ok) {
      console.error('[public-quote] insert failed', response.status)
      return reply(req, { error: 'Unable to submit quote request right now.' }, 500)
    }
    const rows = await response.json().catch(() => [])
    const created = Array.isArray(rows) ? rows[0] || null : null
    const requestId = created?.request_number || created?.request_id || created?.id || null
    return reply(req, { ok: true, request: requestId ? { request_number: String(requestId) } : null }, 201)
  } catch (error) {
    console.error('[public-quote] unexpected error', error instanceof Error ? error.message : String(error))
    return reply(req, { error: 'Unable to process this quote request right now.' }, 500)
  }
})
