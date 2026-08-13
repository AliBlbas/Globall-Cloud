/* Globall Cloud — Enterprise UX v2
 * Progressive enhancement only. No auth, data, or API mutations.
 */
(() => {
  'use strict';
  if (window.__GC_ENTERPRISE_UX_V2__) return;
  window.__GC_ENTERPRISE_UX_V2__ = true;

  const STYLE_ID = 'gc-enterprise-ux-v2-style';
  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .gc-command-trigger{position:fixed;inset-inline-end:18px;bottom:calc(92px + env(safe-area-inset-bottom,0px));z-index:1200;display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid rgba(79,227,240,.28);border-radius:999px;background:rgba(7,18,35,.86);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 14px 40px rgba(0,0,0,.28);color:#f5f9fd;font:800 12px/1 system-ui,-apple-system,sans-serif;cursor:pointer}.gc-command-trigger span{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#4fe3f0;font-size:11px}.gc-command-palette{position:fixed;inset:0;z-index:1400;display:none}.gc-command-palette.is-open{display:block}.gc-cp-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}.gc-cp-shell{position:relative;width:min(720px,calc(100vw - 28px));margin:8vh auto 0;overflow:hidden;border:1px solid rgba(79,227,240,.2);border-radius:26px;background:linear-gradient(180deg,rgba(13,32,57,.98),rgba(6,20,40,.99));box-shadow:0 40px 120px rgba(0,0,0,.5);animation:gcCpIn .18s ease forwards}.gc-cp-head{display:flex;justify-content:space-between;align-items:center;padding:16px 18px 0}.gc-eyebrow{font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1.6px;color:#4fe3f0}.gc-cp-close{width:36px;height:36px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#9bb2d0;font-size:20px;cursor:pointer}.gc-cp-title{padding:12px 18px 10px;color:#f5f9fd;font-size:18px;font-weight:900}.gc-cp-search{display:block;width:calc(100% - 36px);margin:0 18px;padding:14px 16px;border:1px solid #214363;border-radius:16px;background:#07182b;color:#f5f9fd;outline:none;font:600 15px/1.4 system-ui,-apple-system,sans-serif}.gc-cp-search:focus{border-color:#4fe3f0;box-shadow:0 0 0 3px rgba(0,194,217,.12)}.gc-cp-list{padding:12px;max-height:min(52vh,460px);overflow:auto;-webkit-overflow-scrolling:touch}.gc-cp-item{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid transparent;border-radius:15px;background:transparent;color:#f5f9fd;text-align:start;font:700 14px/1.45 system-ui,-apple-system,sans-serif;cursor:pointer}.gc-cp-item:hover,.gc-cp-item.is-active{background:rgba(0,194,217,.08);border-color:rgba(79,227,240,.16)}.gc-cp-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:rgba(0,194,217,.1);color:#4fe3f0;font:700 13px ui-monospace,SFMono-Regular,Menlo,monospace;flex:0 0 auto}.gc-cp-empty{padding:28px 14px;text-align:center;color:#92aac7}.gc-cp-foot{display:flex;gap:14px;flex-wrap:wrap;padding:10px 18px 15px;color:#647fa3;font-size:11px;border-top:1px solid rgba(255,255,255,.05)}@keyframes gcCpIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@media(max-width:600px){.gc-command-trigger{inset-inline-end:12px;bottom:calc(88px + env(safe-area-inset-bottom,0px));padding:9px 10px}.gc-command-trigger b{display:none}.gc-cp-shell{margin:4vh auto 0;border-radius:22px}.gc-cp-list{max-height:56vh}.gc-cp-foot{display:none}}@media(prefers-reduced-motion:reduce){.gc-cp-shell{animation:none}}
    `;
    document.head?.appendChild(style);
  };

  const links = () => Array.from(document.querySelectorAll('a[href]'))
    .filter((a) => a.offsetParent !== null)
    .filter((a) => !a.href.startsWith('javascript:'));

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
    ensureStyle();
    addTrigger();
    const hasOps = document.querySelector('[data-open="quote"], #kShip, .rowitem, #shipments');
    document.documentElement.dataset.gcEnterprise = hasOps ? 'operations' : 'standard';
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe, { once: true });
  else observe();
})();
