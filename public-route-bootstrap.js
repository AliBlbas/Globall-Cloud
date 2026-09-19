(() => {
  'use strict';

  const RELEASE = '20260915-2';
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const pathRoutes = {
    '/quote': 'request',
    '/request': 'request',
    '/dashboard': 'portal',
    '/portal': 'portal',
    '/services': 'services',
    '/about': 'about',
    '/contact': 'contact'
  };
  const params = new URLSearchParams(window.location.search);
  const tracking = params.get('track') || params.get('id') || params.get('gc');
  const route = tracking ? 'track' : pathRoutes[path];

  if (route && !window.location.hash) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${route}`);
  }

  const addScript = (src, attribute) => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    if (attribute) script.setAttribute(attribute, '1');
    document.head.appendChild(script);
  };

  const addStylesheet = (href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.gcBootstrapAsset = '1';
    document.head.appendChild(link);
  };

  // Critical public/mobile presentation must not wait for the primary renderer.
  addStylesheet(`/site-polish.css?v=${RELEASE}`);
  addStylesheet(`/production-mobile-hotfix.css?v=${RELEASE}`);
  addStylesheet(`/production-mobile-ux-v2026.css?v=${RELEASE}`);
  addStylesheet(`/public-live-repair-20260914.css?v=${RELEASE}`);
  addStylesheet(`/site-navigation-20260909.css?v=${RELEASE}`);

  // Critical interaction repair runs independently of the main renderer.
  addScript(`/public-live-repair-20260914.js?v=${RELEASE}`, 'data-gc-public-live-repair');

  // Primary public runtime.
  addScript(`/public-core-entry.js?v=${RELEASE}`, 'data-gc-public-core-entry-loader');
  addScript(`/public-staff-guard-20260909.js?v=${RELEASE}`, 'data-gc-public-staff-guard');
  addScript(`/public-production-safety.js?v=${RELEASE}`, 'data-gc-public-production-safety');
  addScript(`/site-navigation-20260909.js?v=${RELEASE}`, 'data-gc-public-navigation');
  addScript(`/public-runtime-guarantee.js?v=${RELEASE}`, 'data-gc-public-runtime-guarantee');

  const registerStableWorker = () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      navigator.serviceWorker.register(`/sw.js?v=${RELEASE}-enterprise`, { scope: '/' }).then((registration) => {
        try { registration.update(); } catch (_) {}
      }).catch(() => {});
    } catch (_) {}
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerStableWorker, { once: true });
  } else {
    registerStableWorker();
  }
})();
