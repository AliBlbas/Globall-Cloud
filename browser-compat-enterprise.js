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
  const injectCustomerPortalPolish = () => {
    if (!document.getElementById('gc-customer-portal-polish')) {
      const style = document.createElement('style');
      style.id = 'gc-customer-portal-polish';
      style.textContent = `
        body:has(#shipKpi){overflow-x:hidden} body:has(#shipKpi) .card{min-width:0} body:has(#shipKpi) .row>*{min-width:0;overflow-wrap:anywhere}
        body:has(#shipKpi) .hero h1{letter-spacing:-.035em;line-height:1.12} body:has(#shipKpi) .hero p{line-height:1.9}
        @media(max-width:680px){body:has(#shipKpi) .grid,body:has(#shipKpi) .grid3{grid-template-columns:minmax(0,1fr)!important}body:has(#shipKpi) .topin{min-height:66px}body:has(#shipKpi) #auth .box{max-height:calc(100dvh - 28px);overflow:auto;-webkit-overflow-scrolling:touch}}
        @media(max-width:430px){body:has(#shipKpi) .wrap{padding-inline:12px}body:has(#shipKpi) .hero h1{font-size:28px!important}body:has(#shipKpi) .btn{min-height:46px}}
      `;
      document.head?.appendChild(style);
    }
  };
  const injectOperationsPolish = () => {
    if (!document.getElementById('gc-operations-polish')) {
      const style = document.createElement('style');
      style.id = 'gc-operations-polish';
      style.textContent = `
        body:has(#kShip){overflow-x:hidden}
        body:has(#kShip) .card,body:has(#kShip) .hero-card,body:has(#kShip) .identity{min-width:0}
        body:has(#kShip) h1,body:has(#kShip) h2,body:has(#kShip) h3,body:has(#kShip) p,body:has(#kShip) span,body:has(#kShip) button,body:has(#kShip) label,body:has(#kShip) small{writing-mode:horizontal-tb!important;word-break:normal!important;overflow-wrap:anywhere}
        body:has(#kShip) .kpi{transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
        body:has(#kShip) .kpi:focus-within,body:has(#kShip) .feature:focus-within,body:has(#kShip) .rowitem:focus-within{border-color:rgba(88,229,239,.42);box-shadow:0 0 0 3px rgba(0,194,217,.10)}
        body:has(#kShip) .btn{writing-mode:horizontal-tb!important;white-space:normal!important;min-width:0;max-width:100%;line-height:1.35;text-align:center}
        @media(max-width:1050px){body:has(#kShip) .grid4{grid-template-columns:repeat(2,minmax(0,1fr))}body:has(#kShip) .grid3{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:680px){body:has(#kShip) .wrap{padding-inline:12px}body:has(#kShip) .hero{grid-template-columns:1fr!important}body:has(#kShip) .grid4,body:has(#kShip) .grid3{grid-template-columns:minmax(0,1fr)!important}body:has(#kShip) .section-head{align-items:stretch;flex-direction:column}body:has(#kShip) .toolbar{width:100%}body:has(#kShip) .mini{max-width:none;width:100%}body:has(#kShip) .rowitem{grid-template-columns:minmax(0,1fr)!important;gap:7px}body:has(#kShip) .modal{padding:12px}body:has(#kShip) .modalbox{max-height:calc(100dvh - 24px - env(safe-area-inset-bottom));border-radius:20px;padding:16px}}
        @media(max-width:430px){body:has(#kShip) h1{font-size:31px!important}body:has(#kShip) .hero-card,body:has(#kShip) .identity,body:has(#kShip) .card{padding:15px}body:has(#kShip) .btn{min-height:46px}body:has(#kShip) .toast{left:12px;right:12px;max-width:none}}
        @media(prefers-reduced-motion:reduce){body:has(#kShip) .kpi{transition:none}}
      `;
      document.head?.appendChild(style);
    }
  };
  const injectMobileStyles = () => {
    injectStyle('/admin-webkit-polish.css?v=20260813', 'admin-webkit');
    injectStyle('/mobile-elite-v3.css?v=20260813', 'mobile-elite');
    injectStyle('/enterprise-ui-v1.css?v=20260813', 'enterprise-ui-v1');
    injectCustomerPortalPolish();
    injectOperationsPolish();
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
