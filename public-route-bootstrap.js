(() => {
  'use strict';

  const VERSION = '20260912-4';
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const pathRoutes = {
    '/quote': 'request',
    '/request': 'request',
    '/dashboard': 'portal',
    '/portal': 'portal',
    '/services': 'services',
    '/about': 'about',
    '/contact': 'contact',
  };
  const params = new URLSearchParams(window.location.search);
  const tracking = params.get('track') || params.get('id') || params.get('gc');
  const route = tracking ? 'track' : pathRoutes[path];

  if (route && !window.location.hash) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${route}`);
  }

  const loadScript = (src, attribute) => new Promise((resolve) => {
    const selector = `script[data-gc-${attribute}]`;
    const existing = document.querySelector(selector);
    if (existing) {
      if (existing.dataset.gcLoaded === '1') return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => resolve(), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.gcLoaded = '0';
    script.setAttribute(`data-gc-${attribute}`, '1');
    script.onload = () => { script.dataset.gcLoaded = '1'; resolve(); };
    script.onerror = () => resolve();
    (document.head || document.documentElement).appendChild(script);
  });

  const addCss = (href, attribute) => {
    if (document.querySelector(`link[data-gc-${attribute}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(`data-gc-${attribute}`, '1');
    (document.head || document.documentElement).appendChild(link);
  };

  const publicBoot = async () => {
    addCss(`/site-navigation-20260909.css?v=${VERSION}`, 'navigation-css');
    addCss(`/public-premium-mobile-20260909.css?v=${VERSION}`, 'premium-mobile-css');

    await loadScript(`/public-staff-guard-20260909.js?v=${VERSION}`, 'public-staff-guard');
    await loadScript(`/public-production-safety.js?v=${VERSION}`, 'public-production-safety');
    await loadScript(`/site-navigation-20260909.js?v=${VERSION}`, 'public-navigation');
    await loadScript(`/public-ui-recovery-20260912.js?v=${VERSION}`, 'public-ui-recovery');
    await loadScript(`/public-runtime-guarantee.js?v=${VERSION}`, 'public-runtime-guarantee');
    await loadScript(`/public-premium-mobile-20260909.js?v=${VERSION}`, 'premium-mobile');

    const hydrate = () => {
      try {
        if (typeof window.t === 'function') {
          document.querySelectorAll('[data-i18n]').forEach((el) => {
            try {
              const value = window.t(el.getAttribute('data-i18n'));
              if (typeof value === 'string' && value && value !== el.getAttribute('data-i18n')) el.textContent = value;
            } catch (_) {}
          });
          document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
            try {
              const value = window.t(el.getAttribute('data-i18n-ph'));
              if (typeof value === 'string' && value) el.setAttribute('placeholder', value);
            } catch (_) {}
          });
        }

        const renderers = [
          'renderHomeServices', 'renderBusinessHub', 'renderDashboardPreview',
          'renderCorridorStrip', 'renderWarehouseCards', 'renderOperationsHub',
          'renderHow', 'renderWhy', 'renderAboutValues', 'renderFooterServices',
          'renderLegalDocs', 'renderTestimonials'
        ];
        renderers.forEach((name) => {
          try { if (typeof window[name] === 'function') window[name](); } catch (_) {}
        });

        if (typeof window.route === 'function') {
          const id = (window.location.hash || '').replace(/^#/, '') || 'home';
          window.route(['home','about','services','track','request','portal','contact'].includes(id) ? id : 'home');
        }
      } catch (_) {}
    };

    hydrate();
    [150, 500, 1200, 2500, 5000].forEach((delay) => window.setTimeout(hydrate, delay));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', publicBoot, { once: true });
  } else {
    publicBoot();
  }
})();
