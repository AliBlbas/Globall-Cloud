
(() => {
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
})();
