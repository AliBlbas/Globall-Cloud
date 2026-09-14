/* Globall Cloud — defensive public interaction layer. */
(() => {
  'use strict';

  const ROUTES = {
    home: '/',
    about: '/about',
    services: '/services',
    track: '/track',
    request: '/request',
    portal: '/portal',
    contact: '/contact',
    staff: '/staff',
  };

  const routeFromElement = (el) => {
    const direct = el?.dataset?.gcRoute || el?.dataset?.route;
    if (direct && ROUTES[direct]) return direct;
    const raw = String(el?.getAttribute?.('data-gc-onclick') || '');
    const m = raw.match(/route\(\s*["']([a-z-]+)["']\s*\)/i);
    if (m && ROUTES[m[1]]) return m[1];
    return null;
  };

  const go = (id) => {
    const href = ROUTES[id] || ROUTES.home;
    if (id === 'home' && (location.pathname === '/' || location.pathname === '/index.html')) {
      if (typeof window.route === 'function') {
        try { window.route('home'); return; } catch (_) {}
      }
      location.hash = '#home';
      return;
    }
    if (typeof window.route === 'function') {
      try { window.route(id); return; } catch (_) {}
    }
    location.assign(href);
  };

  const syncMobile = (open) => {
    const menu = document.querySelector('[data-gc-mobile-menu]') || document.getElementById('mobileMenu');
    const button = document.querySelector('[data-gc-menu]') || document.querySelector('[data-gc-onclick*="toggleMobileMenu"]');
    if (!menu) return;
    menu.hidden = !open;
    menu.dataset.open = open ? '1' : '0';
    if (button) button.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  const bind = () => {
    document.querySelectorAll('[data-gc-menu], [data-gc-onclick*="toggleMobileMenu"]').forEach((button) => {
      if (button.dataset.gcRepairBound) return;
      button.dataset.gcRepairBound = '1';
      button.addEventListener('click', (event) => {
        if (typeof window.toggleMobileMenu === 'function') {
          try { window.toggleMobileMenu(); return; } catch (_) {}
        }
        const menu = document.querySelector('[data-gc-mobile-menu]') || document.getElementById('mobileMenu');
        syncMobile(Boolean(menu?.hidden));
      }, true);
    });

    document.addEventListener('click', (event) => {
      const target = event.target?.closest?.('a,button');
      if (!target) return;
      const id = routeFromElement(target);
      if (!id) return;
      if (target.matches('[data-gc-route], [data-route], [data-gc-onclick]')) {
        if (id === 'staff') return;
        if (typeof window.route === 'function') return;
        event.preventDefault();
        event.stopPropagation();
        go(id);
      }
    }, true);

    document.querySelectorAll('[data-gc-mobile-menu] a, #mobileMenu a').forEach((link) => {
      if (link.dataset.gcRepairMenuBound) return;
      link.dataset.gcRepairMenuBound = '1';
      link.addEventListener('click', () => syncMobile(false), true);
    });
  };

  const preventStuckBlank = () => {
    const pages = document.querySelectorAll('.page');
    if (!pages.length) return;
    const visible = [...pages].some((p) => !p.hidden && (p.classList.contains('active') || getComputedStyle(p).display !== 'none'));
    if (visible) return;
    const home = document.getElementById('page-home');
    if (home) {
      home.hidden = false;
      home.classList.add('active');
    }
  };

  const boot = () => {
    bind();
    preventStuckBlank();
    window.setTimeout(() => { bind(); preventStuckBlank(); }, 250);
    window.setTimeout(() => { bind(); preventStuckBlank(); }, 1000);
    window.setTimeout(() => { bind(); preventStuckBlank(); }, 2500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
