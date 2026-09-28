/* Globall Cloud live mobile navigation v3 */
(() => {
  'use strict';
  const boot = () => {
    const menuButton = document.querySelector('[data-gc-menu]');
    const menu = document.querySelector('[data-gc-mobile-menu]');
    const dock = document.querySelector('.gc-mobile-dock-v3');
    if (menuButton && menu) {
      const setOpen = (open) => {
        menu.hidden = !open;
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      };
      setOpen(false);
      menuButton.addEventListener('click', (event) => {
        event.preventDefault();
        setOpen(menu.hidden);
      });
      menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setOpen(false);
      });
      document.addEventListener('click', (event) => {
        if (!menu.hidden && !menu.contains(event.target) && !menuButton.contains(event.target)) setOpen(false);
      }, true);
    }
    if (dock) {
      const current = (location.pathname.replace(/\/$/, '') || '/') + (location.hash || '');
      dock.querySelectorAll('a[data-dock]').forEach((a) => {
        const href = a.getAttribute('href') || '';
        const route = href === '/' ? '/' : href.startsWith('/track') ? '/track' : href.startsWith('/services') ? '/services' : href.startsWith('/dashboard') ? '/dashboard' : href.startsWith('/#') ? '/#' + href.slice(2) : href;
        if ((route === '/' && (location.pathname === '/' || location.pathname === '')) ||
            (route !== '/' && location.pathname.startsWith(route.split('#')[0] || route))) {
          a.classList.add('active');
        }
      });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();