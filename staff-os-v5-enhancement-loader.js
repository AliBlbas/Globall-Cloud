(() => {
  'use strict';

  const enhancementScripts = [
    '/staff-os-v5-shipment-create-fix.js?v=20260912-2',
    '/staff-os-v5-shipment-control-bridge.js?v=20260912-2',
    '/staff-os-data-health-panel.js?v=20260912-2',
    '/staff-os-v5-integrations.js?v=20260912-2',
    '/staff-os-v5-profile.js?v=20260912-2',
    '/staff-os-production-analytics-bridge.js?v=20260912-2',
    '/staff-os-v5-stability.js?v=20260912-2',
    '/staff-logistics-intelligence.js?v=20260912-2',
    '/staff-os-v2-compat.js?v=20260912-2',
    '/staff-mobile-command-dock.js?v=20260912-2',
    '/staff-os-pro-20260909.js?v=20260912-2',
    '/staff-shell-polish-20260909.js?v=20260912-2',
    '/staff-premium-mobile-20260909.js?v=20260912-2',
    '/staff-workflow-chain.js?v=20260912-2'
  ];

  const loadOne = (src) => new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.defer = false;
    s.onload = resolve;
    s.onerror = resolve;
    document.body.appendChild(s);
  });

  const loadEnhancements = async () => {
    if (window.__gcStaffEnhancementsLoaded) return;
    if (!document.querySelector('.gc-shell')) return;
    window.__gcStaffEnhancementsLoaded = true;
    for (const src of enhancementScripts) await loadOne(src);
  };

  const waitForShell = () => {
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      if (document.querySelector('.gc-shell')) {
        clearInterval(timer);
        setTimeout(loadEnhancements, 350);
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
