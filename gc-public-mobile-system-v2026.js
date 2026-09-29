/* Globall Cloud — Public Mobile System 2026
 * UX-only navigation enhancement. Reuses existing routes/actions with real icons.
 */
(() => {
  'use strict';
  if (window.__gcPublicMobileSystem) return;
  window.__gcPublicMobileSystem = true;

  const isPublicSurface = () => !document.querySelector('.gc-shell') && !/^\/(?:customer-portal|dashboard|portal)(?:\.html)?\/?$/i.test(location.pathname);

  const resolveAccount = () => {
    const candidates = [
      '[data-gc-customer-login]',
      '.nav-auth',
      '[data-route="login"]',
      '[data-action="login"]',
      'a[href*="login"]',
      'button[data-tab="login"]',
    ];
    return candidates.map((selector) => document.querySelector(selector)).find(Boolean) || null;
  };

  const route = (hash, path = null) => {
    const target = path || window.location.pathname;
    if (window.location.pathname === target && window.location.hash === hash) return;
    window.location.href = `${target}${hash}`;
  };

  const icon = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7"></path><path d="M5 10v10h14V10"></path></svg>',
    shipments: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 8 8-4 8 4-8 4-8-4Z"/><path d="M4 8v8l8 4 8-4V8M12 12v8"/></svg>',
    track: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="2"></circle><path d="m12 4 2 6 6 2-6 2-2 6-2-6-6-2 6-2z"></path></svg>',
    calculator: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2m2 0h2m2 0h0M8 15h2m2 0h2m2 0h0M8 18h8"/></svg>',
    account: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.8-4 3-6 7-6s6.2 2 7 6"/></svg>'
  };

  function boot() {
    if (!isPublicSurface() || document.getElementById('gcPublicMobileActions')) return;

    const nav = document.createElement('nav');
    nav.id = 'gcPublicMobileActions';
    nav.className = 'gc-public-mobile-actions';
    nav.setAttribute('aria-label', 'ناوبەری خێرای Globall Cloud');

    const links = [
      { id: 'home', label: 'سەرەکی', onClick: () => route('', '/') },
      { id: 'shipments', label: 'بارەکان', onClick: () => route('', '/dashboard') },
      { id: 'calculator', label: 'نرخی بار', onClick: () => route('', '/request') },
      { id: 'track', label: 'شوێنکەوتن', onClick: () => route('', '/track') },
      { id: 'account', label: 'هەژمار', onClick: () => { const target = resolveAccount(); if (target) target.click(); else route('', '/dashboard'); } },
    ];

    links.forEach(({ id, label, onClick }) => {
      const button = document.createElement('a');
      button.href = id === 'home' ? '/' : id === 'shipments' ? '/dashboard' : id === 'track' ? '/track' : id === 'calculator' ? '/request' : '/dashboard';
      button.dataset.mobileAction = id;
      button.setAttribute('aria-label', label);
      button.innerHTML = `<span class="gc-mobile-nav-icon">${icon[id]}</span><span class="gc-mobile-nav-label">${label}</span>`;
      button.addEventListener('click', (event) => { event.preventDefault(); onClick(); });
      nav.appendChild(button);
    });

    document.body.appendChild(nav);

    const sync = () => {
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      const hash = window.location.hash;
      const active = path === '/' ? 'home'
        : hash === '#track' || path === '/track' || path === '/tracking-integration.html' ? 'track'
        : hash === '#request' || path === '/quote' || path === '/request' ? 'calculator'
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
