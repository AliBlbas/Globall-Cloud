/* Globall Cloud — public navigation completion layer (2026-09-09)
 * Makes every public SPA route discoverable, linkable and usable from desktop/mobile.
 * It also provides a safe fallback when a route handler has not loaded yet.
 */
(() => {
  'use strict';

  const ROUTES = {
    home:    { href: '/',          key: 'nav.home',      fallback: 'سەرەکی',    icon: '⌂' },
    about:   { href: '/about',     key: 'nav.about',     fallback: 'دەربارەمان', icon: '◉' },
    services:{ href: '/services',  key: 'nav.services',  fallback: 'خزمەتگوزاری', icon: '▣' },
    track:   { href: '/#track',    key: 'nav.track',     fallback: 'شوێنکەوتن', icon: '⌁' },
    request: { href: '/quote',     key: 'nav.quote',     fallback: 'داواکردنی نرخ', icon: '₿' },
    portal:  { href: '/dashboard', key: 'nav.dashboard',  fallback: 'داشبۆرد',    icon: '♙' },
    contact: { href: '/contact',   key: 'nav.contact',   fallback: 'پەیوەندی',  icon: '✉' },
    privacy: { href: '/#privacy',  key: 'legal.privacyTitle', fallback: 'تایبەتێتی', icon: '◌' },
    terms:   { href: '/#terms',    key: 'legal.termsTitle',   fallback: 'مەرجەکان', icon: '§' },
    staff:   { href: '/staff',     fallback: 'بەشی ستاف', icon: '◈' }
  };

  const PUBLIC_IDS = ['home','about','services','track','request','portal','contact','privacy','terms'];

  function routeUrl(id) {
    return ROUTES[id]?.href || '/';
  }

  function navigate(id) {
    if (!ROUTES[id]) return;
    if (id === 'staff') {
      window.location.href = routeUrl(id);
      return;
    }
    if (typeof window.route === 'function') {
      window.route(id);
      return;
    }
    if (id === 'home') {
      window.location.href = '/';
    } else if (ROUTES[id].href.includes('#')) {
      window.location.href = ROUTES[id].href;
    } else {
      window.location.href = `${ROUTES[id].href}`;
    }
  }

  function labelNode(id, className = '') {
    const cfg = ROUTES[id];
    const span = document.createElement('span');
    if (className) span.className = className;
    span.dataset.i18n = cfg.key || '';
    span.textContent = cfg.fallback;
    return span;
  }

  function makeRouteLink(id, mobile = false) {
    const cfg = ROUTES[id];
    const a = document.createElement('a');
    a.href = cfg.href;
    a.dataset.gcRoute = id;
    a.className = `${mobile ? 'gc-mobile-route' : ''} ${id === 'request' || id === 'portal' ? 'gc-primary' : ''}`.trim();
    a.setAttribute('data-gc-nav-owned', '1');
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = cfg.icon || '•';
    icon.style.cssText = 'width:18px;display:inline-flex;justify-content:center;opacity:.8;font-family:var(--mono)';
    a.append(icon, labelNode(id));
    return a;
  }

  function enhanceExistingRouteControls() {
    document.querySelectorAll('[data-gc-onclick]').forEach((el) => {
      if (el.dataset.gcRoute) return;
      const raw = String(el.getAttribute('data-gc-onclick') || '');
      const match = raw.match(/route\(\s*["']([a-z]+)["']\s*\)/i);
      if (!match || !ROUTES[match[1]]) return;
      const id = match[1];
      el.dataset.gcRoute = id;
      el.classList.add('gc-route-ready');
      if (el.tagName === 'A') el.setAttribute('href', routeUrl(id));
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', ROUTES[id].fallback);
    });
  }

  function ensureMobileRoutes() {
    const menu = document.getElementById('mobileMenu');
    if (!menu) return;

    const wanted = ['request','portal'];
    wanted.forEach((id) => {
      if (menu.querySelector(`[data-gc-nav-owned="1"][data-gc-route="${id}"]`)) return;
      const existing = menu.querySelector(`[data-route="${id}"]`);
      if (existing) {
        existing.dataset.gcRoute = id;
        existing.classList.add('gc-mobile-route', 'gc-primary');
        if (existing.tagName === 'A') existing.href = routeUrl(id);
      } else {
        const staff = menu.querySelector('.staff-mobile-link');
        menu.insertBefore(makeRouteLink(id, true), staff || null);
      }
    });
  }

  function buildSectionMenu() {
    if (document.querySelector('.gc-section-menu')) return;
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    const wrap = document.createElement('div');
    wrap.className = 'gc-section-menu';
    wrap.setAttribute('data-gc-section-menu', '1');

    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'gcSectionMenuPanel');
    button.innerHTML = '<span aria-hidden="true">☰</span><span>هەموو بەشەکان</span><span class="gc-chevron" aria-hidden="true">⌄</span>';

    const panel = document.createElement('div');
    panel.className = 'gc-section-menu-panel';
    panel.id = 'gcSectionMenuPanel';
    panel.setAttribute('role', 'menu');

    const note = document.createElement('div');
    note.className = 'gc-menu-note';
    note.textContent = 'هەموو پەڕەکانی بەشی کڕیار لە یەک شوێن — کلیک بکە بۆ کردنەوە.';
    panel.appendChild(note);

    PUBLIC_IDS.forEach((id) => panel.appendChild(makeRouteLink(id)));
    panel.appendChild(makeRouteLink('staff'));

    wrap.append(button, panel);
    navRight.insertBefore(wrap, navRight.firstChild);

    const close = () => {
      wrap.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    };

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const open = wrap.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });

    panel.addEventListener('click', (event) => {
      const link = event.target.closest('[data-gc-route]');
      if (link) close();
    });

    document.addEventListener('click', (event) => {
      if (!wrap.contains(event.target)) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  }

  function upgradeNavLinks() {
    document.querySelectorAll('.nav-links a[data-route], .nav-links a[data-gc-route]').forEach((a) => {
      const id = a.dataset.route || a.dataset.gcRoute;
      if (!ROUTES[id]) return;
      a.dataset.gcRoute = id;
      a.setAttribute('href', routeUrl(id));
      a.setAttribute('role', 'link');
    });
  }

  function completeFooter() {
    const quick = document.querySelector('footer .footer-col ul');
    if (!quick) return;
    const existing = new Set(
      [...quick.querySelectorAll('[data-gc-route], [data-route]')]
        .map((el) => el.dataset.gcRoute || el.dataset.route)
        .filter(Boolean)
    );

    ['portal','contact','privacy','terms'].forEach((id) => {
      if (existing.has(id)) return;
      const li = document.createElement('li');
      li.appendChild(makeRouteLink(id));
      quick.appendChild(li);
    });

    const staffLi = document.createElement('li');
    const staffLink = makeRouteLink('staff');
    staffLink.classList.add('gc-staff');
    staffLi.appendChild(staffLink);
    const alreadyStaff = [...quick.querySelectorAll('[data-gc-route="staff"]')].length > 0;
    if (!alreadyStaff) quick.appendChild(staffLi);
  }

  function installGlobalRouteHandler() {
    if (window.__gcNavigation20260909) return;
    window.__gcNavigation20260909 = true;

    document.addEventListener('click', (event) => {
      const el = event.target.closest?.('[data-gc-route]');
      if (!el) return;
      const id = el.dataset.gcRoute;
      if (!ROUTES[id]) return;

      // Let explicit external/staff links navigate normally.
      if (id === 'staff') return;

      event.preventDefault();
      event.stopPropagation();
      navigate(id);
    }, true);
  }

  function syncActiveState() {
    const current = typeof location.hash === 'string' ? location.hash.replace(/^#/, '') : '';
    const known = PUBLIC_IDS.includes(current) ? current : (location.pathname === '/about' ? 'about' : location.pathname === '/services' ? 'services' : location.pathname === '/contact' ? 'contact' : location.pathname === '/dashboard' || location.pathname === '/portal' ? 'portal' : location.pathname === '/quote' || location.pathname === '/request' ? 'request' : 'home');
    document.querySelectorAll('[data-gc-route]').forEach((el) => {
      const active = (el.dataset.gcRoute === known);
      el.classList.toggle('active', active);
      if (active && el.tagName === 'A') el.setAttribute('aria-current', 'page');
      else if (el.tagName === 'A') el.removeAttribute('aria-current');
    });
  }

  function install() {
    enhanceExistingRouteControls();
    upgradeNavLinks();
    ensureMobileRoutes();
    buildSectionMenu();
    completeFooter();
    installGlobalRouteHandler();
    syncActiveState();

    // The main page owns translations; re-apply them after our injected labels exist.
    window.setTimeout(() => {
      try { if (typeof window.applyI18n === 'function') window.applyI18n(); } catch (_) {}
      syncActiveState();
    }, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
  window.addEventListener('hashchange', syncActiveState, { passive: true });
})();
