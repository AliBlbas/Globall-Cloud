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

  const loadScript = (src, attribute) => {
    if (document.querySelector(`script[data-gc-${attribute}]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.setAttribute(`data-gc-${attribute}`, '1');
    document.head.appendChild(script);
  };

  loadScript('/public-staff-guard-20260909.js?v=20260909-1', 'public-staff-guard');
  loadScript('/public-production-safety.js?v=20260908-1', 'public-production-safety');
  loadScript('/site-navigation-20260909.js?v=20260912-2', 'public-navigation');
  loadScript('/public-ui-recovery-20260912.js?v=20260912-1', 'public-ui-recovery');

  const addCss = (href, attribute) => {
    if (document.querySelector(`link[data-gc-${attribute}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(`data-gc-${attribute}`, '1');
    document.head.appendChild(link);
  };

  addCss('/site-navigation-20260909.css?v=20260909-1', 'navigation-css');
  addCss('/public-premium-mobile-20260909.css?v=20260909-1', 'premium-mobile-css');
  loadScript('/public-premium-mobile-20260909.js?v=20260909-1', 'premium-mobile');
})();