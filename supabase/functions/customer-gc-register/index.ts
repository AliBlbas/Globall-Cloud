import { createClient } from 'npm:@supabase/supabase-js@2'

type Body = { name?: unknown; email?: unknown; phone?: unknown; password?: unknown }
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const text = (value: unknown, max = 240) => String(value ?? '').trim().slice(0, max)
const headers = (req: Request) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(req.headers.get('origin') || '') ? req.headers.get('origin')! : 'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST,OPTIONS', Vary: 'Origin',
})
const json = (req: Request, body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(req) })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: headers(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  let createdUserId = ''
  try {
    const body = await req.json().catch(() => ({})) as Body
    const name = text(body.name, 160)
    const email = text(body.email, 180).toLowerCase()
    const phone = text(body.phone, 40)
    const password = text(body.password, 128)
    if (name.length < 2) return json(req, { error: 'ناوەکە کەمە' }, 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(req, { error: 'ئیمەیڵ دروست نییە' }, 400)
    if (password.length < 12) return json(req, { error: 'وشەی نهێنی دەبێت لانیکەم 12 پیت بێت' }, 400)
    const existing = await service.from('customer_directory').select('id').eq('email', email).limit(1).maybeSingle()
    if (existing.error) throw existing.error
    if (existing.data) return json(req, { error: 'ئەم ئیمەیڵە پێشتر بەکارهاتووە' }, 409)
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name, name } })
    if (created.error || !created.user) return json(req, { error: created.error?.message || 'دروستکردنی هەژمار سەرکەوتوو نەبوو' }, 400)
    createdUserId = created.user.id
    const registered = await service.rpc('register_customer_with_gc', { p_auth_user_id: created.user.id, p_name: name, p_email: email, p_phone: phone || null })
    if (registered.error) throw registered.error
    return json(req, { ok: true, customer: registered.data, message: 'هەژمارەکەت دروست کرا' })
  } catch (error) {
    if (createdUserId) await service.auth.admin.deleteUser(createdUserId)
    console.error('customer-gc-register error', error instanceof Error ? error.message : String(error))
    const message = String(error instanceof Error ? error.message : error)
    return json(req, { error: /already exists|duplicate|unique/i.test(message) ? 'ئەم زانیارییە پێشتر بەکارهاتووە' : 'تۆمارکردن ئێستا بەردەست نییە' }, 500)
  }
})
