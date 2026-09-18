const HTML_ACCEPT = 'text/html';
const VERSION = '20260918-1';
const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';

const ENTERPRISE_SHELL = `<link rel="stylesheet" href="/enterprise-shell-v2026.css?v=${VERSION}" data-gc-enterprise-shell="1">`;
const LEGACY_SUPABASE_NOTICE = 'Supabase هێشتا پەیوەست نەکراوە — URL و publishable key لە کۆدەکەدا زیادبکە (سەرەتای script tag).';
const CSP = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://rum-static.pingdom.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.supabase.co https://rum-ingest.pingdom.net https://*.sentry.io https://sentry.io; frame-src 'self' https://www.google.com; worker-src 'self' blob:";
const STAFF_V5 = /^\/(?:staff|staff-os)(?:\.html)?\/?$/i;
const OPERATIONAL_PAGE = /^\/(?:staff(?:-os)?|warehouse(?:-os)?|customer-portal|superadmin|super-admin-command-center|operations(?:-[a-z0-9-]+)?|accounts-console|management)(?:\.html)?\/?$/i;
const LEGACY_ADMIN_SURFACE = /^\/(?:management|accounts-console|operations-suite|operations-command-center|operations-control|operations-control-v2|staff-portal|warehouse-os|superadmin|super-admin-command-center)\.html$/i;

const addHeadAsset = (html, needle, fragment) =>
  html.includes(needle) ? html : html.replace(/<\/head>/i, `${fragment}</head>`);
const addBodyAsset = (html, needle, fragment) =>
  html.includes(needle) ? html : html.replace(/<\/body>/i, `${fragment}</body>`);

const applySecurityHeaders = (headers) => {
  headers.set('content-security-policy', CSP);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('x-frame-options', 'DENY');
  headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('permissions-policy', 'camera=(self), geolocation=(self), microphone=(), payment=()');
  headers.set('cross-origin-opener-policy', 'same-origin');
  headers.set('origin-agent-cluster', '?1');
  return headers;
};

const rewriteRootHtml = (html) => {
  let out = html;
  out = out.split(LEGACY_SUPABASE_NOTICE).join('');
  out = out.split('href="#admin"').join('href="/staff"');
  out = out.split('href="./staff-os.html"').join('href="/staff"');
  out = out.split(' data-gc-onclick="route(\'admin\')"').join('');
  out = out.split('/gc-csp-scripts/index-inline-1.js?v=20260821-1').join(`/gc-csp-scripts/index-inline-1.js?v=${VERSION}`);
  return out;
};

