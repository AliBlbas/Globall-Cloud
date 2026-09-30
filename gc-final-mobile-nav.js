/* Globall Cloud — final mobile navigation controller
 * Normalizes the public mobile dock after any late runtime rewrite.
 * Presentation/navigation only; no backend or auth changes.
 */
(() => {
  'use strict';

  const ITEMS = [
    {
      key:'home',
      href:'/',
      label:'سەرەکی',
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"></path></svg>'
    },
    {
      key:'services',
      href:'/#services',
      label:'خزمەتگوزاری',
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5z"></path><path d="M9 9h6M9 13h6M9 17h3"></path></svg>'
    },
    {
      key:'quote',
      href:'/#request',
      label:'داواکردنی نرخ',
      primary:true,
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16"></path></svg>'
    },
    {
      key:'track',
      href:'/track',
      label:'شوێنکەوتن',
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4M8.5 11h5"></path></svg>'
    },
    {
      key:'account',
      href:'/dashboard#profile',
      label:'هەژمار',
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"></circle><path d="M5 20c.8-3.3 3.2-5 7-5s6.2 1.7 7 5"></path></svg>'
    }
  ];

  let syncing = false;
  let scheduled = false;

  const routeKey = () => {
    const path = location.pathname.replace(/\/$/, '') || '/';
    const hash = location.hash || '';
    if (path === '/track') return 'track';
    if (path === '/dashboard' || path === '/portal') return 'account';
    if (path === '/' && hash === '#request') return 'quote';
    if (path === '/' && hash === '#services') return 'services';
    return 'home';
  };

  const normalize = () => {
    if (syncing) return;
    const dock = document.querySelector('.gc-mobile-dock-v3');
    if (!dock) return;

    syncing = true;
    try {
      const existing = [...dock.querySelectorAll('a')].slice(0, 5);
      const byKey = new Map();

      existing.forEach((a) => {
        const raw = [
          a.dataset.dock,
          a.getAttribute('href') || '',
          a.textContent || ''
        ].join(' ').toLowerCase();

        let key = null;
        if (raw.includes('track') || raw.includes('شوێنکەوتن')) key = 'track';
        else if (raw.includes('request') || raw.includes('quote') || raw.includes('نرخ')) key = 'quote';
        else if (raw.includes('service') || raw.includes('خزمەتگوزاری')) key = 'services';
        else if (raw.includes('dashboard') || raw.includes('profile') || raw.includes('contact') || raw.includes('هەژمار') || raw.includes('ڕێکخستن')) key = 'account';
        else if (raw.includes('home') || raw === '/' || raw.includes('سەرەکی')) key = 'home';

        if (key && !byKey.has(key)) byKey.set(key, a);
      });

      ITEMS.forEach((def) => {
        if (!byKey.has(def.key)) {
          const candidate = existing.find((a) => ![...byKey.values()].includes(a));
          if (candidate) byKey.set(def.key, candidate);
        }
      });

      const ordered = [];
      ITEMS.forEach((def) => {
        const item = byKey.get(def.key);
        if (!item) return;
        ordered.push(item);
        item.dataset.dock = def.key;
        item.href = def.href;
        item.setAttribute('aria-label', def.label);
        item.classList.toggle('primary', Boolean(def.primary));
        item.innerHTML = '<span class="gc-icon" aria-hidden="true">' + def.icon + '</span><span class="gc-dock-label">' + def.label + '</span>';
      });

      ordered.forEach((item) => dock.appendChild(item));

      const activeKey = routeKey();
      ordered.forEach((item) => {
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
