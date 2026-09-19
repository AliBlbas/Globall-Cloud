/* Globall Cloud — public UI recovery layer.
 * Runs independently of the legacy pre-paint bundle so one broken/old
 * bootstrap asset cannot leave the homepage as an empty shell.
 */
(() => {
  'use strict';

  const hydrate = () => {
    try {
      const renderers = [
        'renderHomeServices',
        'renderBusinessHub',
        'renderDashboardPreview',
        'renderCorridorStrip',
        'renderWarehouseCards',
        'renderOperationsHub',
        'renderHow',
        'renderWhy'
      ];

      for (const name of renderers) {
        try {
          const fn = window[name];
          if (typeof fn === 'function') fn();
        } catch (_) {}
      }

      try {
        if (typeof window.applyI18n === 'function') window.applyI18n();
      } catch (_) {}

      try {
        if (typeof window.renderPage === 'function') window.renderPage();
      } catch (_) {}

      document.documentElement.dataset.gcUiRecovery = 'active';
    } catch (_) {}
  };

  const loadNavigation = () => {
    if (document.querySelector('script[data-gc-recovery-navigation]')) return;
    const script = document.createElement('script');
    script.src = '/site-navigation-20260909.js?v=20260912-2';
    script.defer = true;
    script.dataset.gcRecoveryNavigation = '1';
    document.head.appendChild(script);
  };

  const boot = () => {
    hydrate();
    loadNavigation();
    [100, 300, 700, 1500, 3000, 5000].forEach((delay) => {
      window.setTimeout(hydrate, delay);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
