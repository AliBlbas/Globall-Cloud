const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json'
  };
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-Content-Type-Options': 'nosniff'
};

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const id = (url.searchParams.get('id') || '').trim();

  if (!/^[A-Za-z0-9_-]{3,80}$/.test(id)) {
    return Response.json({ error: 'Invalid tracking number' }, { status: 400, headers: jsonHeaders });
  }

  const upstream = `${SUPABASE_URL}/functions/v1/public-track?id=${encodeURIComponent(id)}`;
  try {
    const response = await fetch(upstream, {
      headers: headers(),
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    if (!response.ok) {
      return Response.json(
        { error: response.status === 404 ? 'Shipment not found' : 'Tracking service unavailable' },
        { status: response.status === 404 ? 404 : 502, headers: jsonHeaders }
      );
    }

    const text = await response.text();
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch {
    return Response.json({ error: 'Tracking service unavailable' }, { status: 503, headers: jsonHeaders });
  }
}
