/*
 * Globall Cloud — HTML delivery middleware
 * Injects the production runtime guard, premium polish, admin recovery,
 * public tracking bridge, public-config compatibility bridge, hardened
 * public contact message bridge, and safe performance layer.
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
          '<link rel="preconnect" href="https://fonts.googleapis.com">',
          { html: true },
        );
        element.append(
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
          { html: true },
        );
        element.append(
          '<link rel="stylesheet" href="/site-polish.css?v=20260812" data-gc-premium-polish="1">',
          { html: true },
        );
        element.append(
          '<link rel="stylesheet" href="/performance-polish.css?v=20260812" data-gc-performance="1">',
          { html: true },
        );
        element.append(
          '<script src="/runtime-guard.js?v=20260812" defer data-gc-runtime-guard="1"></script>',
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
        element.append(
          '<script src="/public-track-bridge.js?v=20260812" defer data-gc-public-track-bridge="1"></script>',
          { html: true },
        );
        element.append(
          '<script src="/public-config-bridge.js?v=20260812" defer data-gc-public-config="1"></script>',
          { html: true },
        );
        element.append(
          '<script src="/public-message-bridge.js?v=20260812" defer data-gc-public-message="1"></script>',
          { html: true },
        );
        element.append(
          '<script src="/performance-polish.js?v=20260812" defer data-gc-performance="1"></script>',
          { html: true },
        );
      },
    })
    .transform(response);
}
