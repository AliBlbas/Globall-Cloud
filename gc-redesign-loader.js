/* Load the canonical public redesign after legacy enhancement layers have finished. */
(() => {
  'use strict';
  const load = () => {
    document.querySelectorAll('link[data-gc-redesign-v2026]').forEach((node) => node.remove());
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/gc-redesign-v2026.css?v=20260927-3';
    link.dataset.gcRedesignV2026 = '1';
    document.head.appendChild(link);
    const clean = document.createElement('link');
    clean.rel = 'stylesheet';
    clean.href = '/gc-live-clean-v1.css?v=20260928-1';
    clean.dataset.gcLiveClean = '1';
    document.head.appendChild(clean);
  };
  const delayedLoad = () => window.setTimeout(load, 120);
  if (document.readyState === 'complete') delayedLoad();
  else window.addEventListener('load', delayedLoad, { once: true });
})();
