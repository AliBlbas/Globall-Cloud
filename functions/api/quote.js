const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const clean = {
      customer_name: String(body.name || '').trim().slice(0, 120),
      customer_phone: String(body.phone || '').trim().slice(0, 40) || null,
      origin_key: String(body.origin || '').trim().slice(0, 40),
      dest_key: String(body.destination || '').trim().slice(0, 80),
      transport_mode: String(body.mode || '').trim().slice(0, 30),
      weight_kg: body.weight_kg ? Number(body.weight_kg) : null,
      volume_cbm: body.volume_cbm ? Number(body.volume_cbm) : null,
      items_count: body.items_count ? Number(body.items_count) : null,
      notes: String(body.message || '').trim().slice(0, 2000) || null,
      status: 'new',
      currency: 'USD'
    };
    if (!clean.customer_name || !clean.origin_key || !clean.dest_key || !clean.transport_mode) {
      return Response.json({ error: 'Required fields are missing' }, { status: 400 });
    }
    const response = await fetch(`${SUPABASE_URL}/rest/v1/quote_requests`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(clean),
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    if (!response.ok) {
      return Response.json({ error: 'Production quote service rejected the request' }, { status: 502 });
    }
    return Response.json({ ok: true, status: 'received' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Quote service unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
