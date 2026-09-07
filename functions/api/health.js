/* Globall Cloud — production edge health
 * GET /api/health
 * Reports the Cloudflare edge and the configured Supabase upstream without
 * exposing credentials or internal database details.
 */

const DEFAULT_SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co'
const VERSION = '2026.09.08'

const headers = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), geolocation=(), microphone=(), payment=()',
  'cross-origin-opener-policy': 'same-origin',
}

export async function onRequestGet({ request, env }) {
  const startedAt = Date.now()
  const supabaseUrl = String(env?.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '')
  let supabase = { status: 'not_checked' }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)
    const response = await fetch(`${supabaseUrl}/functions/v1/system-health`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    supabase = {
      status: response.ok ? 'ok' : 'degraded',
      http_status: response.status,
    }
  } catch (error) {
    supabase = {
      status: 'degraded',
      error: error instanceof Error ? error.name : 'upstream_error',
    }
  }

  const healthy = supabase.status === 'ok'
  return new Response(JSON.stringify({
    ok: healthy,
    service: 'globall-cloud',
    version: VERSION,
    edge: 'ok',
    supabase,
    response_ms: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  }), {
    status: healthy ? 200 : 503,
    headers,
  })
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...headers, allow: 'GET' },
    })
  }
  return onRequestGet(context)
}
