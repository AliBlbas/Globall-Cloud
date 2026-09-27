const SUPABASE_PUBLIC_HEALTH_URL = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/public-health';

const json = (body, status, requestId, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=UTF-8',
    'cache-control': 'no-store, max-age=0, must-revalidate',
    'x-content-type-options': 'nosniff',
    'x-request-id': requestId,
    ...extra,
  },
});

async function fetchJson(url, requestId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json', 'x-request-id': requestId },
      cache: 'no-store',
      signal: controller.signal,
    });
    const raw = await response.text();
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
    return {
      ok: response.ok && body?.ok !== false && body?.status !== 'down' && body?.status !== 'degraded',
      status: response.status,
      latency_ms: Math.round(performance.now() - started),
      body,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequestGet(context) {
  const requestId = context.request.headers.get('x-request-id') || context.request.headers.get('cf-ray') || crypto.randomUUID();
  const started = performance.now();

  const local = { ok: true, status: 200, latency_ms: 0, body: { ok: true, service: 'globall-cloud', edge: 'ok' } };
  let supabase;
  try {
    const url = context.env?.SUPABASE_PUBLIC_HEALTH_URL || context.env?.SUPABASE_SYSTEM_HEALTH_URL || SUPABASE_PUBLIC_HEALTH_URL;
    supabase = await fetchJson(url, requestId);
  } catch (error) {
    supabase = {
      ok: false,
      status: 503,
      latency_ms: Math.round(performance.now() - started),
      body: { status: 'unreachable', error: error?.name === 'AbortError' ? 'timeout' : 'dependency request failed' },
    };
  }

  const ok = local.ok && supabase.ok;
  return json({
    ok,
    service: 'globall-cloud',
    status: ok ? 'ready' : 'degraded',
    edge: { ok: true, status: 200, latency_ms: local.latency_ms },
    supabase: {
      ok: supabase.ok,
      status: supabase.status,
      latency_ms: supabase.latency_ms,
      dependency_status: supabase.body?.status || null,
    },
    commit: context.env?.CF_PAGES_COMMIT_SHA || null,
    branch: context.env?.CF_PAGES_BRANCH || 'main',
    request_id: requestId,
    timestamp: new Date().toISOString(),
    total_ms: Math.round(performance.now() - started),
  }, ok ? 200 : 503);
}

export async function onRequestOptions(context) {
  const requestId = context.request.headers.get('x-request-id') || context.request.headers.get('cf-ray') || crypto.randomUUID();
  return new Response(null, {
    status: 204,
    headers: {
      'cache-control': 'no-store',
      'access-control-allow-origin': context.request.headers.get('origin') || '*',
      'access-control-allow-methods': 'GET,OPTIONS',
      'access-control-allow-headers': 'content-type, x-request-id',
      'x-request-id': requestId,
    },
  });
}
