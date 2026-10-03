/* Globall Cloud Staff OS — final V5 visibility guard */
(() => {
  'use strict';
  if (!/^\/staff(?:-os(?:-v5)?|)(?:\.html)?\/?$/i.test(location.pathname)) return;

  const restoreAuthenticatedSurface = () => {
    const app = document.getElementById('app');
    if (!app || !app.querySelector('.gc-shell')) return;
    // A legacy compatibility bridge must never hide an already-rendered V5
    // console. Keep the login surface untouched when V5 is showing the gate.
    app.classList.remove('hidden');
    app.removeAttribute('aria-hidden');
  };

  const boot = () => {
    restoreAuthenticatedSurface();
    const observer = new MutationObserver(restoreAuthenticatedSurface);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'aria-hidden'],
    });
    window.setTimeout(() => observer.disconnect(), 30000);
    window.setTimeout(restoreAuthenticatedSurface, 1000);
    window.setTimeout(restoreAuthenticatedSurface, 4000);
    window.setTimeout(restoreAuthenticatedSurface, 10000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
