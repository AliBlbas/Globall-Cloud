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
})();
