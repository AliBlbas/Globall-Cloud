(() => {
  'use strict';

  const loadPremiumHomepageStyles = () => {
    if (document.querySelector('link[data-gc-premium-home]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/homepage-premium-v2.css?v=20260918-1';
    link.dataset.gcPremiumHome = '1';
    document.head.appendChild(link);
  };

  const openMobileMenu = (open) => {
    const menu = document.querySelector('[data-gc-mobile-menu]');
    if (!menu) return;
    menu.hidden = !open;
  };

  const currentRoute = () => {
    const raw = (location.hash || '').replace(/^#/, '');
    return ['home','about','services','track','request','portal','contact'].includes(raw) ? raw : 'home';
  };

  const localRouteFallback = () => {
    const id = currentRoute();
    document.querySelectorAll('.page').forEach((page) => {
      const active = page.id === `page-${id}`;
      page.hidden = !active;
      page.classList.toggle('active', active);
    });
  };

  const bind = () => {
    const menuBtn = document.querySelector('[data-gc-menu]');
    if (menuBtn && !menuBtn.dataset.bound) {
      menuBtn.dataset.bound = '1';
      menuBtn.addEventListener('click', () => {
        const menu = document.querySelector('[data-gc-mobile-menu]');
        openMobileMenu(Boolean(menu?.hidden));
      });
    }

    document.querySelectorAll('[data-gc-mobile-menu] a').forEach((link) => {
      if (link.dataset.bound) return;
      link.dataset.bound = '1';
      link.addEventListener('click', () => openMobileMenu(false));
    });

    document.querySelectorAll('[data-gc-track-form]').forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = '1';
      form.addEventListener('submit', (event) => {
        const input = form.querySelector('input[name="track"]');
        const value = String(input?.value || '').trim();
        if (!value) { event.preventDefault(); input?.focus(); return; }
        if (typeof window.route === 'function') return;
        event.preventDefault();
        location.href = `/track?track=${encodeURIComponent(value)}`;
      });
    });

    document.querySelectorAll('[data-gc-quote-form]').forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = '1';
      form.addEventListener('submit', (event) => {
        if (typeof window.route === 'function' || typeof window.handleQuoteSubmit === 'function') return;
        event.preventDefault();
        const fd = new FormData(form);
        const msg = [
          'Globall Cloud — داواکاری نرخ',
          `ناو: ${fd.get('name') || ''}`,
          `مۆبایل: ${fd.get('phone') || ''}`,
          `سەرچاوە: ${fd.get('origin') || ''}`,
          `جۆر: ${fd.get('mode') || ''}`,
          `وردەکاری: ${fd.get('details') || ''}`,
        ].join('\n');
        location.href = `https://wa.me/9647507577137?text=${encodeURIComponent(msg)}`;
      });
    });

    document.querySelectorAll('[data-gc-contact-form]').forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = '1';
      form.addEventListener('submit', (event) => {
        if (typeof window.route === 'function' || typeof window.handleContactSubmit === 'function') return;
        event.preventDefault();
        const fd = new FormData(form);
        const msg = `Globall Cloud — پەیامی نوێ\nناو: ${fd.get('name') || ''}\nئیمەیل: ${fd.get('email') || ''}\nپەیام: ${fd.get('message') || ''}`;
        location.href = `https://wa.me/9647507577137?text=${encodeURIComponent(msg)}`;
      });
    });
  };

  const boot = () => {
    loadPremiumHomepageStyles();
    bind();
    window.addEventListener('hashchange', () => { if (typeof window.route !== 'function') localRouteFallback(); });
    window.setTimeout(() => {
      loadPremiumHomepageStyles();
      bind();
      if (typeof window.route !== 'function') localRouteFallback();
    }, 1200);
    window.setTimeout(bind, 3000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
