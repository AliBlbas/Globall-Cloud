/* Make the active catalog's billing unit visible on customer quote forms. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const unitOf = (value) => {
    const unit = String(value || '').trim().toLowerCase();
    if (['item', 'items', 'piece', 'pieces', 'unit', 'units'].includes(unit)) return 'item';
    if (['cbm', 'per cbm', 'meter'].includes(unit)) return 'cbm';
    return 'kg';
  };
  const boot = () => {
    const form = $('quoteForm');
    if (!form || form.dataset.gcQuoteUnitsWired === '1') return;
    form.dataset.gcQuoteUnitsWired = '1';
    const origin = $('quoteOrigin');
    const mode = $('quoteMode');
    const product = $('quoteProduct');
    const weight = $('quoteWeight');
    const volume = $('quoteVolume');
    const items = $('quoteItems');
    const weightRow = $('quoteWeightRow') || weight?.closest('.field-wrap');
    const volumeRow = $('quoteVolumeRow') || volume?.closest('.field-wrap');
    const itemsRow = $('quoteItemsRow') || items?.closest('.field-wrap');
    if (!product || !weight || !volume || !items) return;
    const hint = $('quoteWeightHint') || $('quoteProductHint');
    const sync = () => {
      const selected = product.selectedOptions?.[0];
      const source = String(origin?.value || '').trim().toLowerCase();
      const transport = String(mode?.value || 'air').toLowerCase();
      const inferred = selected?.dataset.unit || (transport === 'sea' ? 'cbm' : ['dubai', 'uae'].includes(source) && transport === 'air' ? 'item' : 'kg');
      const kind = unitOf(inferred);
      if (weightRow) weightRow.hidden = kind !== 'kg';
      if (volumeRow) volumeRow.hidden = kind !== 'cbm';
      if (itemsRow) itemsRow.hidden = kind !== 'item';
      weight.required = kind === 'kg';
      volume.required = kind === 'cbm';
      items.required = kind === 'item';
      items.min = '1'; items.step = '1';
      volume.min = '0.001';
      weight.min = '0.1';
      const weightLabel = document.querySelector('label[for="quoteWeight"]');
      const volumeLabel = document.querySelector('label[for="quoteVolume"]');
      const itemsLabel = document.querySelector('label[for="quoteItems"]');
      if (weightLabel) weightLabel.textContent = 'کێش (kg)';
      if (volumeLabel) volumeLabel.textContent = 'قەبارە (CBM)';
      if (itemsLabel) itemsLabel.textContent = 'ژمارەی دانە';
      if (hint) hint.textContent = kind === 'item'
        ? 'Dubai Air: جۆری کاڵا و ژمارەی دانە پێویستن؛ کێش ئاختیارییە.'
        : kind === 'cbm'
          ? 'Sea: حەجم بە CBM پێویستە؛ quote ـی کۆتایی لەلایەن ستاف پشتڕاست دەکرێتەوە.'
          : 'بۆ ئەم ڕێگایە کێش بە KG پێویستە؛ نرخ لە کاتالۆگی چالاک وەردەگیرێت.';
    };
    [origin, mode, product].filter(Boolean).forEach((field) => field.addEventListener('change', sync));
    product.addEventListener('input', sync);
    [weight, volume, items].forEach((field) => field.addEventListener('input', sync));
    form.addEventListener('reset', () => window.setTimeout(sync, 0));
    sync();
    window.gcSyncQuoteUnits = sync;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
