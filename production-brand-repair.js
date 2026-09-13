/* Globall Cloud — stable production boot */
(() => {
  'use strict';

  const PATH = window.location.pathname;
  const IS_API = PATH.startsWith('/api/');
  const IS_STAFF = /^\/(?:staff|staff-os)(?:\.html)?\/?$/i.test(PATH);
  const IS_OPERATIONAL = /^\/(?:staff(?:-os)?|warehouse(?:-os)?|superadmin|super-admin-command-center|operations(?:-[a-z0-9-]+)?|accounts-console|management)(?:\.html)?\/?$/i.test(PATH);
  const FALLBACKS = ['/logo-icon.svg', '/logo-icon-original.png'];
  const repaired = new WeakSet();
  let booted = false;

  const loadAsset = ({ tag = 'script', src, href, attr, defer = true }) => {
    if (!attr || document.querySelector(`[${attr}]`)) return;
    const node = document.createElement(tag);
    if (src) node.src = src;
    if (href) node.href = href;
    if (tag === 'link') node.rel = 'stylesheet';
    node.setAttribute(attr, '1');
    if (tag === 'script') node.defer = defer;
    document.head.appendChild(node);
  };

  const repairLogo = (img) => {
    if (!img || repaired.has(img)) return;
    const text = `${img.getAttribute('src') || ''} ${img.getAttribute('alt') || ''} ${img.className || ''}`.toLowerCase();
    if (!text.includes('logo') && !text.includes('globall cloud')) return;
    repaired.add(img);
    let index = 0;
    const next = () => {
      if (index >= FALLBACKS.length) return;
      const candidate = FALLBACKS[index++];
      if (img.src.endsWith(candidate)) return;
      img.onerror = next;
      img.removeAttribute('srcset');
      img.src = candidate;
    };
    if (img.complete && img.naturalWidth === 0) next();
    else img.addEventListener('error', next, { once: true });
  };

  const repairLogos = () => document.querySelectorAll('img').forEach(repairLogo);

  const boot = () => {
    if (IS_API || booted) return;
    booted = true;

    // Public pages use the native renderer. Historical VNext overlays and
    // mobile-system docks were creating duplicate UI and visual collisions.
    if (!IS_OPERATIONAL) {
      loadAsset({tag: 'link', href: '/mobile-premium-responsive-v2026.css?v=20260913-4', attr: 'data-gc-mobile-premium'});
      loadAsset({tag: 'script', src: '/public-core-recovery.js?v=20260913-4', attr: 'data-gc-public-core-recovery'});
      loadAsset({tag: 'script', src: '/public-production-safety.js?v=20260913-4', attr: 'data-gc-public-production-safety'});
    }

    if (IS_STAFF) {
      loadAsset({tag: 'link', href: '/staff-mobile-command-dock.css?v=20260913-4', attr: 'data-gc-staff-mobile-css'});
      loadAsset({tag: 'script', src: '/staff-mobile-command-dock.js?v=20260913-4', attr: 'data-gc-staff-mobile-js'});
      loadAsset({tag: 'link', href: '/staff-premium-mobile-20260909.css?v=20260913-4', attr: 'data-gc-staff-premium-mobile'});
    }

    if (IS_OPERATIONAL) {
      loadAsset({tag: 'script', src: '/gc-runtime-safety-v2026.js?v=20260913-4', attr: 'data-gc-runtime-safety'});
    }

    repairLogos();
  };

  const start = () => {
    boot();
    repairLogos();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  new MutationObserver((mutations) => {
    let changed = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('img')) repairLogo(node);
        node.querySelectorAll?.('img').forEach(repairLogo);
        changed = true;
      }
    }
    if (changed) repairLogos();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
