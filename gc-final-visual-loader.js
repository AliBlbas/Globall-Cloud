/* Globall Cloud — final visual layer loader
 * Keeps the Product visual direction as the last stylesheet so later
 * runtime enhancement layers cannot overwrite it.
 */
(() => {
  'use strict';

  const href = '/gc-product-visual-v6.css?v=20260930-3';
  let link = null;

  const ensure = () => {
    if (!document.head) return;
    if (!link || !link.isConnected) {
      document.head.querySelectorAll('link[data-gc-final-visual]').forEach((n) => n.remove());
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.gcFinalVisual = '1';
    }
    if (link.parentNode !== document.head) {
      document.head.appendChild(link);
      return;
    }
    const styles = [...document.head.querySelectorAll('link[rel="stylesheet"],style')];
    if (styles[styles.length - 1] !== link) {
      document.head.appendChild(link);
    }
  };

  const boot = () => {
    ensure();
    const observer = new MutationObserver(() => ensure());
    observer.observe(document.head, {childList:true});
    window.__gcFinalVisualObserver = observer;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  } else {
    boot();
  }
  window.addEventListener('load', ensure, {once:true});
})();
