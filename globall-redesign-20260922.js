(() => {
  const mountFinalStyle = () => {
    const href = '/globall-redesign-20260922.css?v=2';
    const premiumHref = '/globall-premium-logistics-2026.css?v=1';
    [...document.querySelectorAll('link[rel="stylesheet"]')].filter(l => l.href.includes('/globall-redesign-20260922.css')).forEach(l => l.remove());
    [...document.querySelectorAll('link[rel="stylesheet"]')].filter(l => l.href.includes('/globall-premium-logistics-2026.css')).forEach(l => l.remove());
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.gcFinalRedesign = '1';
    document.head.appendChild(link);
    const premium = document.createElement('link');
    premium.rel = 'stylesheet';
    premium.href = premiumHref;
    premium.dataset.gcPremiumLogistics = '1';
    document.head.appendChild(premium);
  };

  const syncPages = (id) => {
    document.querySelectorAll('.gc-app .page').forEach(page => {
      const active = page.id === ('page-' + id);
      page.classList.toggle('active', active);
      page.hidden = !active;
    });
  };

  const menu = document.querySelector('[data-gc-menu]');
  const mobile = document.querySelector('[data-gc-mobile-menu]');
  menu?.addEventListener('click', () => { if (mobile) mobile.hidden = !mobile.hidden; });
  document.querySelectorAll('[data-gc-mobile-menu] a').forEach(a => a.addEventListener('click', () => { if (mobile) mobile.hidden = true; }));

  document.querySelectorAll('#page-request a, #page-request button').forEach(() => {});
  const requestForm = document.getElementById('requestForm');
  requestForm?.addEventListener('submit', (event) => {
    const fn = window.handleRequestSubmit;
    if (typeof fn === 'function') {
      event.preventDefault();
      Promise.resolve(fn(event)).catch(() => {});
    }
  });

  const bootRoute = () => {
    const hash = String(location.hash || '').replace(/^#/, '');
    const allowed = ['home','about','services','track','request','portal','contact'];
    const id = allowed.includes(hash) ? hash : (location.pathname === '/services' ? 'services' : location.pathname === '/track' ? 'track' : location.pathname === '/request' || location.pathname === '/quote' ? 'request' : location.pathname === '/dashboard' || location.pathname === '/portal' ? 'portal' : location.pathname === '/contact' ? 'contact' : 'home');
    if (typeof window.route === 'function') {
      try { window.route(id); return; } catch (_) {}
    }
    syncPages(id);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { mountFinalStyle(); bootRoute(); setTimeout(mountFinalStyle, 1200); }, {once:true});
  } else {
    mountFinalStyle(); bootRoute(); setTimeout(mountFinalStyle, 1200);
  }
  window.addEventListener('hashchange', bootRoute);
})();
