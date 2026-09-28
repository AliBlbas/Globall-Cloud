import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const WINDOW_SECONDS = 10 * 60
const MAX_PER_WINDOW = 30
const RATE_LIMIT_PREFIX = 'globall-cloud:public-pricing:v1:'
const edgeRate = new Map<string, { started: number; count: number }>()

type Json = Record<string, unknown>
const text = (value: unknown, max = 120) => String(value ?? '').trim().slice(0, max)
const num = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}
const env = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}
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
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  }
}
const reply = (req: Request, body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(req) })
const service = () => {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() || Deno.env.get('SUPABASE_SECRET_KEY')?.trim()
  if (!key) throw new Error('Supabase service key is not configured')
  return createClient(env('SUPABASE_URL'), key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
const edgeAllowed = (key: string) => {
  const now = Date.now()
  const current = edgeRate.get(key)
  if (!current || now - current.started >= WINDOW_SECONDS * 1000) {
    edgeRate.set(key, { started: now, count: 1 })
    return true
  }
  current.count += 1
  return current.count <= MAX_PER_WINDOW
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || ''
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(req, { error: 'Origin not allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: headers(req) })
  if (req.method !== 'POST') return reply(req, { error: 'Method not allowed' }, 405)

  try {
    const db = service()
    const keyHash = await sha256Hex(`${RATE_LIMIT_PREFIX}${clientKey(req)}`)
    const limit = await db.rpc('consume_public_message_rate_limit', {
      p_key_hash: keyHash,
      p_window_seconds: WINDOW_SECONDS,
      p_max_requests: MAX_PER_WINDOW,
    })
    if (limit.error) {
      console.warn('[public-pricing] shared rate limiter unavailable; using edge limiter', limit.error.message || String(limit.error))
      if (!edgeAllowed(keyHash)) return reply(req, { error: 'Too many requests. Please try again later.' }, 429)
    } else if (limit.data !== true) return reply(req, { error: 'Too many requests. Please try again later.' }, 429)

    const body = await req.json().catch(() => ({})) as Json
    const product = text(body.product_type, 80).toLowerCase() || 'general'
    const originKey = text(body.origin_key, 80).toLowerCase()
    const destKey = text(body.destination_key, 80).toLowerCase() || 'erbil'
    const mode = text(body.transport_mode, 30).toLowerCase() || 'air'
    const weight = num(body.weight_kg)
    const volume = num(body.volume_cbm)

    if (!originKey) return reply(req, { error: 'Origin is required.', code: 'ORIGIN_REQUIRED' }, 400)
    if (!['air', 'land', 'sea'].includes(mode)) return reply(req, { error: 'Unsupported transport mode.', code: 'MODE_UNSUPPORTED' }, 400)
    if (!['china', 'cn', 'foshan', 'guangzhou', 'dubai', 'uae', 'united arab emirates', 'unitedarabemirates', 'usa', 'us', 'america'].includes(originKey)) {
      return reply(req, { allowed: false, code: 'ORIGIN_UNAVAILABLE', message_ku: 'ئەم شوێنە لە کاتی ئێستادا لە لیستی گواستنەوەدا نییە.' }, 200)
    }

    const compliance = await db.rpc('validate_logistics_cargo', {
      p_product_type: product,
      p_has_battery: body.has_battery === true,
      p_has_liquid: body.has_liquid === true,
      p_msds_provided: body.msds_provided === true,
      p_medical_device: body.medical_device === true,
    })
    if (compliance.error) throw compliance.error
    if (!compliance.data?.allowed) return reply(req, { allowed: false, message_ku: compliance.data?.message_ku || 'کاڵاکە وەرناگیرێت.' }, 200)

    if ((mode === 'sea' && !(volume && volume > 0)) || (mode !== 'sea' && !(weight && weight > 0))) {
      return reply(req, { error: 'Weight or volume is required.' }, 400)
    }

    const result = await db.rpc('calculate_logistics_price', {
      p_origin_key: originKey,
      p_destination_key: destKey,
      p_transport_mode: mode,
      p_product_type: product,
      p_weight_kg: weight,
      p_volume_cbm: volume,
      p_rate_key: null,
    })
    if (result.error) {
      const detail = String(result.error.message || result.error).toLowerCase()
      if (detail.includes('no active rate') || detail.includes('requested route/category') || detail.includes('not configured')) {
        return reply(req, {
          allowed: false,
          code: 'RATE_UNAVAILABLE',
          message_ku: 'بۆ ئەم ڕێگا و جۆری بارە نرخێکی چالاک نییە؛ تکایە ڕێگایەکی تری هەڵبژێرە یان داوای نرخ بنێرە.'
        }, 200)
      }
      throw result.error
    }
    return reply(req, { allowed: true, quote: result.data || null }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('[public-pricing]', message)
    return reply(req, { error: 'Unable to calculate price right now.' }, 500)
  }
})
