/* Globall Cloud — final mobile navigation controller
 * Normalizes the public mobile dock after any late runtime rewrite.
 * Presentation/navigation only; no backend or auth changes.
 */
(() => {
  'use strict';

  const ITEMS = [
    { key:'home', href:'/', label:'سەرەکی', icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-7 8 7v10H4z"></path><path d="M9 20v-6h6v6"></path></svg>' },
    { key:'shipments', href:'/dashboard#shipments', label:'بارەکان', icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4z"></path><path d="M7 7V5h10v2M4 11h16M9 15h6"></path></svg>' },
    { key:'quote', href:'/#request', label:'داواکردنی نرخ', primary:true, icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>' },
    { key:'track', href:'/track', label:'شوێنکەوتن', icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4M8.5 11h5"></path></svg>' },
    { key:'account', href:'/dashboard#profile', label:'هەژمار', icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"></circle><path d="M5 20c.8-3.3 3.2-5 7-5s6.2 1.7 7 5"></path></svg>' }
  ];

  const routeKey = () => {
    const path = location.pathname.replace(/\/$/, '') || '/';
    const hash = location.hash || '';
    if (path === '/track') return 'track';
    if (path === '/dashboard' && hash === '#shipments') return 'shipments';
    if (path === '/dashboard' || path === '/portal') return 'account';
    if (path === '/' && hash === '#request') return 'quote';
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
