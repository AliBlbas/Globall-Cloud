(() => {
  'use strict';

  /*
   * Staff OS runtime loader — clean production profile.
   * Only feature bridges that extend the V5 console are loaded here.
   * Legacy visual shells, duplicate mobile docks and floating command layers
   * are intentionally excluded so one navigation shell remains authoritative.
   */
  const enhancementStyles = [
    '/staff-os-premium-20260918.css?v=20260918-1'
  ];

  const enhancementScripts = [
    '/staff-os-v5-shipment-create-fix.js?v=20260912-2',
    '/staff-os-v5-shipment-control-bridge.js?v=20260912-2',
    '/staff-os-data-health-panel.js?v=20260912-2',
    '/staff-os-v5-integrations.js?v=20260912-2',
    '/staff-os-v5-profile.js?v=20260912-2',
    '/staff-os-production-analytics-bridge.js?v=20260912-2',
    '/staff-os-v5-stability.js?v=20260912-2',
    '/staff-workflow-chain.js?v=20260912-2',
    '/staff-os-premium-20260918.js?v=20260918-1'
  ];

  const loadStyle = (href) => {
    if (document.querySelector('link[data-gc-enhancement-style="' + href + '"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.gcEnhancementStyle = href;
    document.head.appendChild(link);
  };

  const loadOne = (src) => new Promise((resolve) => {
    if (document.querySelector('script[data-gc-enhancement-script="' + src + '"]')) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.defer = false;
    script.dataset.gcEnhancementScript = src;
    script.onload = resolve;
    script.onerror = resolve;
    document.body.appendChild(script);
  });

  const loadEnhancements = async () => {
    if (window.__gcStaffEnhancementsLoaded) return;
    if (!document.querySelector('.gc-shell')) return;
    window.__gcStaffEnhancementsLoaded = true;
    enhancementStyles.forEach(loadStyle);
    for (const src of enhancementScripts) await loadOne(src);
    loadStyle('/gc-final-ui-20260927.css?v=4');
  };

  const waitForShell = () => {
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      if (document.querySelector('.gc-shell')) {
        clearInterval(timer);
        setTimeout(loadEnhancements, 250);
      } else if (tries >= 120) {
        clearInterval(timer);
      }
    }, 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForShell, { once: true });
  } else {
    waitForShell();
  }
})();