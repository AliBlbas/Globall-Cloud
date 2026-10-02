import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGINS = new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const ROLES = new Set(['super_admin','admin','accountant','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','delivery','finance'])
const cors = (req: Request) => ({
  'Content-Type':'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': ORIGINS.has(req.headers.get('origin') || '') ? req.headers.get('origin')! : 'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
  'Access-Control-Allow-Methods':'GET,OPTIONS', 'Cache-Control':'no-store', 'Vary':'Origin'
})
const out = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors(req) })
const fail = (message: string) => { throw new Error(message) }
async function auth(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const token = req.headers.get('Authorization') || ''; if (!/^Bearer\s+/i.test(token)) fail('Unauthorized')
  const client = createClient(url, anon, { global: { headers: { Authorization: token } }, auth: { persistSession:false, autoRefreshToken:false } })
  const user = await client.auth.getUser(); if (user.error || !user.data.user) fail('Unauthorized')
  const db = createClient(url, service, { auth: { persistSession:false, autoRefreshToken:false } })
  const staff = await db.from('staff').select('id,full_name,role,branch,is_active').eq('id', user.data.user.id).maybeSingle()
  if (staff.error) throw staff.error
  if (!staff.data?.is_active || !ROLES.has(String(staff.data.role))) fail('Staff permission required')
  return { db, staff: staff.data }
}
async function read(req: Request) {
  const { db, staff } = await auth(req); const kind = new URL(req.url).searchParams.get('kind') || 'overview'
  if (kind === 'pricing') {
    const rates = await db.from('pricing_rates').select('*').eq('is_active', true).order('origin_key').order('transport_mode').order('product_type')
    if (rates.error) throw rates.error
    const fx = await db.from('exchange_rates').select('*').eq('is_active', true).order('updated_at', { ascending:false }).limit(20)
    const rules = await db.from('pricing_rules').select('*').order('created_at', { ascending:false }).limit(100)
    return { kind, rates: rates.data || [], exchange_rates: fx.error ? [] : (fx.data || []), rules: rules.error ? [] : (rules.data || []), degraded: { exchange_rates: !!fx.error, pricing_rules: !!rules.error } }
  }
  if (kind === 'finance') {
    const tx = await db.from('finance_transactions').select('*').order('created_at', { ascending:false }).limit(1000)
    if (tx.error) throw tx.error
    const summary = await db.from('v_financial_summary').select('*').limit(1000)
    return { kind, transactions: tx.data || [], summary: summary.error ? [] : (summary.data || []), degraded: { summary: !!summary.error } }
  }
  if (kind === 'warehouses') {
    const receipts = await db.from('warehouse_receipts').select('*').order('received_at', { ascending:false }).limit(200)
    if (receipts.error) throw receipts.error
    return { kind, items: receipts.data || [], photos_best_effort: true }
  }
  return { kind:'overview', ok:true, staff:{ id:staff.id, role:staff.role, branch:staff.branch || 'all' } }
}
Deno.serve(async req => { if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) }); try { return out(req, await read(req)) } catch (e) { const m = e instanceof Error ? e.message : String(e); return out(req, { error:m }, /Unauthorized/i.test(m) ? 401 : /permission|Forbidden/i.test(m) ? 403 : 500) } })
