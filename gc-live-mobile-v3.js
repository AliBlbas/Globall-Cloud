/* Globall Cloud live mobile navigation v3 */
(() => {
  'use strict';
  const boot = () => {
    const menuButton = document.querySelector('[data-gc-menu]');
    const menu = document.querySelector('[data-gc-mobile-menu]');
    const dock = document.querySelector('.gc-mobile-dock-v3');
    if (menuButton && menu) {
      menuButton.setAttribute('aria-controls', menu.id || 'gcMobileMenu');
      const setOpen = (open) => {
        menu.hidden = !open;
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'مێنیوی مۆبایل دابخە' : 'مێنیوی مۆبایل بکەرەوە');
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
          icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"></path></svg>'
        },
        {
          key: 'quote', href: '/#request', label: 'داواکردنی نرخ',
          icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16"></path></svg>'
        },
        {
          key: 'services', href: '/#services', label: 'خزمەتگوزاری',
          icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5z"></path><path d="M9 9h6M9 13h6M9 17h3"></path></svg>'
        },
        {
          key: 'track', href: '/track', label: 'شوێنکەوتن',
          icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4M8.5 11h5"></path></svg>'
        },
        {
          key: 'account', href: '/dashboard#profile', label: 'هەژمار',
          icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"></circle><path d="M5 20c.8-3.3 3.2-5 7-5s6.2 1.7 7 5"></path></svg>'
        }
      ];
      const items = [...dock.querySelectorAll('a[data-dock]')].slice(0, 5);
      definitions.forEach((def, index) => {
        const item = items[index];
        if (!item) return;
        item.dataset.dock = def.key;
        item.href = def.href;
        item.setAttribute('aria-label', def.label);
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