const processHtml = (html, path) => {
  let out = path === '/' || path === '/index.html' ? rewriteRootHtml(html) : html.split(LEGACY_SUPABASE_NOTICE).join('');

  const headAssets = [
    ['name="color-scheme"', '<meta name="color-scheme" content="dark light">'],
    ['href="/enterprise-shell-v2026.css', ENTERPRISE_SHELL],
    ['href="/browser-compat.css', `<link rel="stylesheet" href="/browser-compat.css?v=${VERSION}" data-gc-browser-compat="1">`],
    ['href="/safari-compat-elite.css', `<link rel="stylesheet" href="/safari-compat-elite.css?v=${VERSION}" data-gc-safari-elite="1">`],
    ['href="/logo-fix.css', `<link rel="stylesheet" href="/logo-fix.css?v=${VERSION}" data-gc-logo-fix="1">`],
    ['href="/site-polish.css', `<link rel="stylesheet" href="/site-polish.css?v=${VERSION}" data-gc-premium-polish="1">`],
    ['href="/production-mobile-hotfix.css', `<link rel="stylesheet" href="/production-mobile-hotfix.css?v=${VERSION}" data-gc-production-mobile-hotfix="1">`],
    ['href="/production-mobile-ux-v2026.css', `<link rel="stylesheet" href="/production-mobile-ux-v2026.css?v=${VERSION}" data-gc-production-mobile-ux="1">`],
    ['href="/gc-public-premium-ux-2026.css', `<link rel="stylesheet" href="/gc-public-premium-ux-2026.css?v=${VERSION}" data-gc-public-premium-ux="1">`],
    ['href="/gc-home-final-2026.css', `<link rel="stylesheet" href="/gc-home-final-2026.css?v=${VERSION}" data-gc-home-final="1">`],
    ['src="/production-bridge.js', `<script src="/production-bridge.js?v=${VERSION}" defer data-gc-production-bridge="1"></script>`],
    ['src="/public-customer-auth-fix.js', `<script src="/public-customer-auth-fix.js?v=${VERSION}" defer data-gc-customer-auth-fix="1"></script>`],
    ['src="/production-brand-repair.js', `<script src="/production-brand-repair.js?v=${VERSION}" defer data-gc-production-brand-repair="1"></script>`],
    ['src="/gc-final-experience-2026.js', `<script src="/gc-final-experience-2026.js?v=${VERSION}" defer data-gc-final-experience="1"></script>`],
  ];
  for (const [needle, fragment] of headAssets) out = addHeadAsset(out, needle, fragment);

  if (STAFF_V5.test(path)) {
    out = addHeadAsset(out, 'src="/staff-os-compat.js', `<script src="/staff-os-compat.js?v=${VERSION}" defer data-gc-staff-compat="1"></script>`);
    out = addHeadAsset(out, 'href="/staff-login-polish.css', `<link rel="stylesheet" href="/staff-login-polish.css?v=${VERSION}" data-gc-staff-login-polish="1">`);
    out = addHeadAsset(out, 'href="/staff-command-center-pro.css', `<link rel="stylesheet" href="/staff-command-center-pro.css?v=${VERSION}" data-gc-staff-command-center-css="1">`);
    out = addHeadAsset(out, 'href="/staff-directory-360.css', `<link rel="stylesheet" href="/staff-directory-360.css?v=${VERSION}" data-gc-staff-directory-360-css="1">`);
    out = addBodyAsset(out, 'src="/staff-command-center-pro.js', `<script src="/staff-command-center-pro.js?v=${VERSION}" defer data-gc-staff-command-center="1"></script>`);
    out = addBodyAsset(out, 'src="/staff-directory-360.js', `<script src="/staff-directory-360.js?v=${VERSION}" defer data-gc-staff-directory-360="1"></script>`);
    out = addBodyAsset(out, 'src="/staff-profit-analytics.js', `<script src="/staff-profit-analytics.js?v=${VERSION}" defer data-gc-staff-profit-analytics="1"></script>`);
    out = addBodyAsset(out, 'src="/gc-csp-scripts/staff-admin-panel.js', `<script src="/gc-csp-scripts/staff-admin-panel.js?v=${VERSION}" defer data-gc-staff-admin-panel="1"></script>`);
  }

  if (OPERATIONAL_PAGE.test(path)) {
    out = addHeadAsset(out, 'src="/runtime-guard.js', `<script src="/runtime-guard.js?v=${VERSION}" defer data-gc-runtime-guard="1"></script>`);
  }

  if (path === '/' || path === '/index.html') {
    out = addHeadAsset(out, 'src="/staff-auth-runtime-fix.js', `<script src="/staff-auth-runtime-fix.js?v=${VERSION}" defer data-gc-staff-auth-runtime="1"></script>`);
    out = addBodyAsset(out, 'src="/gc-csp-scripts/logistics-pricing-ui.js', `<script src="/gc-csp-scripts/logistics-pricing-ui.js?v=${VERSION}" defer data-gc-logistics-pricing-ui="1"></script>`);
    out = addBodyAsset(out, 'src="/site-navigation-20260909.js', `<script src="/site-navigation-20260909.js?v=${VERSION}" defer data-gc-site-navigation="1"></script>`);
    out = addBodyAsset(out, 'src="/public-core-recovery.js', `<script src="/public-core-recovery.js?v=${VERSION}" defer data-gc-public-core-recovery="1"></script>`);
  }

  if (LEGACY_ADMIN_SURFACE.test(path)) {
    out = addHeadAsset(out, 'href="/admin-console-enhanced.css', `<link rel="stylesheet" href="/admin-console-enhanced.css?v=${VERSION}" data-gc-admin-polish="1">`);
    out = addHeadAsset(out, 'src="/admin-console-enhanced.js', `<script src="/admin-console-enhanced.js?v=${VERSION}" defer data-gc-admin-recovery="1"></script>`);
  }

  if (/^\/warehouse-os(?:\.html)?\/?$/i.test(path)) {
    out = addHeadAsset(out, 'href="/warehouse-receipt-proof.css', `<link rel="stylesheet" href="/warehouse-receipt-proof.css?v=${VERSION}" data-gc-warehouse-receipt-proof="1">`);
    out = addBodyAsset(out, 'src="/gc-csp-scripts/warehouse-receipt-proof-enhancement.js', `<script src="/gc-csp-scripts/warehouse-receipt-proof-enhancement.js?v=${VERSION}" defer data-gc-warehouse-receipt-proof="1"></script>`);
    out = addBodyAsset(out, 'src="/gc-csp-scripts/warehouse-receiving-chain-bridge.js', `<script src="/gc-csp-scripts/warehouse-receiving-chain-bridge.js?v=${VERSION}" defer data-gc-warehouse-receiving-chain="1"></script>`);
  }

  if (/^\/shop\/shein\.html$/i.test(path)) {
    out = addBodyAsset(out, 'src="/gc-csp-scripts/shein-customer-identity.js', `<script src="/gc-csp-scripts/shein-customer-identity.js?v=${VERSION}" defer data-gc-shein-identity="1"></script>`);
  }

  if (/^\/customer-portal(?:\.html)?\/?$/i.test(path)) {
    out = addHeadAsset(out, 'href="/customer-receipt-evidence.css', `<link rel="stylesheet" href="/customer-receipt-evidence.css?v=${VERSION}" data-gc-customer-receipt-evidence="1">`);
    out = addBodyAsset(out, 'src="/gc-csp-scripts/customer-receipt-evidence-enhancement.js', `<script src="/gc-csp-scripts/customer-receipt-evidence-enhancement.js?v=${VERSION}" defer data-gc-customer-receipt-evidence="1"></script>`);
    out = addBodyAsset(out, 'src="/customer-debt-chat.js', `<script src="/customer-debt-chat.js?v=${VERSION}" defer data-gc-customer-debt-chat="1"></script>`);
  }

  if (path === '/super-admin-command-center.html') {
    out = addHeadAsset(out, 'src="/super-admin-live-control-v2.js', `<script src="/super-admin-live-control-v2.js?v=${VERSION}" defer data-gc-superadmin-live-control="1"></script>`);
  }

  if (path === '/superadmin.html') {
    out = addHeadAsset(out, 'href="/superadmin-server.css', `<link rel="stylesheet" href="/superadmin-server.css?v=${VERSION}" data-gc-superadmin-server-css="1">`);
    out = addBodyAsset(out, 'src="/superadmin-enhancements.js', `<script src="/superadmin-enhancements.js?v=${VERSION}" defer data-gc-superadmin-enhancements="1"></script>`);
    out = addBodyAsset(out, 'src="/superadmin-server.js', `<script src="/superadmin-server.js?v=${VERSION}" defer data-gc-superadmin-server="1"></script>`);
  }

  if (path === '/operations-control-v2.html') {
    out = addBodyAsset(out, 'src="/operations-events.js', `<script src="/operations-events.js?v=${VERSION}" defer data-gc-operations-events="1"></script>`);
  }

  if (path === '/operations-command-center.html') {
    out = addBodyAsset(out, 'src="/operations-exception-engine.js', `<script src="/operations-exception-engine.js?v=${VERSION}" defer data-gc-exception-engine="1"></script>`);
  }

  return out;
};

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });

