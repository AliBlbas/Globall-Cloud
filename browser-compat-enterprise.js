/* Globall Cloud — cross-browser runtime bridge
 * Keeps viewport metrics stable on Safari/WebKit and replaces broken logo assets
 * without touching authentication, API, or business logic.
 */
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
    root.dataset.gcBrowser = /AppleWebKit/i.test(navigator.userAgent) && !/Chrome|CriOS|EdgiOS|FxiOS/i.test(navigator.userAgent)
      ? 'safari'
      : 'chromium-or-other';
  };

  const repairLogo = (img) => {
    if (!img || img.dataset.gcLogoRepair === '1') return;
    const raw = String(img.getAttribute('src') || '').toLowerCase();
    const looksLikeLogo = raw.includes('logo-icon') || raw.includes('logo.') || img.classList.contains('brand-logo') || img.classList.contains('logo');
    if (!looksLikeLogo) return;
    img.dataset.gcLogoRepair = '1';
    img.addEventListener('error', () => {
      if (img.dataset.gcLogoFallback === '1') return;
      img.dataset.gcLogoFallback = '1';
      img.src = '/logo-fallback.svg';
      img.removeAttribute('srcset');
    }, { once: true });
  };

  const scanImages = () => document.querySelectorAll('img').forEach(repairLogo);

  setViewport();
  window.addEventListener('resize', setViewport, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(setViewport, 50), { passive: true });
  window.visualViewport?.addEventListener('resize', setViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', setViewport, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanImages, { once: true });
  } else {
    scanImages();
  }

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('img')) repairLogo(node);
        node.querySelectorAll?.('img').forEach(repairLogo);
      });
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
