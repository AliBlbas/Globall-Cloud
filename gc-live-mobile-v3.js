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
      const path = location.pathname.replace(/\/$/, '') || '/';
      const hash = location.hash || '';
      const routeKey = path === '/track' ? 'track'
        : path === '/dashboard' ? 'account'
        : path === '/' && hash === '#request' ? 'quote'
        : path === '/' && hash === '#services' ? 'services'
        : 'home';
      dock.querySelectorAll('a[data-dock]').forEach((item) => {
        const isActive = item.dataset.dock === routeKey;
        item.classList.toggle('active', isActive);
        if (isActive) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
    }  };
  window.addEventListener('hashchange', boot);
  window.addEventListener('popstate', boot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();