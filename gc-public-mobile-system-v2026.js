/* Globall Cloud — Public Mobile System 2026
 * UX-only navigation enhancement. Reuses existing routes/actions with real icons.
 */
(() => {
  'use strict';
  if (window.__gcPublicMobileSystem) return;
  window.__gcPublicMobileSystem = true;

  const isPublicSurface = () => !document.querySelector('.gc-shell');

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
    track: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
    quote: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5"/></svg>',
    services: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9l7-5 7 5v10"/><path d="M8 19v-6h8v6M3 19h18"/></svg>',
    account: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.8-4 3-6 7-6s6.2 2 7 6"/></svg>'
  };

  function boot() {
    if (!isPublicSurface() || document.getElementById('gcPublicMobileActions')) return;

    const nav = document.createElement('nav');
    nav.id = 'gcPublicMobileActions';
    nav.className = 'gc-public-mobile-actions';
    nav.setAttribute('aria-label', 'ناوبەری خێرای Globall Cloud');

    const links = [
      { id: 'track', label: 'شوێنکەوتن', onClick: () => route('', '/track') },
      { id: 'quote', label: 'داواکاری نرخ', onClick: () => route('', '/request') },
      { id: 'services', label: 'خزمەتگوزاری', onClick: () => route('', '/services') },
      { id: 'account', label: 'هەژمار', onClick: () => { const target = resolveAccount(); if (target) target.click(); else route('', '/dashboard'); } },
    ];

    links.forEach(({ id, label, onClick }) => {
      const button = document.createElement('a');
      button.href = id === 'track' ? '/track' : id === 'quote' ? '/request' : id === 'services' ? '/services' : '/dashboard';
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
