/* Globall Cloud — final public experience layer 2026
 * UX hardening only: no credentials, auth, or business data access.
 */
(() => {
  'use strict';
  if (window.__gcFinalExperience2026) return;
  window.__gcFinalExperience2026 = true;

  const isHome = () => Boolean(document.querySelector('.gc-app'));
  const menu = () => document.querySelector('[data-gc-mobile-menu]');
  const menuButton = () => document.querySelector('[data-gc-menu]');

  const setMenu = (open) => {
    const panel = menu();
    const button = menuButton();
    if (!panel || !button) return;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'داخستنی مینیو' : 'کردنەوەی مینیو');
    document.body.classList.toggle('gc-menu-open', open);
  };

  const installMenuHardening = () => {
    const panel = menu();
    const button = menuButton();
    if (!panel || !button || button.dataset.gcFinalBound) return;
    button.dataset.gcFinalBound = '1';
    button.setAttribute('aria-expanded', 'false');

    button.addEventListener('click', (event) => {
      event.preventDefault();
      setMenu(Boolean(panel.hidden));
    });

    panel.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (link) setMenu(false);
    });

    document.addEventListener('click', (event) => {
      if (panel.hidden) return;
      if (panel.contains(event.target) || button.contains(event.target)) return;
      setMenu(false);
    }, { passive: true });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setMenu(false);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) setMenu(false);
    }, { passive: true });
  };

  const installSafeCopy = () => {
    const statItems = document.querySelectorAll('.gc-stats > div');
    if (statItems.length >= 4) {
      const safeStats = [
        ['03', 'شێوازی گواستنەوە'],
        ['04', 'قۆناغی زنجیرەی بار'],
        ['GC', 'سیستەمی شوێنکەوتن'],
        ['RLS', 'پاراستنی داتا و دەسەڵات'],
      ];
      statItems.forEach((item, index) => {
        const pair = safeStats[index];
        if (!pair) return;
        const value = item.querySelector('strong');
        const label = item.querySelector('span');
        if (value) value.textContent = pair[0];
        if (label) label.textContent = pair[1];
      });
    }

    document.querySelectorAll('.gc-route-status').forEach((node) => {
      const text = node.textContent || '';
      if (/Shipment network online/i.test(text)) {
        node.innerHTML = '<span class="gc-status-dot"></span> GC route plan · China → UAE → Erbil';
      }
    });

    document.querySelectorAll('[href*="wa.me"]').forEach((link) => {
      if (link.target === '_blank') link.rel = 'noopener noreferrer';
    });
  };

  const installA11y = () => {
    const main = document.getElementById('gcMain');
    const nav = document.querySelector('.gc-nav');
    if (!main || !nav || document.getElementById('gcSkipLink')) return;
    const skip = document.createElement('a');
    skip.id = 'gcSkipLink';
    skip.href = '#gcMain';
    skip.textContent = 'بڕۆ بۆ ناوەڕۆک';
    skip.setAttribute('aria-label', 'بڕۆ بۆ ناوەڕۆکی سەرەکی');
    document.body.prepend(skip);
  };

  const installMicroStyle = () => {
    if (document.getElementById('gcFinalExperienceStyle')) return;
    const style = document.createElement('style');
    style.id = 'gcFinalExperienceStyle';
    style.textContent = `
      #gcSkipLink{position:fixed;inset-inline-start:12px;top:8px;z-index:99999;transform:translateY(-150%);padding:8px 12px;border:1px solid rgba(79,227,240,.4);border-radius:10px;background:#071827;color:#f7fbff;font:800 12px Vazirmatn,system-ui,sans-serif;text-decoration:none;transition:transform .15s ease}
      #gcSkipLink:focus{transform:translateY(0);outline:2px solid #4fe3f0;outline-offset:2px}
      body.gc-menu-open{overflow:hidden}
      .gc-mobile-menu{overscroll-behavior:contain}
      .gc-btn:focus-visible,.gc-mobile-menu a:focus-visible,.gc-menu:focus-visible{outline:2px solid #4fe3f0!important;outline-offset:2px!important}
    `;
    document.head.appendChild(style);
  };

  const boot = () => {
    if (!isHome()) return;
    installMicroStyle();
    installA11y();
    installMenuHardening();
    installSafeCopy();
    window.setTimeout(installMenuHardening, 600);
    window.setTimeout(installSafeCopy, 600);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
