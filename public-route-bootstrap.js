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

  const safetySrc = '/public-production-safety.js?v=20260908-1';
  if (!document.querySelector(`script[src^="${safetySrc}"]`)) {
    const script = document.createElement('script');
    script.src = safetySrc;
    script.defer = true;
    script.setAttribute('data-gc-public-production-safety', '1');
    document.head.appendChild(script);
  }

  // Public navigation completion: exposes every customer-facing route and
  // makes route controls usable even when the CSP bridge has not bound them yet.
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
})();
