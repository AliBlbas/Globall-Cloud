/*
 * Globall Cloud — HTML delivery middleware
 * Injects the production runtime guard, premium polish, browser compatibility,
 * canonical logo rendering, and resilient admin-workspace recovery into HTML navigations.
 * Non-document requests are passed through untouched.
 */

const HTML_ACCEPT = 'text/html';

export async function onRequest(context) {
  const accept = context.request.headers.get('accept') || '';
  if (!accept.toLowerCase().includes(HTML_ACCEPT)) {
    return context.next();
  }

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes(HTML_ACCEPT)) {
    return response;
  }

  return new HTMLRewriter()
    .on('head', {
      element(element) {
        element.append(
          '<meta name="color-scheme" content="dark light">',
          { html: true },
        );
        element.append(
          '<link rel="preload" as="image" href="/logo-icon-original.png" fetchpriority="high">',
          { html: true },
        );
        element.append(
          '<link rel="stylesheet" href="/browser-compat.css?v=20260813-1" data-gc-browser-compat="1">',
          { html: true },
        );
        element.append(
          '<link rel="stylesheet" href="/logo-fix.css?v=20260813-1" data-gc-logo-fix="1">',
          { html: true },
        );
        element.append(
          '<link rel="stylesheet" href="/site-polish.css?v=20260813-1" data-gc-premium-polish="1">',
          { html: true },
        );
        element.append(
          '<script src="/runtime-guard.js?v=20260813-4" defer data-gc-runtime-guard="1"></script>',
          { html: true },
        );
        element.append(
          '<link rel="stylesheet" href="/admin-console-enhanced.css?v=20260812" data-gc-admin-polish="1">',
          { html: true },
        );
        element.append(
          '<script src="/admin-console-enhanced.js?v=20260812" defer data-gc-admin-recovery="1"></script>',
          { html: true },
        );
      },
    })
    .transform(response);
}
