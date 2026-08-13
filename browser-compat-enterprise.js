/* Globall Cloud — cross-browser enterprise bridge */
(() => {
  'use strict';
  const root = document.documentElement;
  const setViewport = () => {
    const vv = window.visualViewport;
    const height = vv?.height || window.innerHeight || 0;
    const width = vv?.width || window.innerWidth || 0;
    root.style.setProperty('--gc-vh', `${height * 0.01}px`);
    root.style.setProperty('--gc-vw', `${width * 0.01}px`);
    root.style.setProperty('--gc-safe-bottom', 'env(safe-area-inset-bottom, 0px)');
    root.dataset.gcBrowser = /AppleWebKit/i.test(navigator.userAgent) && !/Chrome|CriOS|EdgiOS|FxiOS/i.test(navigator.userAgent) ? 'safari' : 'chromium-or-other';
  };
  const fallbackSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect x="3" y="3" width="90" height="90" rx="24" fill="#071326" stroke="#2f79b2" stroke-width="3"/><path d="M25 39 47 26l24 12-22 14-24-13Z" fill="#0d3150" stroke="#55e5f0" stroke-width="3"/><path d="M25 39v24l23 15 23-14V38" fill="none" stroke="#00bfd8" stroke-width="3"/><path d="m48 52 0 26" stroke="#7cf3fa" stroke-width="3" stroke-linecap="round"/><circle cx="73" cy="21" r="7" fill="#ffc768"/><path d="M70 21h6M73 18v6" stroke="#071326" stroke-width="2" stroke-linecap="round"/></svg>';
  const fallbackSrc = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fallbackSvg)}`;
  const repairLogo = (img) => {
    if (!img || img.dataset.gcLogoRepair === '1') return;
    const raw = String(img.getAttribute('src') || '').toLowerCase();
    const looksLikeLogo = raw.includes('logo-icon') || raw.includes('logo.') || img.classList.contains('brand-logo') || img.classList.contains('logo');
    if (!looksLikeLogo) return;
    img.dataset.gcLogoRepair = '1';
    const useFallback = () => {
      if (img.dataset.gcLogoFallback === '1') return;
      img.dataset.gcLogoFallback = '1';
      img.removeAttribute('srcset');
      img.src = fallbackSrc;
    };
    if (img.complete && img.naturalWidth === 0) useFallback(); else img.addEventListener('error', useFallback, { once: true });
  };
  const scanImages = () => document.querySelectorAll('img').forEach(repairLogo);
  const injectStyle = (href, marker) => {
    if (document.querySelector(`link[data-gc-runtime-style="${marker}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href; link.dataset.gcRuntimeStyle = marker;
    document.head?.appendChild(link);
  };
  const injectMobileStyles = () => {
    injectStyle('/admin-webkit-polish.css?v=20260813', 'admin-webkit');
    injectStyle('/mobile-elite-v3.css?v=20260813', 'mobile-elite');
  };
  setViewport();
  window.addEventListener('resize', setViewport, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(setViewport, 50), { passive: true });
  window.visualViewport?.addEventListener('resize', setViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', setViewport, { passive: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { scanImages(); injectMobileStyles(); }, { once: true }); else { scanImages(); injectMobileStyles(); }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches?.('img')) repairLogo(node);
      node.querySelectorAll?.('img').forEach(repairLogo);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
