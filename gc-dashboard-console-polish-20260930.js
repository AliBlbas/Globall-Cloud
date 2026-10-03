/* Globall Cloud — clear console navigation labels, no behavior changes. */
(() => {
  'use strict';
  const icons = {
    dashboard:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    customers:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 11a2.5 2.5 0 1 0 0-5M16 14a4.5 4.5 0 0 1 4.5 6"/></svg>',
    staff:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.5-3 7.6-7 10-4-2.4-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
    receipts:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16l-3-2-4 2-4-2-3 2V4Z"/><path d="M8 8h8M8 12h6"/></svg>',
    logs:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    quote:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>'
  };
  const boot = () => document.querySelectorAll('#consoleTabs .tab[data-tab]').forEach((button) => {
    if (button.dataset.gcPolished === '1') return;
    const key = button.dataset.tab;
    if (!icons[key]) return;
    button.dataset.gcPolished = '1';
    const span = document.createElement('span');
    span.className = 'gc-console-tab-icon';
    span.innerHTML = icons[key];
    span.setAttribute('aria-hidden','true');
    button.prepend(span);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
  new MutationObserver(boot).observe(document.documentElement, {childList:true,subtree:true});
})();
