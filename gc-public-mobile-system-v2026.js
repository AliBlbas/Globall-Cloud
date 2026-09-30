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
    calculator: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2m2 0h2m2 0h0M8 15h2m2 0h2m2 0h0M8 18h8"/></svg>',
    services: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="M4 7v9l8 4 8-4V7M12 11v9"/></svg>',
    contact: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v11H8l-3 3z"/><path d="M8 9h8M8 12h5"/></svg>'
  };

  function boot() {
    if (!isPublicSurface() || document.getElementById('gcPublicMobileActions')) return;

    const nav = document.createElement('nav');
    nav.id = 'gcPublicMobileActions';
    nav.className = 'gc-public-mobile-actions';
    nav.setAttribute('aria-label', 'ناوبەری خێرای Globall Cloud');

    const links = [
      { id: 'home', label: 'سەرەکی', onClick: () => route('', '/') },
      { id: 'services', label: 'خزمەت', onClick: () => route('#services', '/') },
      { id: 'calculator', label: 'نرخ', onClick: () => route('', '/request') },
      { id: 'contact', label: 'پەیوەندی', onClick: () => route('#contact', '/') },
      { id: 'settings', label: 'ڕێکخستن', onClick: () => route('#profile', '/dashboard') },
    ];

    links.forEach(({ id, label, onClick }) => {
      const button = document.createElement('a');
      button.href = id === 'home' ? '/' : id === 'calculator' ? '/request' : '/';
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
      const active = path === '/' && !hash ? 'home'
        : hash === '#request' || path === '/quote' || path === '/request' ? 'calculator'
        : hash === '#services' ? 'services'
        : hash === '#contact' ? 'contact'
        : path === '/dashboard' && hash === '#profile' ? 'settings'
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
