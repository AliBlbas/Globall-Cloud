const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';

export async function onRequestGet() {
  const started = Date.now();
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/shipments?select=id&limit=1`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    return Response.json({
      ok: response.ok,
      service: 'Global Cloud API',
      database: response.ok ? 'online' : 'degraded',
      latency_ms: Date.now() - started,
      timestamp: new Date().toISOString()
    }, { status: response.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ ok: false, service: 'Global Cloud API', database: 'offline', error: 'Database connection failed', latency_ms: Date.now() - started }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
