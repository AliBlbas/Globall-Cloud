/* Connect service cards to the Route Studio and Rate Explorer modes. */
(() => {
  const boot = () => {
    document.querySelectorAll('[data-gc-service="air"],[data-gc-service="sea"],[data-gc-service="land"]').forEach(card => {
      if (card.dataset.gcModeSync) return; card.dataset.gcModeSync = '1';
      card.addEventListener('click', () => { const mode = card.dataset.gcService; document.querySelector(`[data-studio-mode="${mode}"]`)?.click(); document.querySelector(`[data-rate-mode="${mode}"]`)?.click(); });
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') card.classList.add('is-selected'); });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
