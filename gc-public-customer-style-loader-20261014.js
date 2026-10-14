/* Globall Cloud public + customer premium style loader · 2026-10-14
   This final loader runs after the existing deferred scripts and attaches the final
   presentation layer to the end of body so older/dynamically-inserted head styles
   cannot silently override the responsive page styling. No business logic is changed. */
(() => {
  'use strict';

  const homeStyles = [
    '/gc-live-mobile-v3.css?v=20261014-1',
    '/gc-homepage-elite-20261014.css?v=1'
  ];
  const customerStyles = [
    '/gc-customer-workspace-elite-20261014.css?v=1'
  ];

  const desiredStyles = () => {
    if (document.getElementById('gcApp') || document.querySelector('#gcApp.gc-app')) return homeStyles;
    if (document.body && document.body.classList.contains('gc-customer-app')) return customerStyles;
    return [];
  };

  function applyStyles() {
    if (!document.body) return;
    const paths = desiredStyles();
    if (!paths.length) return;

    paths.forEach((href, index) => {
      const key = 'gc-public-customer-elite-' + index;
      let link = document.querySelector('link[data-gc-public-customer-elite="' + key + '"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.gcPublicCustomerElite = key;
      } else if (link.getAttribute('href') !== href) {
        link.href = href;
      }
      // A body-end link sorts after legacy styles injected into <head>.
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
