/* Globall Cloud Staff OS — authenticated blank-screen recovery, 2026-11-07 */
(() => {
  'use strict';
  const marker = 'gc-staff-blank-screen-fix-20261107';
  if (document.documentElement.dataset.gcBlankScreenFix === marker) return;
  document.documentElement.dataset.gcBlankScreenFix = marker;
  const shell = () => document.querySelector('#app .gc-shell');
  const ensureView = () => {
    const main = document.querySelector('#app .gc-main');
    if (!main) return null;
    let view = document.querySelector('#app #view');
    if (!view) {
      view = document.createElement('section');
      view.id = 'view';
      view.className = 'view';
      main.appendChild(view);
    }
    view.hidden = false;
    view.removeAttribute('aria-hidden');
    view.style.removeProperty('display');
    return view;
  };
  const retry = (view) => {
    view.innerHTML = '<div class="gc-blank-state">کۆنسۆڵەکە نوێ دەکرێتەوە…</div>';
    const tab = new URLSearchParams(location.search).get('tab') || 'overview';
    if (typeof window.gcStaffLoadTab === 'function') {
      Promise.resolve(window.gcStaffLoadTab(tab, true)).catch(() => renderError(view));
    } else location.reload();
  };
  const renderError = (view, message = 'داتاکان بە دروستی بار نەبوون.') => {
    if (!view) return;
    view.innerHTML = `<div class="gc-blank-state"><div><strong>${message}</strong><br><small>پەیوەندی و session ـی ستاف دەپشکنرێت.</small><br><button type="button" data-gc-blank-retry>↻ دووبارە هەوڵدان</button></div></div>`;
    view.querySelector('[data-gc-blank-retry]')?.addEventListener('click', () => retry(view), { once: true });
  };
  const renderLoading = () => {
    const view = ensureView();
    if (view && !view.children.length) view.innerHTML = '<div class="gc-blank-state">کۆنسۆڵەکە لە بارکردنی داتاکانە…</div>';
    return view;
  };
  const check = () => {
    if (!shell()) return;
    const view = renderLoading();
    if (!view) return;
    const text = String(view.textContent || '').replace(/\s+/g, ' ').trim();
    if (!view.children.length || text.length < 8) renderError(view);
  };
  const start = () => {
    check();
    window.setTimeout(() => {
      const view = ensureView();
      if (shell() && view && !String(view.textContent || '').replace(/\s+/g, ' ').trim()) renderError(view);
    }, 6500);
    const observer = new MutationObserver(() => {
      if (shell()) {
        const view = document.querySelector('#app #view');
        if (view && !view.children.length) renderLoading();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 30000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
