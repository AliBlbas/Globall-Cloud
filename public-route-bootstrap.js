(() => {
  'use strict';
  const RELEASE = '20260913-5';
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
    document.head.appendChild(link);
  };

  // Keep one navigation system. The historical premium mobile JS created a
  // second bottom dock and competed with the native site navigation.
  addScript(`/public-staff-guard-20260909.js?v=${RELEASE}`, 'data-gc-public-staff-guard');
  addScript(`/public-production-safety.js?v=${RELEASE}`, 'data-gc-public-production-safety');
  addStylesheet(`/site-navigation-20260909.css?v=${RELEASE}`);
  addScript(`/site-navigation-20260909.js?v=${RELEASE}`, 'data-gc-public-navigation');
  addScript(`/public-runtime-guarantee.js?v=${RELEASE}`, 'data-gc-public-runtime-guarantee');
  addScript(`/public-core-recovery.js?v=${RELEASE}`, 'data-gc-public-core-recovery');

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
