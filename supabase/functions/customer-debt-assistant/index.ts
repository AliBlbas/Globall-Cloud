import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
const env = (name: string) => { const v = Deno.env.get(name); if (!v) throw new Error(`${name} is not configured`); return v }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const url = env('SUPABASE_URL')
    const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
    if (!anon || !service) throw new Error('Supabase keys are not configured')
    const authHeader = req.headers.get('Authorization') || ''
    const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await auth.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401)
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const body = await req.json().catch(() => ({})) as { text?: string }
    const text = String(body.text || '').trim()
    if (!text || text.length > 500) return json({ error: 'Message is empty or too long' }, 400)

    const { data: customer } = await db.from('customer_directory').select('id,code,gc_code,name,auth_user_id,is_active').eq('auth_user_id', userData.user.id).maybeSingle()
    const gcCode = customer?.gc_code || customer?.code || null
    const { data: invoices, error: invoiceError } = await db.from('shipment_invoices').select('id,invoice_number,shipment_id,total,paid_total,currency,status,issued_at').eq('customer_user_id', userData.user.id).order('issued_at', { ascending: false }).limit(100)
    if (invoiceError) throw invoiceError

    const asksDebt = /(قەرز|قەرزار|دەبێ|debt|balance|owe|outstanding)/i.test(text)
    if (!asksDebt) return json({ answer: 'دەتوانم قەرز و باڵانسی حسابەکەت بۆت پیشان بدەم. بنووسە: «چەند قەرزارم؟»', gc_code: gcCode, intent: 'help' })

    const rows = (invoices || []).map((i: any) => {
      const total = Number(i.total || 0)
      const paid = Number(i.paid_total || 0)
      return { ...i, total_number: total, paid_number: paid, outstanding_number: Math.max(0, total - paid) }
    }).filter((i: any) => i.outstanding_number > 0)

    const totals: Record<string, number> = {}
    for (const row of rows) totals[row.currency || 'USD'] = (totals[row.currency || 'USD'] || 0) + row.outstanding_number
    const lines = Object.entries(totals).map(([currency, amount]) => `${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`)
    const answer = rows.length
      ? `بە کۆدی ${gcCode || 'GC'}، قەرزی ئێستات ${lines.join(' وە ')} ـە. ${rows.length} وەسڵی کراوە هەیە.`
      : `بە کۆدی ${gcCode || 'GC'}، ئێستا هیچ قەرزی کراوەیەک تۆمار نەکراوە.`
    const paymentLink = rows[0]?.id ? `/payment-checkout.html?invoice_id=${encodeURIComponent(rows[0].id)}` : null
    return json({ answer, gc_code: gcCode, intent: 'debt', outstanding: totals, open_invoices: rows.map((r: any) => ({ id: r.id, invoice_number: r.invoice_number, shipment_id: r.shipment_id, amount: r.outstanding_number, currency: r.currency, payment_url: `/payment-checkout.html?invoice_id=${encodeURIComponent(r.id)}` })), payment_url: paymentLink })
  } catch (e) {
    console.error('customer-debt-assistant', e)
    return json({ error: e instanceof Error ? e.message : 'Internal server error' }, 500)
  }
})
