/* Globall Cloud — final mobile navigation controller
 * Normalizes the public mobile dock after any late runtime rewrite.
 * Presentation/navigation only; no backend or auth changes.
 */
(() => {
  'use strict';

  const ITEMS = [
    { key:'home', href:'/', label:'سەرەکی', icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-7 8 7v10H4z"></path><path d="M9 20v-6h6v6"></path></svg>' },
    { key:'services', href:'/#services', label:'خزمەت', icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4-8 4-8-4 8-4Z"></path><path d="M4 7v9l8 4 8-4V7M12 11v9"></path></svg>' },
    { key:'quote', href:'/#request', label:'نرخ', primary:true, icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>' },
    { key:'contact', href:'/#contact', label:'پەیوەندی', icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v11H8l-3 3z"></path><path d="M8 9h8M8 12h5"></path></svg>' },
    { key:'settings', href:'/dashboard#profile', label:'ڕێکخستن', icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15.1a1.7 1.7 0 0 0-1.6-1H6v-2.6h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.6v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.6h-.2a1.7 1.7 0 0 0-1.6 1Z"></path></svg>' }
  ];
  const routeKey = () => {
    const path = location.pathname.replace(/\/$/, '') || '/';
    const hash = location.hash || '';
    if (path === '/dashboard' && hash === '#profile') return 'settings';
    if (path === '/' && hash === '#services') return 'services';
    if (path === '/' && hash === '#request') return 'quote';
    if (path === '/' && hash === '#contact') return 'contact';
    return 'home';
  };

  const normalize = () => {
    if (syncing) return;
    const dock = document.querySelector('.gc-mobile-dock-v3');
    if (!dock) return;

    syncing = true;
    try {
      const items = [...dock.querySelectorAll('a')].slice(0, ITEMS.length);
      if (items.length < ITEMS.length) return;

      ITEMS.forEach((def, index) => {
        const item = items[index];
        item.dataset.dock = def.key;
        item.href = def.href;
        item.setAttribute('aria-label', def.label);
        item.classList.toggle('primary', Boolean(def.primary));
        item.innerHTML = '<span class="gc-icon" aria-hidden="true">' + def.icon + '</span><span class="gc-dock-label">' + def.label + '</span>';
      });

      const activeKey = routeKey();
      items.forEach((item) => {
        const active = item.dataset.dock === activeKey;
        item.classList.toggle('active', active);
        if (active) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
    } finally {
      syncing = false;
    }
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      normalize();
    });
  };

  const boot = () => {
    normalize();
    const observerTarget = document.body;
    if (observerTarget && !observerTarget.__gcFinalDockObserver) {
      const observer = new MutationObserver(() => schedule());
      observer.observe(observerTarget, {subtree:true, childList:true});
      observerTarget.__gcFinalDockObserver = observer;
    }
  };

  document.addEventListener('click', (event) => {
    const item = event.target.closest?.('.gc-mobile-dock-v3 a');
    if (!item) return;
    schedule();
  }, true);

  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  } else {
    boot();
  }
})();
