/* Globall Cloud — production branding repair + vNext boot bridge
   Repairs broken logo assets and loads the shared vNext experience layer
   without touching app state or business logic. */
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
  const loadVNext = () => {
    if (document.querySelector('[data-gc-vnext-loader]')) return;
    if (location.pathname.startsWith('/api/')) return;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/gc-platform-vnext.css?v=20260908-1';
    css.dataset.gcVnextLoader = '1';
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = '/gc-platform-vnext.js?v=20260908-1';
    script.defer = true;
    script.dataset.gcVnextLoader = '1';
    document.head.appendChild(script);
  };
  const scan = () => { document.querySelectorAll('img').forEach(repair); loadVNext(); };
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
    if (shouldBoot) loadVNext();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();