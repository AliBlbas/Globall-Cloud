const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';

function headers() {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' };
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const id = (url.searchParams.get('id') || '').trim();
  if (!id || id.length > 80) return Response.json({ error: 'Invalid tracking number' }, { status: 400 });

  const upstream = `${SUPABASE_URL}/functions/v1/public-track?id=${encodeURIComponent(id)}`;
  try {
    const response = await fetch(upstream, { headers: headers(), cf: { cacheTtl: 0, cacheEverything: false } });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch {
    return Response.json({ error: 'Tracking service unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
