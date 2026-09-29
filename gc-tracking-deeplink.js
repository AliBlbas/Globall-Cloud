/* Globall Cloud — resilient tracking deep-link bootstrap for /tracking and /track. */
(() => {
  'use strict';
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get('gc') || params.get('id') || params.get('track') || '').trim();
  if (!code) return;
  const start = () => {
    const input = document.getElementById('trackingId') || document.getElementById('trackInput');
    if (!input) return;
    input.value = code.replace(/\s+/g, '').toUpperCase();
    const button = document.getElementById('trackBtn') || document.querySelector('#gcTrackingForm button[type="submit"]');
    if (button && !button.dataset.gcDeepLinkStarted) {
      button.dataset.gcDeepLinkStarted = '1';
      button.click();
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
