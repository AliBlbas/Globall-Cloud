const ALLOWED_ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const headers = (req: Request, requestId: string) => {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-ID': requestId,
    ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'content-type, x-request-id, apikey, authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Vary': 'Origin',
  }
}
const json = (req: Request, requestId: string, body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(req, requestId) })

Deno.serve(async (req) => {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(req, requestId) })
  if (req.method !== 'GET') return json(req, requestId, { error: 'Method not allowed' }, 405)
  const started = performance.now()
  try {
    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
    if (!url || !serviceKey) return json(req, requestId, { ok: false, status: 'degraded', service: 'globall-cloud', request_id: requestId }, 503)
    const response = await fetch(`${url}/rest/v1/shipments?select=id&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' },
    })
    const database = response.ok
    const checks = { database, edge: true }
    const ok = database
    return json(req, requestId, { ok, status: ok ? 'ready' : 'degraded', service: 'globall-cloud', checks, request_id: requestId, timestamp: new Date().toISOString(), total_ms: Math.round(performance.now() - started) }, ok ? 200 : 503)
  } catch (error) {
    return json(req, requestId, { ok: false, status: 'degraded', service: 'globall-cloud', checks: { database: false, edge: true }, error: error instanceof Error ? error.message : 'Health probe failed', request_id: requestId, timestamp: new Date().toISOString(), total_ms: Math.round(performance.now() - started) }, 503)
  }
})
