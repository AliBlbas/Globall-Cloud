/* Load the canonical public redesign after legacy enhancement layers have finished. */
(() => {
  'use strict';
  const load = () => {
    document.querySelectorAll('link[data-gc-redesign-v2026]').forEach((node) => node.remove());
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/gc-redesign-v2026.css?v=20260927-1';
    link.dataset.gcRedesignV2026 = '1';
    document.head.appendChild(link);
  };
  const delayedLoad = () => window.setTimeout(load, 120);
  if (document.readyState === 'complete') delayedLoad();
  else window.addEventListener('load', delayedLoad, { once: true });
})();
