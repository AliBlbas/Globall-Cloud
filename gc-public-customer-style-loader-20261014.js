/* Globall Cloud public + customer premium style loader · 2026-10-14
   Final presentation layer. The matching HTML also includes direct stylesheet links;
   this loader moves those links to the document end after legacy theme loaders and
   restores the public mobile dock if a late runtime unexpectedly removes it.
   No routes, authentication, business data, or backend logic are changed. */
(() => {
  'use strict';

  const homeStyles = [
    '/gc-live-mobile-v3.css?v=20261014-4',
    '/gc-homepage-elite-20261014.css?v=4'
  ];
  const customerStyles = [
    '/gc-customer-workspace-elite-20261014.css?v=4'
  ];

  const desiredStyles = () => {
    if (document.getElementById('gcApp') || document.querySelector('#gcApp.gc-app')) return homeStyles;
    if (document.body && document.body.classList.contains('gc-customer-app')) return customerStyles;
    return [];
  };

  function ensureHomeDock() {
    const app = document.getElementById('gcApp');
    let dock = document.querySelector('.gc-mobile-dock-v3');
    if (!dock) {
      if (!app) return;
      dock = document.createElement('nav');
      dock.className = 'gc-mobile-dock-v3';
      dock.setAttribute('aria-label', 'ناڤیگەیشنی مۆبایلی Globall Cloud');
      dock.innerHTML = [
        '<a href="/" data-dock="home" class="active" aria-current="page" aria-label="سەرەکی"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-7 8 7v10H4z"></path><path d="M9 20v-6h6v6"></path></svg><span>سەرەکی</span></a>',
        '<a href="/#services" data-dock="services" aria-label="خزمەتگوزاری"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4-8 4-8-4 8-4Z"></path><path d="M4 7v9l8 4 8-4V7M12 11v9"></path></svg><span>خزمەت</span></a>',
        '<a href="/#request" data-dock="quote" class="primary" aria-label="داواکردنی نرخ"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>نرخ</span></a>',
        '<a href="/#contact" data-dock="contact" aria-label="پەیوەندی"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v11H8l-3 3z"></path><path d="M8 9h8M8 12h5"></path></svg><span>پەیوەندی</span></a>',
        '<a href="/dashboard#profile" data-dock="settings" aria-label="ڕێکخستن"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6v-2.6h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.6v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.6h-.2a1.7 1.7 0 0 0-1.6 1Z"></path></svg><span>ڕێکخستن</span></a>'
      ].join('');
    }
    // Fixed navigation should be a direct child of body, not inside a transformed app shell.
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

  function schedule() {
    applyStyles();
    window.setTimeout(applyStyles, 180);
    window.setTimeout(applyStyles, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(schedule, 60), { once: true });
  } else {
    window.setTimeout(schedule, 60);
  }
  window.addEventListener('load', () => window.setTimeout(applyStyles, 100), { once: true });
  window.addEventListener('pageshow', () => window.setTimeout(applyStyles, 70));
})();
