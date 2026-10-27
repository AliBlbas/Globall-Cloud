/* Keep the authoritative Staff OS design layer last, even when legacy
   scripts append theme/visual styles after the initial HTML has loaded. */
(() => {
  'use strict';
  const head = document.head;
  if (!head) return;

  const href = '/gc-staff-live-finish-20261027.css?v=4';
  let queued = false;

  function pinFinalStylesheet() {
    let link = head.querySelector('link[data-gc-staff-live-finish="1"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.gcStaffLiveFinish = '1';
      head.appendChild(link);
    }

    if (link.getAttribute('href') !== href) link.setAttribute('href', href);

    const stylesheets = head.querySelectorAll('link[rel="stylesheet"]');
    if (stylesheets.length && stylesheets[stylesheets.length - 1] !== link) {
      head.appendChild(link);
    }
  }

  function schedulePin() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      pinFinalStylesheet();
    });
  }

  pinFinalStylesheet();
  const observer = new MutationObserver(schedulePin);
  observer.observe(head, { childList: true });

  document.addEventListener('DOMContentLoaded', pinFinalStylesheet, { once: true });
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
})();
