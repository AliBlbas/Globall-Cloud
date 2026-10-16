/* Globall Cloud public + customer style ordering guard · 2026-10-16
   Final presentation layer. The matching HTML also includes direct stylesheet links;
   this loader moves public-home overrides after legacy theme layers, watches for late
   stylesheet injection, and restores the public mobile dock if a runtime removes it.
   No routes, authentication, business data, or backend logic are changed. */
(() => {
  'use strict';

  const homeStyles = [
    '/gc-live-mobile-v3.css?v=20261014-4',
    '/gc-homepage-elite-20261014.css?v=4',
    '/gc-homepage-signature-20261016.css?v=7'
  ];
  const customerStyles = [
    '/gc-customer-workspace-elite-20261014.css?v=12',
    '/gc-customer-mobile-dock-20261016.css?v=1'
  ];

  const desiredStyles = () => {
    // The homepage now owns both public marketing and authenticated customer views.
    // Check customer mode before #gcApp, which intentionally remains in the DOM.
    if (document.body && document.body.classList.contains('gc-customer-app')) return customerStyles;
    if (document.getElementById('gcApp') || document.querySelector('#gcApp.gc-app')) return homeStyles;
    return [];
  };

  function ensureHomeDock() {
    if (document.body?.classList.contains('gc-customer-app')) return;
    const app = document.getElementById('gcApp');
    let dock = document.querySelector('.gc-mobile-dock-v3');
    if (!dock) {
      if (!app) return;
      dock = document.createElement('nav');
      dock.className = 'gc-mobile-dock-v3';
      dock.setAttribute('aria-label', 'ناڤیگەیشنی مۆبایلی Globall Cloud');
      dock.innerHTML = [
        '<a href="/" data-dock="home" aria-label="سەرەکی" class="active" aria-current="page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7"></path><path d="M5 9v11h14V9M9 20v-6h6v6"></path></svg><span>سەرەکی</span></a>',
        '<a href="/#services" data-dock="services" aria-label="خزمەتگوزاری"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4-8 4-8-4 8-4Z"></path><path d="M4 7v10l8 4 8-4V7M12 11v10"></path></svg><span>خزمەتگوزاری</span></a>',
        '<a href="/#request" data-dock="quote" class="primary" aria-label="داواکردنی نرخ"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H5V3h2Z"></path><path d="M15 3v5h4M8 12h8M8 16h5"></path><path d="M12 10v4M10 12h4"></path></svg><span>داواکردنی نرخ</span></a>',
        '<a href="/track" data-dock="track" aria-label="شوێنکەوتن"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="2"></circle><circle cx="18" cy="6" r="2"></circle><path d="M8 18h5c3 0 5-2 5-5v-3M18 8V6h-4c-3 0-5 2-5 5v3"></path></svg><span>شوێنکەوتن</span></a>',
        '<a href="/dashboard#auth" data-dock="account" aria-label="هەژمار"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M4.5 20c.8-3.6 3.3-5.5 7.5-5.5s6.7 1.9 7.5 5.5"></path></svg><span>هەژمار</span></a>'      ].join('');
    }
    // Keep the fixed dock outside any transformed/overflow-clipped application shell.
    if (document.body && app && app.contains(dock)) document.body.appendChild(dock);
  }
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
