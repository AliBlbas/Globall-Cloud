/*
 * Globall Cloud — retired public customer registration endpoint.
 *
 * Customer accounts are provisioned or linked by authorized staff through
 * account-admin. The public self-registration flow is intentionally disabled.
 * Keep this stub to return a clear response to stale clients and prevent the
 * retired service-role workflow from being invoked.
 */
const ALLOWED_ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
]);

const headers = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'https://globall-cloud.pages.dev';
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
};

const json = (req: Request, body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: headers(req) });

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: headers(req) });
  }

  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(req, { error: 'Origin not allowed' }, 403);
  }

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405);
  }

  return json(req, {
    error: 'Public customer registration is disabled. Contact Globall Cloud staff to create or securely link your account.',
    code: 'CUSTOMER_REGISTRATION_DISABLED',
  }, 410);
});
