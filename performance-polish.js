/* Globall Cloud — performance-safe client polish
 * Additive only: optimizes non-critical media/layout work without touching
 * business logic, authentication, or data flows.
 */
(() => {
  'use strict';

  const markLazy = () => {
    document.querySelectorAll('img:not([loading]), iframe:not([loading])').forEach((el) => {
      const rect = el.getBoundingClientRect();
      const inInitialViewport = rect.top < window.innerHeight * 1.25;
      if (!inInitialViewport) el.setAttribute('loading', 'lazy');
    });

    document.querySelectorAll('img:not([decoding])').forEach((el) => {
      el.setAttribute('decoding', 'async');
    });
  };

  const prepareIdleWork = () => {
    const run = () => {
      document.documentElement.dataset.gcPerf = 'ready';
      markLazy();
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: 1200 });
    } else {
      window.setTimeout(run, 250);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prepareIdleWork, { once: true });
  } else {
    prepareIdleWork();
  }
})();
