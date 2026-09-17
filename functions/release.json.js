export async function onRequestGet(context) {
  const payload = {
    service: 'globall-cloud',
    environment: context.env?.CF_PAGES_BRANCH === 'main' ? 'production' : (context.env?.CF_PAGES_BRANCH || 'unknown'),
    branch: context.env?.CF_PAGES_BRANCH || null,
    commit: context.env?.CF_PAGES_COMMIT_SHA || null,
    pages_url: context.env?.CF_PAGES_URL || null,
    generated_at: new Date().toISOString(),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}
