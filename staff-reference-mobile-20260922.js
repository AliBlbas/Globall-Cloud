/* Globall Cloud Staff OS — reference mobile shell enhancer, 2026-09-22 */
(() => {
  'use strict';
  if (window.__gcStaffReferenceMobile20260922) return;
  window.__gcStaffReferenceMobile20260922 = true;

  const mobile = () => window.matchMedia('(max-width:760px)').matches;
  const make = (tag, cls, textContent) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (textContent !== undefined) el.textContent = textContent;
    return el;
  };

  function enhanceHeader() {
    const topbar = document.querySelector('.topbar');
    const title = document.querySelector('.top-title');
    const actions = document.querySelector('.top-actions');
    if (!topbar || !title || !actions || topbar.dataset.gcReferenceHeader === '1') return;
    topbar.dataset.gcReferenceHeader = '1';

    const notify = make('button', 'gc-ref-notify', '');
    notify.type = 'button';
    notify.setAttribute('aria-label', 'ئاگادارییەکان');
    notify.dataset.count = document.querySelector('#alertsBadge')?.textContent?.trim() || '0';
    notify.addEventListener('click', () => document.querySelector('.gc-side [data-tab="alerts"]')?.click());

    const brand = make('div', 'gc-ref-brand', 'GC');
    brand.setAttribute('aria-label', 'Globall Cloud Staff OS');

    topbar.insertBefore(notify, title);
    actions.insertBefore(brand, actions.firstChild);

    const syncCount = () => {
      const count = document.querySelector('#alertsBadge')?.textContent?.trim();
      notify.dataset.count = count && count !== '' ? count : '0';
    };
    const badge = document.querySelector('#alertsBadge');
    if (badge) new MutationObserver(syncCount).observe(badge, {childList:true,subtree:true,characterData:true,attributes:true});
  }

  function enhanceDrawer() {
    const drawer = document.getElementById('gcMobileDrawer');
    if (!drawer || drawer.dataset.gcReferenceDrawer === '1') return;
    drawer.dataset.gcReferenceDrawer = '1';

    const head = make('div', 'gc-ref-drawer-head');
    head.append(make('strong', '', 'ناڤیگەیشن'));
    const close = make('button', 'gc-ref-drawer-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'داخستن');
    close.addEventListener('click', () => {
      drawer.classList.remove('open');
      document.getElementById('gcMobileBackdrop')?.classList.remove('open');
      document.getElementById('gcMobileMenuBtn')?.setAttribute('aria-expanded', 'false');
    });
    head.append(close);
    drawer.insertBefore(head, drawer.firstChild);

    const status = make('div', 'gc-ref-drawer-status');
    status.innerHTML = '<strong>● سیستەم چالاکە</strong><span>داتا بە شێوەی پارێزراو و role-aware بەڕێوەدەبرێت.</span>';
    drawer.appendChild(status);
  }

  function start() {
    if (!mobile()) return;
    enhanceHeader();
    enhanceDrawer();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();

  const observer = new MutationObserver(() => {
    if (mobile()) {
      enhanceHeader();
      enhanceDrawer();
    }
  });
  observer.observe(document.body, {childList:true,subtree:true});
  window.addEventListener('resize', start, {passive:true});
})();
