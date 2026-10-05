/* Globall Cloud — final command-surface style loader · 2026-10-03
 * Keeps the new professional visual layer as the final stylesheet even when
 * older runtime layers append their own styles after the initial page load.
 */
(() => {
  'use strict';
  const links = [
    {test:() => !!document.querySelector('#gcApp'), href:'/gc-home-command-v2-20261003.css?v=1'},
    {test:() => !!document.querySelector('.gc-shell, .login, .gc-rescue-shell'), href:'/gc-staff-command-v2-20261003.css?v=2'}
  ];

  const ensure = () => {
    if (!document.head) return;
    const wanted = links.find(x => x.test());
    if (!wanted) return;
    let link = document.head.querySelector('link[data-gc-command-surface]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = wanted.href;
      link.dataset.gcCommandSurface = '1';
      document.head.appendChild(link);
      return;
    }
    if (link.href !== new URL(wanted.href, location.href).href) link.href = wanted.href;
    const styles = [...document.head.querySelectorAll('link[rel="stylesheet"],style')];
    if (styles[styles.length - 1] !== link) document.head.appendChild(link);
  };

  const boot = () => {
    ensure();
    const observer = new MutationObserver(() => queueMicrotask(ensure));
    observer.observe(document.head, {childList:true});
    window.__gcCommandSurfaceObserver = observer;
    window.addEventListener('load', ensure, {once:true});
    setTimeout(ensure, 250);
    setTimeout(ensure, 1000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  } else {
    boot();
  }
})();
