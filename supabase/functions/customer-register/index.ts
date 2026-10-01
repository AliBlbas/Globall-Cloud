import { createClient } from 'npm:@supabase/supabase-js@2'

const URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const headers = (req: Request) => ({ 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(req.headers.get('origin') || '') ? req.headers.get('origin')! : 'https://globall-cloud.pages.dev', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST,OPTIONS', Vary: 'Origin' })
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(req) })
const text = (value: unknown) => String(value ?? '').trim()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: headers(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  if (!URL || !SERVICE_KEY) return json(req, { error: 'Registration service is not configured' }, 500)
  try {
    const body = await req.json().catch(() => ({}))
    const name = text(body.name), phone = text(body.phone), password = String(body.password || ''), confirmation = String(body.confirm_password || '')
    if (name.length < 2 || phone.length < 6) return json(req, { error: 'ناو و ژمارەی مۆبایل پێویستن.' }, 400)
    if (password.length < 12 || password !== confirmation) return json(req, { error: 'وشەی نهێنی دەبێت لانیکەم 12 پیت بێت و دووجار یەکسان بێت.' }, 400)
    const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const { data: code, error: codeError } = await admin.rpc('generate_gc_customer_code')
    if (codeError || !code) throw codeError || new Error('GC code could not be allocated')
    const gcCode = String(code).toUpperCase()
    const email = `${gcCode.toLowerCase()}@customers.globall-cloud.local`
    const { data: created, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name, phone, account_kind: 'customer', gc_code: gcCode } })
    if (userError || !created.user) throw userError || new Error('Auth account could not be created')
    const { error: rowError } = await admin.from('customer_directory').insert({ code: gcCode, gc_code: gcCode, name, phone, email, auth_user_id: created.user.id, is_active: true })
    if (rowError) { await admin.auth.admin.deleteUser(created.user.id); throw rowError }
    const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
    const auth = createClient(URL, anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const { data: session, error: signInError } = await auth.auth.signInWithPassword({ email, password })
    if (signInError || !session.session) throw signInError || new Error('Could not create login session')
    return json(req, { gc_code: gcCode, session: session.session, user: session.user }, 201)
  } catch (error) {
    console.error('customer-register error', error)
    const message = error instanceof Error && /already exists|duplicate|unique/i.test(error.message) ? 'ئەم ژمارەیە پێشتر تۆمارکراوە.' : 'تۆمارکردن سەرکەوتوو نەبوو؛ تکایە دواتر هەوڵبدەوە.'
    return json(req, { error: message }, 400)
  }
})
