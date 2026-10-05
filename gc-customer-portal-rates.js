/* Dashboard rate explorer: one live catalog, no guessed price or transit fallbacks. */
(() => {
  'use strict';
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const CATALOG_URL = `${SUPABASE_URL}/functions/v1/public-quote?catalog=1`;
  const $ = (id) => document.getElementById(id);
  const state = { rates: [], minimumIqd: 5000, usdIqd: 0, delivery: null, error: null };
  const routes = {
    chinaAir: { origin: 'china', mode: 'air', label: 'China Air' },
    chinaSea: { origin: 'china', mode: 'sea', label: 'China Sea' },
    usaAir: { origin: 'usa', mode: 'air', label: 'USA Air' },
    dubaiAir: { origin: 'dubai', mode: 'air', label: 'Dubai Air' },
    dubaiLand: { origin: 'dubai', mode: 'land', label: 'Dubai Land' },
  };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const norm = (value) => String(value ?? '').trim().toLowerCase();
  const originKey = (value) => {
    const v = norm(value);
    if (v.includes('dubai') || v === 'uae' || v.includes('united arab')) return 'dubai';
    if (v === 'us' || v.includes('usa') || v.includes('america')) return 'usa';
    if (v.includes('china') || v === 'cn' || v.includes('foshan') || v.includes('guangzhou')) return 'china';
    return v;
  };
  const unitKind = (unit) => {
    const value = norm(unit);
    if (['item','items','piece','pieces','unit','units'].includes(value)) return 'item';
    if (['cbm','per cbm','meter'].includes(value)) return 'cbm';
    return 'kg';
  };
  const unitLabel = (unit) => ({ item: 'item', cbm: 'CBM', kg: 'kg' })[unitKind(unit)];
  const money = (amount, currency = 'USD') => `${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${esc(currency)}`;
  const activeRates = (origin, mode, weight = 0) => state.rates.filter((rate) => {
    const sameOrigin = originKey(rate.origin_key) === originKey(origin);
    const sameMode = norm(rate.transport_mode) === norm(mode);
    const sameDestination = ['erbil','hawler','hwr'].includes(norm(rate.destination_key));
    const bulkShein = rate.rate_key === 'dubai_erbil_land_shein_over_100kg';
    return sameOrigin && sameMode && sameDestination && (!bulkShein || Number(weight) > 100);
  });
  const selectedRate = (select, rows) => rows.find((rate) => String(rate.rate_key || rate.product_type) === String(select?.value || '')) || null;

  function renderCatalog() {
    const root = $('rateCards');
    if (root) {
      if (state.error) root.innerHTML = `<p class="form-message error">${esc(state.error)}؛ نرخەکان کاتییانە بەردەست نین.</p>`;
      else {
        const groups = new Map();
        for (const rate of state.rates) {
          const key = `${originKey(rate.origin_key)}|${norm(rate.transport_mode)}`;
          if (!groups.has(key)) groups.set(key, { label: `${originKey(rate.origin_key).toUpperCase()} ${String(rate.transport_mode).toUpperCase()}`, rows: [] });
          groups.get(key).rows.push(rate);
        }
        root.innerHTML = [...groups.values()].map((group) => `<article class="rate-card"><span>${esc(group.label)}</span><div>${group.rows.map((rate) => `<small><b>${esc(rate.product_type)}</b> — ${money(rate.amount, rate.currency || 'USD')}/${unitLabel(rate.unit)}</small>`).join('')}</div></article>`).join('') || '<p class="muted">کاتالۆگی نرخ هیچ نرخێکی چالاک نیشان نادات.</p>';
      }
    }
    const delivery = $('deliveryOptions');
    if (delivery) {
      const policy = state.delivery || {};
      delivery.innerHTML = `<article class="delivery-card"><b>وەرگرتن لە نووسینگەی هەولێر تەنها</b><span>${esc(policy.location || 'Erbil office')}</span><small>${esc(policy.hours || '09:00–17:00')} · ${esc(policy.timezone || 'Asia/Baghdad')}</small></article>`;
    }
    const minimum = $('rateMinimum');
    if (minimum) {
      const fxText = state.usdIqd > 0 ? ` · 1 USD = ${state.usdIqd.toLocaleString('en-US')} IQD` : '';
      minimum.textContent = `Minimum charge: ${Number(state.minimumIqd || 5000).toLocaleString('en-US')} IQD for eligible low-value shipments${fxText}. Final quote is confirmed by staff.`;
    }
  }

  function fillCategories() {
    const route = routes[$('rateRoute')?.value || 'chinaAir'];
    const category = $('rateCategory');
    if (!route || !category) return;
    const previous = category.value;
    const rows = activeRates(route.origin, route.mode, $('rateAmount')?.value);
    category.innerHTML = rows.length
      ? `<option value="">جۆری کاڵا هەڵبژێرە</option>${rows.map((rate) => `<option value="${esc(rate.rate_key || rate.product_type)}">${esc(rate.product_type)} — ${money(rate.amount, rate.currency || 'USD')}/${unitLabel(rate.unit)}</option>`).join('')}`
      : '<option value="">نرخی چالاک بۆ ئەم ڕێگایە نییە</option>';
    if ([...category.options].some((option) => option.value === previous)) category.value = previous;
  }

  function syncMiniRequirements() {
    const route = routes[$('rateRoute')?.value || 'chinaAir'];
    const category = $('rateCategory');
    const rows = route ? activeRates(route.origin, route.mode, $('rateAmount')?.value) : [];
    const rate = selectedRate(category, rows);
    const kind = rate ? unitKind(rate.unit) : (route?.mode === 'sea' ? 'cbm' : route?.origin === 'dubai' && route.mode === 'air' ? 'item' : 'kg');
    const amountWrap = $('rateAmount')?.closest('.field-wrap');
    const volumeWrap = $('rateVolume')?.closest('.field-wrap');
    const itemsWrap = $('rateItems')?.closest('.field-wrap');
    if (amountWrap) amountWrap.hidden = kind !== 'kg';
    if (volumeWrap) volumeWrap.hidden = kind !== 'cbm';
    if (itemsWrap) itemsWrap.hidden = kind !== 'item';
    const setLabel = (id, label) => { const node = $(id)?.closest('.field-wrap')?.querySelector('label'); if (node) node.textContent = label; };
    setLabel('rateAmount', 'Weight (kg)');
    setLabel('rateVolume', 'Volume (CBM)');
    setLabel('rateItems', 'Number of items');
    if ($('rateAmount')) { $('rateAmount').required = kind === 'kg'; $('rateAmount').min = '0.01'; }
    if ($('rateVolume')) { $('rateVolume').required = kind === 'cbm'; $('rateVolume').min = '0.001'; }
    if ($('rateItems')) { $('rateItems').required = kind === 'item'; $('rateItems').min = '1'; $('rateItems').step = '1'; }
  }

  function calculate() {
    const route = routes[$('rateRoute')?.value || 'chinaAir'];
    const root = $('rateResult');
    if (!root) return;
    if (state.error) { root.innerHTML = `<strong>—</strong><span class="form-message error">${esc(state.error)}</span>`; return; }
    if (!route) { root.innerHTML = '<strong>—</strong><span>Route unavailable</span>'; return; }
    const rows = activeRates(route.origin, route.mode, $('rateAmount')?.value);
    const rate = selectedRate($('rateCategory'), rows);
    if (!rate) { root.innerHTML = '<strong>—</strong><span>Choose an active product category</span><small>Rates are loaded from the live catalog.</small>'; return; }
    const kind = unitKind(rate.unit);
    const quantity = kind === 'cbm' ? Number($('rateVolume')?.value || 0) : kind === 'item' ? Number($('rateItems')?.value || 0) : Number($('rateAmount')?.value || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) { root.innerHTML = `<strong>—</strong><span>Enter ${kind === 'cbm' ? 'volume in CBM' : kind === 'item' ? 'the item count' : 'weight in kg'}</span><small>${esc(route.label)} · ${esc(rate.product_type)}</small>`; return; }
    const raw = quantity * Number(rate.amount || 0);
    const fx = Number(state.usdIqd || 0);
    const minimumUsd = fx > 0 && norm(rate.currency || 'USD') === 'usd' ? Number(state.minimumIqd || 5000) / fx : 0;
    const total = Math.max(raw, minimumUsd);
    const minimumApplied = minimumUsd > 0 && raw < minimumUsd;
    const iqd = fx > 0 && norm(rate.currency || 'USD') === 'usd' ? Math.round(total * fx) : null;
    const basis = `${quantity.toLocaleString('en-US')} ${kind === 'item' ? 'item(s)' : kind === 'cbm' ? 'CBM' : 'kg'} × ${money(rate.amount, rate.currency || 'USD')}/${unitLabel(rate.unit)}`;
    root.innerHTML = `<strong>${money(total, rate.currency || 'USD')}</strong><span>${esc(route.label)} · ${esc(rate.product_type)}</span><small>${esc(basis)}${iqd !== null ? ` · ${iqd.toLocaleString('en-US')} IQD` : ''}${minimumApplied ? ` · ${Number(state.minimumIqd || 5000).toLocaleString('en-US')} IQD minimum applied` : ''}</small><small>Estimate only; staff will confirm the final quote.</small>`;
  }

  function syncRequestProductOptions() {
    const input = $('requestProduct');
    const list = $('requestProductOptions');
    if (!input || !list) return;
    const rows = activeRates($('requestCountry')?.value || 'china', $('requestMode')?.value || 'air', $('requestWeight')?.value);
    const previous = input.value;
    list.innerHTML = rows.map((rate) => `<option value="${esc(rate.product_type)}"></option>`).join('');
    input.value = previous;
  }

  window.gcGetRequestRateKey = () => {
    const rows = activeRates($('requestCountry')?.value || 'china', $('requestMode')?.value || 'air', $('requestWeight')?.value);
    const product = norm($('requestProduct')?.value);
    return rows.find((rate) => norm(rate.product_type) === product)?.rate_key || null;
  };
  window.gcRequestRateUnit = () => {
    const rows = activeRates($('requestCountry')?.value || 'china', $('requestMode')?.value || 'air', $('requestWeight')?.value);
    const product = norm($('requestProduct')?.value);
    const rate = rows.find((item) => norm(item.product_type) === product);
    return rate ? unitKind(rate.unit) : null;
  };

  function syncRequestFields() {
    const origin = $('requestCountry')?.value || 'china';
    const mode = $('requestMode')?.value || 'air';
    const itemRoute = mode === 'air' && originKey(origin) === 'dubai';
    const sea = mode === 'sea';
    const weight = $('requestWeight'), volume = $('requestVolume'), items = $('requestItems');
    const weightRow = $('requestWeightRow') || weight?.closest('.field-wrap');
    const volumeRow = $('requestVolumeRow') || volume?.closest('.field-wrap');
    const itemsRow = $('requestItemsRow') || items?.closest('.field-wrap');
    if (weightRow) weightRow.hidden = sea || itemRoute;
    if (volumeRow) volumeRow.hidden = !sea;
    if (itemsRow) itemsRow.hidden = !itemRoute;
    if (weight) weight.required = !sea && !itemRoute;
    if (volume) volume.required = sea;
    if (items) items.required = itemRoute;
    const product = $('requestProduct');
    if (product) product.required = itemRoute;
    const hint = $('requestQuoteHint');
    if (hint) hint.textContent = itemRoute ? 'Dubai Air: ژمارەی دانە و جۆری کاڵا پێویستن؛ کێش ئاختیارییە.' : sea ? 'Sea: قەبارەی بار بە CBM پێویستە؛ quote ـی کۆتایی لەلایەن ستاف پشتڕاست دەکرێتەوە.' : 'بۆ ئەم ڕێگایە کێش بە KG پێویستە؛ نرخەکان لە کاتالۆگی چالاک وەردەگیرێن.';
    syncRequestProductOptions();
  }

  async function loadCatalog() {
    try {
      const response = await fetch(CATALOG_URL, { headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Rate catalog request failed');
      state.rates = Array.isArray(data.rates) ? data.rates : [];
      state.minimumIqd = Number(data.minimum_charge_iqd || 5000);
      state.usdIqd = Number(data.usd_iqd_rate || 0);
      state.delivery = data.delivery || null;
      if (!state.rates.length) throw new Error('No active rates');
    } catch (error) {
      state.error = 'ناتوانین لە ئێستادا کاتالۆگی نرخ بار بکەین';
      console.error('[Globall dashboard rate catalog]', error);
    }
    renderCatalog();
    fillCategories();
    syncMiniRequirements();
    calculate();
    syncRequestFields();
  }

  function boot() {
    $('rateRoute')?.addEventListener('change', () => { fillCategories(); syncMiniRequirements(); calculate(); });
    $('rateCategory')?.addEventListener('change', () => { syncMiniRequirements(); calculate(); });
    ['rateAmount','rateVolume','rateItems'].forEach((id) => $(id)?.addEventListener('input', () => { if (id === 'rateAmount') fillCategories(); syncMiniRequirements(); calculate(); }));
    ['requestCountry','requestMode'].forEach((id) => $(id)?.addEventListener('change', syncRequestFields));
    ['requestWeight','requestVolume','requestItems','requestProduct'].forEach((id) => $(id)?.addEventListener('input', () => { syncRequestFields(); }));
    window.gcUpdateDashboardRateFields = syncRequestFields;
    renderCatalog();
    loadCatalog();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
