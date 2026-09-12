(() => {
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

  const staffGuardSrc = '/public-staff-guard-20260909.js?v=20260909-1';
  if (!document.querySelector(`script[src^="${staffGuardSrc}"]`)) {
    const script = document.createElement('script');
    script.src = staffGuardSrc;
    script.defer = true;
    script.setAttribute('data-gc-public-staff-guard', '1');
    document.head.appendChild(script);
  }

  const safetySrc = '/public-production-safety.js?v=20260908-1';
  if (!document.querySelector(`script[src^="${safetySrc}"]`)) {
    const script = document.createElement('script');
    script.src = safetySrc;
    script.defer = true;
    script.setAttribute('data-gc-public-production-safety', '1');
    document.head.appendChild(script);
  }

  const navCss = '/site-navigation-20260909.css?v=20260909-1';
  if (!document.querySelector(`link[href^="${navCss}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = navCss;
    document.head.appendChild(link);
  }
  const navScript = '/site-navigation-20260909.js?v=20260909-1';
  if (!document.querySelector(`script[src^="${navScript}"]`)) {
    const script = document.createElement('script');
    script.src = navScript;
    script.defer = true;
    script.setAttribute('data-gc-public-navigation', '1');
    document.head.appendChild(script);
  }

  // Premium mobile UX: bottom quick actions + touch-first spacing.
  const mobileCss = '/public-premium-mobile-20260909.css?v=20260909-1';
  if (!document.querySelector(`link[href^="${mobileCss}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = mobileCss;
    document.head.appendChild(link);
  }
  const mobileScript = '/public-premium-mobile-20260909.js?v=20260909-1';
  if (!document.querySelector(`script[src^="${mobileScript}"]`)) {
    const script = document.createElement('script');
    script.src = mobileScript;
    script.defer = true;
    script.setAttribute('data-gc-premium-mobile', '1');
    document.head.appendChild(script);
  }

  // Replace the emergency v98 worker with the stable production worker.
  const registerStableWorker = () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      navigator.serviceWorker.register('/sw.js?v=20260912-stable', { scope: '/' }).catch(() => {});
    } catch (_) {}
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerStableWorker, { once: true });
  } else {
    registerStableWorker();
  }
})();
