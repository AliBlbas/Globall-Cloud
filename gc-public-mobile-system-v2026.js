/* Globall Cloud — Public Mobile System 2026
 * UX-only navigation enhancement. Reuses existing routes/actions.
 */
(() => {
  'use strict';
  if (window.__gcPublicMobileSystem) return;
  window.__gcPublicMobileSystem = true;

  const isPublicSurface = () => !document.querySelector('.gc-shell');

  const resolveAccount = () => {
    const candidates = [
      '.nav-auth',
      '[data-route="login"]',
      '[data-action="login"]',
      'a[href*="login"]',
      'button[data-tab="login"]',
    ];
    return candidates.map((s) => document.querySelector(s)).find(Boolean) || null;
  };

  const route = (hash, path = null) => {
    const target = path || window.location.pathname;
    if (window.location.pathname === target && window.location.hash === hash) return;
    window.location.href = `${target}${hash}`;
  };

  function boot() {
    if (!isPublicSurface() || document.getElementById('gcPublicMobileActions')) return;

    const nav = document.createElement('nav');
    nav.id = 'gcPublicMobileActions';
    nav.className = 'gc-public-mobile-actions';
    nav.setAttribute('aria-label', 'ناوبەری خێرای Globall Cloud');

    const links = [
      { id: 'track', code: '01', label: 'شوێنکەوتن', onClick: () => route('#track', '/track') },
      { id: 'quote', code: '02', label: 'نرخ و داواکاری', onClick: () => route('#request', '/quote') },
      { id: 'services', code: '03', label: 'خزمەتگوزاری', onClick: () => route('#services', '/services') },
      { id: 'account', code: '04', label: 'هەژمار', onClick: () => {
        const target = resolveAccount();
        if (target) target.click();
        else route('#portal', '/dashboard');
      } },
    ];

    links.forEach(({ id, code, label, onClick }) => {
      const button = document.createElement('a');
      button.href = id === 'track' ? '/track' : id === 'quote' ? '/quote' : id === 'services' ? '/services' : '/dashboard';
      button.dataset.mobileAction = id;
      button.setAttribute('aria-label', label);
      button.innerHTML = `<strong>${code}</strong><span>${label}</span>`;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        onClick();
      });
      nav.appendChild(button);
    });

    document.body.appendChild(nav);

    const sync = () => {
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      const hash = window.location.hash;
      const active = hash === '#track' || path === '/track' || path === '/tracking-integration.html' ? 'track'
        : hash === '#request' || path === '/quote' || path === '/request' ? 'quote'
        : hash === '#services' || path === '/services' ? 'services'
        : hash === '#portal' || path === '/dashboard' || path === '/portal' || path === '/login' ? 'account'
        : '';
      nav.querySelectorAll('[data-mobile-action]').forEach((el) => {
        const selected = el.dataset.mobileAction === active;
        el.classList.toggle('active', selected);
        if (selected) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
      });
    };

    window.addEventListener('hashchange', sync, { passive: true });
    window.addEventListener('popstate', sync, { passive: true });
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
