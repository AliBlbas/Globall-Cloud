const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

function fail(message, status) {
  return Response.json({ error: message }, { status, headers: JSON_HEADERS });
}

function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function optionalNumber(value, max) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return n;
}

export async function onRequestPost({ request }) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) return fail('JSON request required', 415);

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 32768) return fail('Request too large', 413);

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Invalid request body', 400);

    const customerName = cleanText(body.name, 120);
    const customerPhone = cleanText(body.phone, 40);
    const originKey = cleanText(body.origin, 40);
    const destKey = cleanText(body.destination, 80);
    const transportMode = cleanText(body.mode, 30);
    const notes = cleanText(body.message, 2000);
    const weightKg = optionalNumber(body.weight_kg, 100000);
    const volumeCbm = optionalNumber(body.volume_cbm, 10000);
    const itemsCount = optionalNumber(body.items_count, 100000);

    if (!customerName || !originKey || !destKey || !transportMode) return fail('Required fields are missing', 400);
    if (customerName.length < 2 || originKey.length < 2 || destKey.length < 2 || transportMode.length < 2) return fail('Invalid field values', 400);
    if (customerPhone && !/^[0-9+()\-\s]{7,40}$/.test(customerPhone)) return fail('Invalid phone number', 400);
    if (body.weight_kg !== '' && body.weight_kg != null && weightKg === null) return fail('Invalid weight value', 400);
    if (body.volume_cbm !== '' && body.volume_cbm != null && volumeCbm === null) return fail('Invalid volume value', 400);
    if (body.items_count !== '' && body.items_count != null && itemsCount === null) return fail('Invalid item count', 400);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/public-quote`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Origin: 'https://globall-cloud.pages.dev'
      },
      body: JSON.stringify({
        name: customerName,
        email: cleanText(body.email, 160),
        phone: customerPhone,
        origin_key: originKey,
        dest_key: destKey,
        transport_mode: transportMode,
        weight_kg: weightKg,
        volume_cbm: volumeCbm,
        items_count: itemsCount,
        service_level: cleanText(body.service_level, 30) || 'standard',
        incoterm: cleanText(body.incoterm, 12) || 'EXW',
        notes
      }),
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) return fail(result.error || 'Production quote service rejected the request', response.status >= 400 && response.status < 500 ? response.status : 502);
    return Response.json({ ok: true, status: 'received', request: result.request || null }, { headers: JSON_HEADERS });
  } catch {
    return fail('Quote service unavailable', 503);
  }
}
