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
      const definitions = [
        {
          key: 'home', href: '/', label: 'سەرەکی',
          icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7"></path><path d="M5 9v11h14V9M9 20v-6h6v6"></path></svg>'
        },
        {
          key: 'services', href: '/#services', label: 'خزمەتگوزاری',
          icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4-8 4-8-4 8-4Z"></path><path d="M4 7v10l8 4 8-4V7M12 11v10"></path></svg>'
        },
        {
          key: 'quote', href: '/#request', label: 'داواکردنی نرخ',
          icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H5V3h2Z"></path><path d="M15 3v5h4M8 12h8M8 16h5"></path><path d="M12 10v4M10 12h4"></path></svg>'
        },
        {
          key: 'track', href: '/track', label: 'شوێنکەوتن',
          icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="2"></circle><circle cx="18" cy="6" r="2"></circle><path d="M8 18h5c3 0 5-2 5-5v-3M18 8V6h-4c-3 0-5 2-5 5v3"></path></svg>'
        },
        {
          key: 'account', href: '/#auth', label: 'هەژمار',
          icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M4.5 20c.8-3.6 3.3-5.5 7.5-5.5s6.7 1.9 7.5 5.5"></path></svg>'
        }
      ];
      const items = [...dock.querySelectorAll('a[data-dock]')].slice(0, 5);
      definitions.forEach((def, index) => {
        const item = items[index];
        if (!item) return;
        item.dataset.dock = def.key;
        item.href = def.href;
        item.setAttribute('aria-label', def.label);
        item.classList.toggle('primary', def.key === 'quote');
        item.innerHTML = def.icon + '<span>' + def.label + '</span>';
      });

      const path = location.pathname.replace(/\/$/, '') || '/';
      const hash = location.hash || '';
      const routeKey = path === '/track' ? 'track'
        : path === '/dashboard' ? 'account'
        : path === '/' && hash === '#request' ? 'quote'
        : path === '/' && hash === '#services' ? 'services'
        : 'home';

      items.forEach((item) => {
        const isActive = item.dataset.dock === routeKey;
        item.classList.toggle('active', isActive);
        if (isActive) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
    }
  };
  window.addEventListener('hashchange', boot);
  window.addEventListener('popstate', boot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();