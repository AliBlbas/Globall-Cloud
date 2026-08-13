/*
 * Globall Cloud — HTML delivery middleware
 * Injects production runtime, premium polish, browser compatibility,
 * canonical logo rendering, admin recovery and Super Admin assets.
 */

const HTML_ACCEPT = 'text/html';

export async function onRequest(context) {
  const accept = context.request.headers.get('accept') || '';
  if (!accept.toLowerCase().includes(HTML_ACCEPT)) return context.next();

  const requestUrl = new URL(context.request.url);
  const path = requestUrl.pathname;
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes(HTML_ACCEPT)) return response;

  const rewriter = new HTMLRewriter()
    .on('head', {
      element(element) {
        element.append('<meta name="color-scheme" content="dark light">', { html: true });
        element.append('<link rel="preload" as="image" href="/logo-icon-original.png" fetchpriority="high">', { html: true });
        element.append('<link rel="stylesheet" href="/browser-compat.css?v=20260813-2" data-gc-browser-compat="1">', { html: true });
        element.append('<link rel="stylesheet" href="/logo-fix.css?v=20260813-2" data-gc-logo-fix="1">', { html: true });
        element.append('<link rel="stylesheet" href="/site-polish.css?v=20260813-2" data-gc-premium-polish="1">', { html: true });
        element.append('<script src="/runtime-guard.js?v=20260813-4" defer data-gc-runtime-guard="1"></script>', { html: true });
        if (path === '/superadmin.html') {
          element.append('<link rel="stylesheet" href="/superadmin.css?v=20260813-2" data-gc-superadmin-css="1">', { html: true });
        }
        element.append('<link rel="stylesheet" href="/admin-console-enhanced.css?v=20260812" data-gc-admin-polish="1">', { html: true });
        element.append('<script src="/admin-console-enhanced.js?v=20260812" defer data-gc-admin-recovery="1"></script>', { html: true });
      },
    })
    .on('body', {
      element(element) {
        if (path === '/superadmin.html') {
          element.append('<script src="/superadmin.js?v=20260813-2" defer data-gc-superadmin-js="1"></script>', { html: true });
        }
        if (path === '/staff-os.html') {
          element.append('<div class="gc-superadmin-entry" style="position:fixed;inset-block-end:18px;inset-inline-start:18px;z-index:9999"><a href="./superadmin.html" style="display:inline-flex;align-items:center;gap:8px;padding:11px 14px;border-radius:999px;background:linear-gradient(135deg,#67edf5,#12d5e7);color:#03151b;font:800 11px system-ui,sans-serif;box-shadow:0 12px 35px rgba(18,213,231,.22);text-decoration:none">GC · Super Admin</a></div>', { html: true });
        }
      },
    });

  return rewriter.transform(response);
}
