import { createClient } from 'npm:@supabase/supabase-js@2'

type Payload = {
  name?: unknown
  email?: unknown
  phone?: unknown
  company?: unknown
  origin_key?: unknown
  dest_key?: unknown
  transport_mode?: unknown
  weight_kg?: unknown
  volume_cbm?: unknown
  items_count?: unknown
  service_level?: unknown
  incoterm?: unknown
  notes?: unknown
  company_website?: unknown
}

const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const buckets = new Map<string, { start: number; count: number }>()

const env = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

const cors = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
  }
}

const json = (req: Request, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors(req) })

const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)

const numberOrNull = (value: unknown, max: number) => {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > max) return null
  return number
}

const clientKey = (req: Request) => {
  const forwarded = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown'
  return forwarded.split(',')[0].trim().slice(0, 80) || 'unknown'
}

const rateLimited = (key: string) => {
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || now - current.start >= WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 })
    return false
  }
  if (current.count >= MAX_PER_WINDOW) return true
  current.count += 1
  return false
}

const getBearerUser = async (req: Request, url: string, anonKey: string) => {
  const authorization = req.headers.get('authorization') || ''
  if (!authorization.toLowerCase().startsWith('bearer ')) return null
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } },
  })
  const { data } = await client.auth.getUser()
  return data.user || null
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || ''
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { error: 'Origin not allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  if (rateLimited(clientKey(req))) return json(req, { error: 'Too many requests. Please try again later.' }, 429)

  try {
    const body = (await req.json().catch(() => ({}))) as Payload
    if (text(body.company_website, 120)) return json(req, { ok: true }, 201)

    const name = text(body.name, 100)
    const email = text(body.email, 160).toLowerCase()
    const phone = text(body.phone, 40)
    const originKey = text(body.origin_key, 100)
    const destKey = text(body.dest_key, 100)
    const transportMode = text(body.transport_mode, 30)
    const serviceLevel = text(body.service_level, 30)
    const incoterm = text(body.incoterm, 12)
    const notes = text(body.notes, 2000)
    const weight = numberOrNull(body.weight_kg, 100000)
    const volume = numberOrNull(body.volume_cbm, 100000)
    const items = numberOrNull(body.items_count, 1000000)

    if (name.length < 2) return json(req, { error: 'Invalid name.' }, 400)
    if (!/^\S+@\S+\.\S+$/.test(email)) return json(req, { error: 'Invalid email.' }, 400)
    if (!originKey || !destKey) return json(req, { error: 'Origin and destination are required.' }, 400)
    if (!['air', 'sea', 'land', 'multimodal'].includes(transportMode)) return json(req, { error: 'Invalid transport mode.' }, 400)
    if (!['standard', 'express', 'priority'].includes(serviceLevel)) return json(req, { error: 'Invalid service level.' }, 400)
    if (!['EXW', 'FOB', 'CIF', 'DDP'].includes(incoterm)) return json(req, { error: 'Invalid incoterm.' }, 400)
    if (weight === null || weight <= 0) return json(req, { error: 'Weight must be greater than zero.' }, 400)

    const url = env('SUPABASE_URL')
    const service = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const user = await getBearerUser(req, url, env('SUPABASE_ANON_KEY'))
    const { data, error } = await service
      .from('quote_requests')
      .insert({
        customer_user_id: user?.id ?? null,
        customer_name: name,
        customer_email: email,
        customer_phone: phone || null,
        origin_key: originKey,
        dest_key: destKey,
        transport_mode: transportMode,
        weight_kg: weight,
        volume_cbm: volume,
        items_count: items,
        service_level: serviceLevel,
        incoterm,
        notes: notes || null,
        status: 'pending',
      })
      .select('id,created_at,status')
      .single()

    if (error) {
      console.error('[public-quote] insert error', error.message)
      return json(req, { error: 'Unable to submit quote request right now.' }, 500)
    }
    return json(req, { ok: true, request: data }, 201)
  } catch (error) {
    console.error('[public-quote] unexpected error', error instanceof Error ? error.message : String(error))
    return json(req, { error: 'Unable to submit quote request right now.' }, 500)
  }
})
