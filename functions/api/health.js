export async function onRequestGet(context) {
  const started = performance.now();
  const requestId = context.request.headers.get('x-request-id') || context.request.headers.get('cf-ray') || crypto.randomUUID();
  const body = {
    ok: true,
    service: 'globall-cloud',
    edge: 'ok',
    commit: context.env?.CF_PAGES_COMMIT_SHA || null,
    branch: context.env?.CF_PAGES_BRANCH || 'main',
    request_id: requestId,
    timestamp: new Date().toISOString(),
    latency_ms: Math.round(performance.now() - started),
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store, max-age=0, must-revalidate',
      'x-request-id': requestId,
      'x-content-type-options': 'nosniff',
    },
  });
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
