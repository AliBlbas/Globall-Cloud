(() => {
  const mountFinalStyle = () => {
    const href = '/globall-redesign-20260922.css?v=1';
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
    const existing = links.find(l => l.href.includes('/globall-redesign-20260922.css'));
    if (existing) existing.remove();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.gcFinalRedesign = '1';
    document.head.appendChild(link);
  };
  const menu = document.querySelector('[data-gc-menu]');
  const mobile = document.querySelector('[data-gc-mobile-menu]');
  menu?.addEventListener('click', () => { if (mobile) mobile.hidden = !mobile.hidden; });
  document.querySelectorAll('[data-gc-mobile-menu] a').forEach(a => a.addEventListener('click', () => { if (mobile) mobile.hidden = true; }));
  document.querySelectorAll('[data-route]').forEach(el => el.addEventListener('click', () => {
    const route = el.dataset.route;
    if (route === 'portal') window.location.href = '/dashboard';
    if (route === 'staff') window.location.href = '/staff';
    if (route === 'track') window.location.href = '/track';
  }));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { mountFinalStyle(); setTimeout(mountFinalStyle, 1200); }, {once:true});
  } else {
    mountFinalStyle();
    setTimeout(mountFinalStyle, 1200);
  }
})();