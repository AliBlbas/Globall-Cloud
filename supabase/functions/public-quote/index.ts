const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const buckets = new Map<string, { start: number; count: number }>()

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
const clientKey = (req: Request) => (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim().slice(0, 80)
const rateLimited = (key: string) => {
  const now = Date.now(); const current = buckets.get(key)
  if (!current || now - current.start >= WINDOW_MS) { buckets.set(key, { start: now, count: 1 }); return false }
  if (current.count >= MAX_PER_WINDOW) return true
  current.count += 1; return false
}
const headers = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  return {'Content-Type':'application/json; charset=utf-8', ...(ALLOWED_ORIGINS.has(origin) ? {'Access-Control-Allow-Origin':origin} : {}), 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods':'POST,OPTIONS', 'Cache-Control':'no-store', 'Vary':'Origin', 'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY'}
}
const reply = (req: Request, body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {status, headers: headers(req)})

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || ''
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(req, {error:'Origin not allowed'}, 403)
  if (req.method === 'OPTIONS') return new Response('ok', {headers: headers(req)})
  if (req.method !== 'POST') return reply(req, {error:'Method not allowed'}, 405)
  if (rateLimited(clientKey(req))) return reply(req, {error:'Too many requests. Please try again later.'}, 429)
  try {
    const body = await req.json().catch(() => ({}))
    if (text(body.company_website, 120)) return reply(req, {ok:true}, 201)
    const name = text(body.name, 100), email = text(body.email, 160).toLowerCase(), phone = text(body.phone, 40)
    const originKey = text(body.origin_key, 100), destKey = text(body.dest_key, 100), mode = text(body.transport_mode, 30)
    const level = text(body.service_level, 30) || 'standard', incoterm = text(body.incoterm, 12) || 'EXW', notes = text(body.notes, 2000)
    const weight = numberOrNull(body.weight_kg, 100000), volume = numberOrNull(body.volume_cbm, 100000), items = numberOrNull(body.items_count, 1000000)
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !originKey || !destKey || !['air','sea','land','multimodal'].includes(mode) || !['standard','express','priority'].includes(level) || !['EXW','FOB','CIF','DDP'].includes(incoterm) || weight === null || weight <= 0) return reply(req, {error:'Please check the required quote fields.'}, 400)
    const url = env('SUPABASE_URL'), key = env('SUPABASE_SERVICE_ROLE_KEY')
    const response = await fetch(url + '/rest/v1/quote_requests', {method:'POST', headers:{apikey:key, Authorization:'Bearer ' + key, 'Content-Type':'application/json', Prefer:'return=representation'}, body:JSON.stringify({customer_name:name, customer_email:email, customer_phone:phone || null, origin_key:originKey, dest_key:destKey, transport_mode:mode, weight_kg:weight, volume_cbm:volume, items_count:items, service_level:level, incoterm, notes:notes || null, status:'pending'})})
    if (!response.ok) { console.error('[public-quote] insert failed', response.status); return reply(req, {error:'Unable to submit quote request right now.'}, 500) }
    const rows = await response.json()
    return reply(req, {ok:true, request:rows[0] || null}, 201)
  } catch (error) { console.error('[public-quote] unexpected error', error instanceof Error ? error.message : String(error)); return reply(req, {error:'Unable to submit quote request right now.'}, 500) }
})
