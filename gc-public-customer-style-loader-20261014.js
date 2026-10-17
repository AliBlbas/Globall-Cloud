/* Globall Cloud public + customer style ordering guard · 2026-10-16
   Final presentation layer. The matching HTML also includes direct stylesheet links;
   this loader moves public-home overrides after legacy theme layers, watches for late
   stylesheet injection, and restores the public mobile dock if a runtime removes it.
   No routes, authentication, business data, or backend logic are changed. */
(() => {
  'use strict';

  const homeStyles = [
    '/gc-live-mobile-v3.css?v=20261017-2',
    '/gc-homepage-elite-20261014.css?v=4',
    '/gc-homepage-signature-20261016.css?v=10'
  ];
  const customerStyles = [
    '/gc-customer-workspace-elite-20261014.css?v=23',
    '/gc-customer-mobile-dock-20261016.css?v=5',
    '/gc-customer-experience-signature-20261017.css?v=2',
    '//gc-ui-integrity-mobile-20261017.css?v=6'
  ];

  const desiredStyles = () => {
    // The customer workspace is the single root app; legacy public sections map into customer views.
    // Check customer mode before #gcApp, which intentionally remains in the DOM.
    if (document.body && document.body.classList.contains('gc-customer-app')) return customerStyles;
    if (document.getElementById('gcApp') || document.querySelector('#gcApp.gc-app')) return homeStyles;
    return [];
  };

  // The unified customer shell owns the only mobile dock. Never recreate public navigation.
  function ensureHomeDock() { return; }

  function applyStyles() {
    if (!document.body) return;
    const paths = desiredStyles();
    if (!paths.length) return;
    if (paths === homeStyles || paths[0] === homeStyles[0]) ensureHomeDock();

    paths.forEach((href, index) => {
      const key = 'gc-public-customer-elite-' + index;
      const pathname = href.split('?')[0];
      let link = document.querySelector('link[data-gc-public-customer-elite="' + key + '"]');
      if (!link) {
        link = [...document.querySelectorAll('link[rel="stylesheet"]')]
          .find(node => {
            try { return new URL(node.href, location.href).pathname === pathname; }
            catch (_) { return false; }
          });
      }
      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
      }
      if (link.getAttribute('href') !== href) link.href = href;
      link.dataset.gcPublicCustomerElite = key;
      // Put active overrides after all legacy head styles.
      if (link.parentNode !== document.body || document.body.lastElementChild !== link) {
        link.remove();
        document.body.appendChild(link);
      }
    });
  }

  function watchLateThemeStyles() {
    if (!window.MutationObserver || !document.head) return;
    let scheduled = false;
    const observer = new MutationObserver((mutations) => {
      const stylesheetChanged = mutations.some((mutation) =>
        [...mutation.addedNodes, ...mutation.removedNodes].some((node) =>
          node.nodeType === 1 && (
            (typeof node.matches === 'function' && node.matches('link[rel="stylesheet"]')) ||
            (typeof node.querySelector === 'function' && node.querySelector('link[rel="stylesheet"]'))
          )
        )
      );
      if (!stylesheetChanged || scheduled) return;
      scheduled = true;
      window.setTimeout(() => {
        scheduled = false;
        applyStyles();
      }, 80);
    });
    observer.observe(document.head, { childList: true });
  }

  function schedule() {
    applyStyles();
    watchLateThemeStyles();
    window.setTimeout(applyStyles, 180);
    window.setTimeout(applyStyles, 900);
    // The legacy renderer mounts one more theme layer at about 1.2 seconds.
    window.setTimeout(applyStyles, 1550);
    window.setTimeout(applyStyles, 2300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(schedule, 60), { once: true });
  } else {
    window.setTimeout(schedule, 60);
  }
  window.addEventListener('load', () => window.setTimeout(applyStyles, 100), { once: true });
  window.addEventListener('pageshow', () => window.setTimeout(applyStyles, 70));
})();
