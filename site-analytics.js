/* Globall Cloud — analytics-ready event bridge, 2026-08-24
 * This file does not send data by itself. It forwards named UI events to
 * dataLayer, an already-installed gtag function, and a local custom event.
 * A future analytics provider can consume the same event names without
 * changing the public conversion markup.
 */
(() => {
  'use strict';

  const track = (eventName, element) => {
    if (!eventName) return;
    const detail = {
      event: eventName,
      page_path: window.location.pathname,
      link_url: element?.href || undefined,
      language: document.documentElement.lang || undefined
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(detail);

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        page_path: detail.page_path,
        link_url: detail.link_url,
        language: detail.language
      });
    }

    window.dispatchEvent(new CustomEvent('gc:analytics', { detail }));
  };

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('[data-gc-event]')
      : null;
    if (target) track(target.getAttribute('data-gc-event'), target);
  }, { passive: true });

  window.gcAnalytics = Object.freeze({ track });
})();
