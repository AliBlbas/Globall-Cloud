export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const supabaseUrl = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const started = Date.now();

  let supabase = { ok: false, status: 0 };
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: { apikey: context.env?.SUPABASE_PUBLISHABLE_KEY || '' },
    });
    supabase = { ok: response.ok || response.status === 404, status: response.status };
  } catch {
    supabase = { ok: false, status: 0 };
  }

  const payload = {
    ok: true,
    service: 'globall-cloud',
    cloudflare: 'pages',
    supabase: {
      url: supabaseUrl,
      reachable: supabase.ok,
      status: supabase.status,
    },
    latency_ms: Date.now() - started,
    commit: context.env?.CF_PAGES_COMMIT_SHA || null,
    branch: context.env?.CF_PAGES_BRANCH || null,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: supabase.ok ? 200 : 503,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}
