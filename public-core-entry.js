/* Globall Cloud — deterministic public-core loader */
(() => {
  'use strict';
  const CORE = '/gc-csp-scripts/index-inline-2.js?v=20260913-6';
  const MARK = 'data-gc-public-core-entry';

  const loadCore = () => {
    if (window.__gcPublicCoreEntryLoaded || window.route) {
      window.__gcPublicCoreEntryLoaded = true;
      return;
    }
    if (document.querySelector(`script[${MARK}]`)) return;
    const script = document.createElement('script');
    script.src = CORE;
    script.defer = true;
    script.setAttribute(MARK, '1');
    script.addEventListener('load', () => {
      window.__gcPublicCoreEntryLoaded = true;
      window.dispatchEvent(new CustomEvent('gc:public-core-ready'));
    }, { once: true });
    script.addEventListener('error', () => {
      window.dispatchEvent(new CustomEvent('gc:public-core-failed'));
    }, { once: true });
    document.head.appendChild(script);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCore, { once: true });
  } else {
    loadCore();
  }
})();
