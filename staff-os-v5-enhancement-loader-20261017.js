(() => {
  'use strict';

  /*
   * Staff OS runtime loader — clean production profile.
   * Feature bridges extend the V5 console. Desktop keeps the existing sidebar;
   * mobile uses one five-action dock plus an accessible drawer for all modules.
   * Legacy visual shells and duplicate floating command layers remain excluded.
   */
  const enhancementStyles = [
    '/staff-os-premium-20260918.css?v=20260918-1'
  ];

  const enhancementScripts = [
    '/gc-staff-mobile-dock-20261016.js?v=6',
    '/staff-os-v5-shipment-create-fix.js?v=20260912-2',
    '/staff-os-v5-shipment-control-bridge.js?v=20260912-2',
    '/staff-os-data-health-panel.js?v=20260912-2',
    '/staff-os-v5-integrations.js?v=20260912-2',
    '/staff-os-v5-profile.js?v=20260912-2',
    '/staff-os-production-analytics-bridge.js?v=20260912-2',
    '/staff-os-v5-stability.js?v=20260912-2',
    '/staff-workflow-chain.js?v=20260912-2',
    '/staff-os-premium-20260918.js?v=20260918-1',
    '/gc-cargo-control-v1.js?v=20261016-1'
  ];

  const loadStyle = (href) => {
    let link = document.querySelector('link[data-gc-enhancement-style="' + href + '"]');
    if (link) {
      // Re-append existing styles so the final command-system layer wins the cascade.
      document.head.appendChild(link);
      return;
    }
    link = document.querySelector('link[href="' + href + '"]');
    if (link) {
      link.dataset.gcEnhancementStyle = href;
      document.head.appendChild(link);
      return;
    }
    link = document.createElement('link');
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
    loadStyle('/gc-staff-elite-20261014.css?v=3');
    // This scoped layer loads last so it can replace the old scrollable mobile
    // sidebar dock without changing desktop navigation or shipment actions.
    loadStyle('/gc-staff-mobile-dock-20261016.css?v=5');
    // Keep the known mobile integrity guard and command-system layer, then apply
    // the dedicated final repair after all legacy helpers have finished loading.
    loadStyle('/gc-ui-integrity-mobile-20261017.css?v=6');
    loadStyle('/gc-staff-command-system-20261017.css?v=2');
    loadStyle('/gc-staff-console-elite-20261018.css?v=5');
    loadStyle('/gc-staff-polish-mobile-20261019.css?v=6');
    loadStyle('/gc-staff-ui-refinement-20261019-v3.css?v=3');
    lockFinalStaffStylesLast();
  };

  // Several legacy helpers append their style sheets after the app shell mounts.
  // Keep the scoped Staff OS layer last in <head>, without duplicating any CSS.
  const lockFinalStaffStylesLast = () => {
    const href = '/gc-staff-ui-refinement-20261019-v3.css?v=3';
    const ensureLast = () => {
      const link = document.querySelector('link[data-gc-enhancement-style="' + href + '"]')
        || document.querySelector('link[href="' + href + '"]');
      if (link && link.parentNode === document.head && document.head.lastElementChild !== link) {
        document.head.appendChild(link);
      }
    };
    ensureLast();
    if (window.__gcStaffFinalCascadeObserver) return;
    const observer = new MutationObserver((records) => {
      const addedStyles = records.some((record) => [...record.addedNodes].some((node) =>
        node.nodeType === 1 && (
          node.matches?.('link[rel="stylesheet"],style')
          || node.querySelector?.('link[rel="stylesheet"],style')
        )
      ));
      if (addedStyles) ensureLast();
    });
    observer.observe(document.head, { childList: true, subtree: true });
    window.__gcStaffFinalCascadeObserver = observer;
  };

  const waitForShell = () => {
    const stopObserver = () => {
      const observer = window.__gcStaffShellWaitObserver;
      if (observer) {
        observer.disconnect();
        window.__gcStaffShellWaitObserver = null;
      }
    };

    let loadScheduled = false;
    const attemptLoad = () => {
      if (window.__gcStaffEnhancementsLoaded) {
        stopObserver();
        return true;
      }
      if (!document.querySelector('.gc-shell') || loadScheduled) return false;

      loadScheduled = true;
      setTimeout(async () => {
        loadScheduled = false;
        try {
          await loadEnhancements();
        } catch (error) {
          console.error('[gc-staff-loader] enhancement load failed', error);
        }
        if (window.__gcStaffEnhancementsLoaded) stopObserver();
        else attemptLoad();
      }, 250);
      return true;
    };

    // The staff shell is created only after successful authentication. Observe
    // the app instead of stopping after 12 seconds while the login screen is open.
    const target = document.getElementById('app') || document.body || document.documentElement;
    if (!target) return;
    const observer = new MutationObserver(() => { attemptLoad(); });
    window.__gcStaffShellWaitObserver = observer;
    observer.observe(target, { childList: true, subtree: true });
    attemptLoad();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForShell, { once: true });
  } else {
    waitForShell();
  }
})();