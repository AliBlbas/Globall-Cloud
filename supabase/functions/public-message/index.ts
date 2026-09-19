import { createClient } from 'npm:@supabase/supabase-js@2'

type Payload = {
  name?: unknown
  email?: unknown
  message?: unknown
  company?: unknown
  request_type?: unknown
  company_website?: unknown
}

const ALLOWED_ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
])
const WINDOW_SECONDS = 10 * 60
const MAX_PER_WINDOW = 5
const RATE_LIMIT_PREFIX = 'globall-cloud:public-message:v1:'

function originAllowed(req: Request) {
  const origin = req.headers.get('origin')
  return !origin || ALLOWED_ORIGINS.has(origin)
}

function cors(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'content-type, apikey, x-client-info',
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

function text(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max)
}

function clientKey(req: Request) {
  const forwarded = req.headers.get('cf-connecting-ip')
    || req.headers.get('x-forwarded-for')
    || req.headers.get('x-real-ip')
    || 'unknown'
  return forwarded.split(',')[0].trim().slice(0, 80) || 'unknown'
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (!originAllowed(req)) return json(req, { error: 'Origin not allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceKey) throw new Error('Supabase service configuration is missing')

    const service = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const rateLimitKey = await sha256Hex(`${RATE_LIMIT_PREFIX}${clientKey(req)}`)
    const { data: allowed, error: rateLimitError } = await service.rpc(
      'consume_public_message_rate_limit',
      {
        p_key_hash: rateLimitKey,
        p_window_seconds: WINDOW_SECONDS,
        p_max_requests: MAX_PER_WINDOW,
      },
    )
    if (rateLimitError) throw rateLimitError
    if (allowed !== true) return json(req, { error: 'Too many requests. Please try again later.' }, 429)

    const body = (await req.json().catch(() => ({}))) as Payload
    if (text(body.company_website, 120)) return json(req, { ok: true })

    const name = text(body.name, 100)
    const email = text(body.email, 160).toLowerCase()
    const message = text(body.message, 4000)
    const company = text(body.company, 120)
    const requestType = text(body.request_type, 40)

    if (!name || name.length < 2) return json(req, { error: 'Invalid name.' }, 400)
    if (!/^\S+@\S+\.\S+$/.test(email)) return json(req, { error: 'Invalid email.' }, 400)
    if (!message || message.length < 5) return json(req, { error: 'Message is too short.' }, 400)
    if (!['shipping', 'info', 'support'].includes(requestType)) {
      return json(req, { error: 'Invalid request type.' }, 400)
    }

    const { error } = await service.from('messages').insert({
      name,
      email,
      message,
      company: company || null,
      request_type: requestType,
    })
    if (error) throw error

    return json(req, { ok: true }, 201)
  } catch (error) {
    console.error('public-message error', error)
    return json(req, { error: 'Unable to send message right now.' }, 500)
  }
})
