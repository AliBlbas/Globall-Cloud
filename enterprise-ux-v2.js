/* Globall Cloud — Enterprise UX v2
 * Progressive enhancement only. No auth, data, or API mutations.
 */
(() => {
  'use strict';
  if (window.__GC_ENTERPRISE_UX_V2__) return;
  window.__GC_ENTERPRISE_UX_V2__ = true;

  const links = () => Array.from(document.querySelectorAll('a[href]'))
    .filter((a) => a.offsetParent !== null)
    .filter((a) => !a.href.startsWith('javascript:'));

  const open = (title = 'Quick actions') => {
    let panel = document.getElementById('gc-command-palette');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'gc-command-palette';
      panel.className = 'gc-command-palette';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.innerHTML = '<div class="gc-cp-backdrop" data-gc-cp-close></div><div class="gc-cp-shell"><div class="gc-cp-head"><span class="gc-eyebrow">GLOBAL CLOUD</span><button class="gc-cp-close" type="button" data-gc-cp-close aria-label="Close">×</button></div><div class="gc-cp-title"></div><input class="gc-cp-search" type="search" placeholder="گەڕان لە بەشەکان و کردارەکان..." autocomplete="off"><div class="gc-cp-list" role="listbox"></div><div class="gc-cp-foot"><span>↑↓ بۆ هەڵبژاردن</span><span>Enter بۆ کردنەوە</span><span>Esc بۆ داخستن</span></div></div>';
      document.body.appendChild(panel);
      panel.addEventListener('click', (event) => {
        if (event.target.closest('[data-gc-cp-close]')) close();
        const item = event.target.closest('[data-gc-cp-href]');
        if (item) window.location.href = item.getAttribute('data-gc-cp-href');
      });
      panel.querySelector('.gc-cp-search').addEventListener('input', render);
      panel.querySelector('.gc-cp-search').addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
        if (event.key === 'Enter') panel.querySelector('[data-gc-cp-href]')?.click();
      });
    }
    panel.querySelector('.gc-cp-title').textContent = title;
    panel.classList.add('is-open');
    render();
    requestAnimationFrame(() => panel.querySelector('.gc-cp-search')?.focus());
  };
  const close = () => document.getElementById('gc-command-palette')?.classList.remove('is-open');
  const render = () => {
    const panel = document.getElementById('gc-command-palette');
    if (!panel) return;
    const query = panel.querySelector('.gc-cp-search').value.trim().toLowerCase();
    const seen = new Set();
    const items = links().map((a) => ({
      label: (a.textContent || '').replace(/\s+/g, ' ').trim(),
      href: a.href,
    })).filter((item) => item.label && !seen.has(item.href) && seen.add(item.href))
      .filter((item) => !query || item.label.toLowerCase().includes(query));
    panel.querySelector('.gc-cp-list').innerHTML = items.slice(0, 12).map((item, index) => `<button class="gc-cp-item${index === 0 ? ' is-active' : ''}" type="button" data-gc-cp-href="${item.href.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"><span class="gc-cp-icon">⌘</span><span>${item.label.replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</span></button>`).join('') || '<div class="gc-cp-empty">هیچ بەشێک نەدۆزرایەوە.</div>';
  };

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const panel = document.getElementById('gc-command-palette');
      if (panel?.classList.contains('is-open')) close(); else open();
    }
    if (event.key === 'Escape') close();
  });

  const addTrigger = () => {
    if (document.getElementById('gc-command-trigger')) return;
    const trigger = document.createElement('button');
    trigger.id = 'gc-command-trigger';
    trigger.className = 'gc-command-trigger';
    trigger.type = 'button';
    trigger.innerHTML = '<span>⌘K</span><b>گشتن</b>';
    trigger.title = 'Quick navigation';
    trigger.addEventListener('click', () => open());
    document.body.appendChild(trigger);
  };

  const observe = () => {
    if (!document.body) return;
    addTrigger();
    const hasOps = document.querySelector('[data-open="quote"], #kShip, .rowitem, #shipments');
    document.documentElement.dataset.gcEnterprise = hasOps ? 'operations' : 'standard';
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe, { once: true });
  else observe();
})();
