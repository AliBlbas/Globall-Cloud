/* Globall Cloud — production branding repair + platform boot + device UX */
(() => {
  'use strict';
  const FALLBACKS = ['/logo-icon.svg', '/logo-icon-original.png'];
  const repaired = new WeakSet();
  const isOperational = () => /^\/(staff(?:-os)?|warehouse(?:-os)?|superadmin|super-admin-command-center|operations(?:-[a-z0-9-]+)?|accounts-console|management)(?:\.html)?\/?$/i.test(location.pathname);
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
    if (item.src) { node.src = item.src; node.defer = true; }
    node.setAttribute(item.attr, '1');
    document.head.appendChild(node);
  };
  const boot = () => {
    if (location.pathname.startsWith('/api/')) return;
    loadAsset({tag:'link', rel:'stylesheet', href:'/gc-platform-vnext.css?v=20260908-1', attr:'data-gc-vnext-css'});
    loadAsset({tag:'link', rel:'stylesheet', href:'/gc-platform-vnext-plus.css?v=20260908-1', attr:'data-gc-vnext-plus-css'});
    loadAsset({tag:'link', rel:'stylesheet', href:'/mobile-premium-responsive-v2026.css?v=20260908-1', attr:'data-gc-mobile-premium'});
    if (!isOperational()) {
      loadAsset({tag:'link', rel:'stylesheet', href:'/gc-public-mobile-system-v2026.css?v=20260908-1', attr:'data-gc-public-mobile-system'});
      loadAsset({tag:'script', src:'/gc-public-mobile-system-v2026.js?v=20260908-1', attr:'data-gc-public-mobile-system-js'});
    }
    loadAsset({tag:'script', src:'/gc-platform-vnext.js?v=20260908-1', attr:'data-gc-vnext-loader'});
    loadAsset({tag:'script', src:'/gc-platform-vnext-plus.js?v=20260908-1', attr:'data-gc-vnext-plus-loader'});
    loadAsset({tag:'script', src:'/gc-runtime-safety-v2026.js?v=20260908-1', attr:'data-gc-runtime-safety-loader'});
    loadAsset({tag:'script', src:'/public-production-safety.js?v=20260908-1', attr:'data-gc-public-production-safety'});
    if (/^\/staff(?:-os)?(?:\.html)?\/?$/i.test(location.pathname)) {
      loadAsset({tag:'link', rel:'stylesheet', href:'/staff-mobile-command-dock.css?v=20260908-1', attr:'data-gc-staff-mobile-css'});
      loadAsset({tag:'script', src:'/staff-mobile-command-dock.js?v=20260908-1', attr:'data-gc-staff-mobile-js'});
      loadAsset({tag:'link', rel:'stylesheet', href:'/staff-premium-mobile-20260909.css?v=20260911-1', attr:'data-gc-staff-premium-mobile'});
    }
  };
  const scan = () => { document.querySelectorAll('img').forEach(repair); boot(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, {once:true}); else scan();
  new MutationObserver((mutations) => {
    let changed = false;
    for (const mutation of mutations) for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches?.('img')) repair(node);
      node.querySelectorAll?.('img').forEach(repair);
      changed = true;
    }
    if (changed) boot();
  }).observe(document.documentElement, {childList:true, subtree:true});
})();
