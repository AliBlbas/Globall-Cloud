/* Globall Cloud — production branding repair + vNext boot bridge + runtime safety
   Repairs broken logo assets, loads the shared vNext layer, and mounts safe UI guards. */
(() => {
  'use strict';
  const FALLBACKS = ['/logo-icon.svg','/logo-icon-original.png'];
  const repaired = new WeakSet();
  const isLogo = (img) => {
    const src = String(img.getAttribute('src') || '').toLowerCase();
    const alt = String(img.getAttribute('alt') || '').toLowerCase();
    const cls = String(img.className || '').toLowerCase();
    return src.includes('logo') || alt.includes('globall cloud') || cls.includes('brand-logo') || cls === 'logo' || cls.includes(' logo');
  };
  const repair = (img) => {
    if (!img || repaired.has(img) || !isLogo(img)) return;
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
  const loadAsset = (item) => {
    if (document.querySelector(`[${item.attr}]`)) return;
    const node = document.createElement(item.tag);
    if (item.rel) node.rel = item.rel;
    if (item.href) node.href = item.href;
    if (item.src) {
      node.src = item.src;
      node.defer = true;
    }
    node.setAttribute(item.attr, '1');
    document.head.appendChild(node);
  };
  const loadVNext = () => {
    if (document.querySelector('[data-gc-vnext-loader]')) return;
    if (location.pathname.startsWith('/api/')) return;
    const assets = [
      { tag:'link', rel:'stylesheet', href:'/gc-platform-vnext.css?v=20260908-1', attr:'data-gc-vnext-loader' },
      { tag:'link', rel:'stylesheet', href:'/gc-platform-vnext-plus.css?v=20260908-1', attr:'data-gc-vnext-plus-css' },
      { tag:'script', src:'/gc-platform-vnext.js?v=20260908-1', attr:'data-gc-vnext-loader' },
      { tag:'script', src:'/gc-platform-vnext-plus.js?v=20260908-1', attr:'data-gc-vnext-plus-loader' },
      { tag:'script', src:'/gc-runtime-safety-v2026.js?v=20260908-1', attr:'data-gc-runtime-safety-loader' },
    ];
    assets.forEach(loadAsset);
  };
  const loadPublicSafety = () => loadAsset({ tag:'script', src:'/public-production-safety.js?v=20260908-1', attr:'data-gc-public-production-safety' });
  const loadStaffMobile = () => {
    if (!/^\/staff(?:-os)?(?:\.html)?\/?$/i.test(location.pathname)) return;
    loadAsset({ tag:'link', rel:'stylesheet', href:'/staff-mobile-command-dock.css?v=20260908-1', attr:'data-gc-staff-mobile-css' });
    loadAsset({ tag:'script', src:'/staff-mobile-command-dock.js?v=20260908-1', attr:'data-gc-staff-mobile-js' });
  };
  const scan = () => {
    document.querySelectorAll('img').forEach(repair);
    loadPublicSafety();
    loadStaffMobile();
    loadVNext();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, { once: true });
  else scan();
  new MutationObserver((mutations) => {
    let shouldBoot = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('img')) repair(node);
        node.querySelectorAll?.('img').forEach(repair);
        shouldBoot = true;
      }
    }
    if (shouldBoot) {
      loadPublicSafety();
      loadStaffMobile();
      loadVNext();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