const healthResponse = async (env) => {
  const started = Date.now();
  let supabase = { ok: false, status: 0 };
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });
    supabase = { ok: response.ok, status: response.status };
  } catch {
    supabase = { ok: false, status: 0 };
  }
  return jsonResponse({
    ok: supabase.ok,
    service: 'globall-cloud',
    cloudflare: 'pages',
    supabase: { url: SUPABASE_URL, reachable: supabase.ok, status: supabase.status },
    latency_ms: Date.now() - started,
    commit: env?.CF_PAGES_COMMIT_SHA || null,
    branch: env?.CF_PAGES_BRANCH || null,
    timestamp: new Date().toISOString(),
  }, supabase.ok ? 200 : 503);
};

const releaseResponse = (env) => jsonResponse({
  service: 'globall-cloud',
  environment: env?.CF_PAGES_BRANCH === 'main' ? 'production' : (env?.CF_PAGES_BRANCH || 'unknown'),
  branch: env?.CF_PAGES_BRANCH || null,
  commit: env?.CF_PAGES_COMMIT_SHA || null,
  pages_url: env?.CF_PAGES_URL || null,
  generated_at: new Date().toISOString(),
});

const apiHealthResponse = async (env) => {
  const startedAt = Date.now();
  const supabaseUrl = String(env?.SUPABASE_URL || SUPABASE_URL).replace(/\/$/, '');
  let supabase = { status: 'not_checked' };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/system-health`, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });
      supabase = { status: response.ok ? 'ok' : 'degraded', http_status: response.status };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    supabase = { status: 'degraded', error: error instanceof Error ? error.name : 'upstream_error' };
  }
  const healthy = supabase.status === 'ok';
  return new Response(JSON.stringify({
    ok: healthy,
    service: 'globall-cloud',
    version: '2026.09.15',
    edge: 'ok',
    supabase,
    response_ms: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  }), {
    status: healthy ? 200 : 503,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'x-frame-options': 'DENY',
      'permissions-policy': 'camera=(), geolocation=(), microphone=(), payment=()',
      'cross-origin-opener-policy': 'same-origin',
    },
  });
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (/^\/health\/?$/i.test(pathname)) {
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
      return healthResponse(env);
    }

    if (/^\/release\.json\/?$/i.test(pathname)) {
      return releaseResponse(env);
    }

    if (/^\/api\/health\/?$/i.test(pathname)) {
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
      return apiHealthResponse(env);
    }

    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes(HTML_ACCEPT)) return response;

    const html = processHtml(await response.text(), pathname);
    const headers = applySecurityHeaders(new Headers(response.headers));
    headers.delete('content-encoding');
    headers.delete('content-length');
    headers.delete('etag');
    headers.set('content-type', 'text/html; charset=UTF-8');

    if (STAFF_V5.test(pathname)) {
      headers.set('cache-control', 'no-store, max-age=0, must-revalidate');
    }

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
