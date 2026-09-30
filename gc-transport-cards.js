/* Globall Cloud — homepage transport card mode handoff. */
(() => {
  'use strict';
  const KEY = 'gc-transport-mode';
  const applyMode = () => {
    const mode = localStorage.getItem(KEY);
    const field = document.getElementById('reqType');
    if (field && ['air','sea','land'].includes(mode)) field.value = mode;
  };
  document.querySelectorAll('[data-gc-transport]').forEach((card) => {
    card.addEventListener('click', () => {
      localStorage.setItem(KEY, card.dataset.gcTransport || 'air');
    });
  });
  window.addEventListener('hashchange', () => setTimeout(applyMode, 60));
  setTimeout(applyMode, 140);
})();
