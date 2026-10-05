/* Active homepage quote workflow: live rate catalog, correct units, and anonymous submission. */
(() => {
  'use strict';
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const CATALOG_URL = `${SUPABASE_URL}/functions/v1/public-quote?catalog=1`;
  const QUOTE_URL = `${SUPABASE_URL}/functions/v1/public-quote`;
  const $ = (id) => document.getElementById(id);
  const state = { rates: [], minimumIqd: 5000, usdIqd: 0, loaded: false, error: null };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const norm = (value) => String(value ?? '').trim().toLowerCase();
  const originGroup = (value) => {
    const key = norm(value);
    if (['dubai','uae','sharjah','united arab emirates','unitedarabemirates'].includes(key)) return 'dubai';
    if (['usa','us','america','miami'].includes(key)) return 'usa';
    if (['china','cn','guangzhou','shenzhen','foshan'].includes(key)) return 'china';
    return key;
  };
  const aliases = (value) => {
    const group = originGroup(value);
    return group === 'dubai' ? ['dubai','uae','sharjah'] : group === 'usa' ? ['usa','us'] : group === 'china' ? ['china','cn','guangzhou','shenzhen','foshan'] : [group];
  };
  const unitKind = (value) => {
    const unit = norm(value);
    if (['item','items','piece','pieces','unit','units'].includes(unit)) return 'item';
    if (['cbm','per cbm','meter'].includes(unit)) return 'cbm';
    return 'kg';
  };
  const show = (element, yes) => { if (element) { element.hidden = !yes; if (yes) element.style.removeProperty('display'); else element.style.display = 'none'; } };

  function rowsForForm() {
    const source = $('reqOrigin')?.value || 'guangzhou';
    const mode = $('reqType')?.value || 'air';
    const destination = norm($('reqDestination')?.value || 'erbil');
    const destKey = ['hawler','hwr'].includes(destination) ? 'erbil' : destination;
    const weight = Number($('reqWeight')?.value || 0);
    return state.rates.filter((rate) => aliases(source).includes(norm(rate.origin_key)) && norm(rate.transport_mode) === mode && norm(rate.destination_key) === destKey && (rate.rate_key !== 'dubai_erbil_land_shein_over_100kg' || weight > 100));
  }

  function updateForm() {
    const source = $('reqOrigin')?.value || 'guangzhou';
    const mode = $('reqType')?.value || 'air';
    const product = $('reqProduct');
    const datalist = $('reqProductOptions');
    const rows = rowsForForm();
    const previous = product?.value || '';
    if (datalist) datalist.innerHTML = rows.map((rate) => `<option value="${esc(rate.product_type)}"></option>`).join('');
    if (product) product.value = previous;
    const selected = rows.find((rate) => norm(rate.product_type) === norm(previous));
    const kind = selected ? unitKind(selected.unit) : mode === 'sea' ? 'cbm' : originGroup(source) === 'dubai' && mode === 'air' ? 'item' : 'kg';
    const weight = $('reqWeight'), volume = $('reqVolume'), items = $('reqItems');
    show($('reqWeightRow') || weight?.closest('label'), kind === 'kg');
    show($('reqVolumeRow') || volume?.closest('label'), kind === 'cbm');
    show($('reqItemsRow') || items?.closest('label'), kind === 'item');
    if (weight) { weight.required = kind === 'kg'; weight.min = '0.1'; }
    if (volume) { volume.required = kind === 'cbm'; volume.min = '0.001'; }
    if (items) { items.required = kind === 'item'; items.min = '1'; items.step = '1'; }
    if (product) product.required = kind === 'item';
    const hint = $('reqQuoteHint');
    const estimate = $('reqQuoteEstimate');
    if (hint) hint.textContent = kind === 'item'
      ? 'Dubai Air: هەڵبژاردنی جۆری کاڵا و ژمارەی دانە پێویستە؛ کێش ئاختیارییە.'
      : kind === 'cbm'
        ? 'Sea: حەجم بە CBM پێویستە؛ نرخی کۆتایی لەلایەن ستاف پشتڕاست دەکرێتەوە.'
        : 'نرخ بە کێشی KG لە کاتالۆگی چالاکەوە هەژمار دەکرێت.';
    if (estimate) {
      const rate = selected;
      const quantity = kind === 'item' ? Number(items?.value || 0) : kind === 'cbm' ? Number(volume?.value || 0) : Number(weight?.value || 0);
      if (rate && Number.isFinite(quantity) && quantity > 0) {
        const currency = String(rate.currency || 'USD').toUpperCase();
        const raw = quantity * Number(rate.amount);
        const minUsd = currency === 'USD' && state.usdIqd > 0 ? state.minimumIqd / state.usdIqd : 0;
        const total = Math.max(raw, minUsd);
        const iqd = currency === 'USD' && state.usdIqd > 0 ? ` · ${Math.round(total * state.usdIqd).toLocaleString('en-US')} IQD` : '';
        estimate.textContent = `خەمڵاندن: ${total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ${currency}${iqd} · ${quantity} ${kind === 'item' ? 'item(s)' : kind === 'cbm' ? 'CBM' : 'kg'} × ${Number(rate.amount).toLocaleString('en-US',{maximumFractionDigits:2})} ${currency}/${rate.unit}. کۆتایی لەلایەن ستاف پشتڕاست دەکرێتەوە.`;
      } else if (state.error) estimate.textContent = 'کاتالۆگی نرخ بەردەست نییە؛ داواکاری بنێرە بۆ پێداچوونەوەی ستاف.';
      else if (rows.length) estimate.textContent = 'جۆری کاڵا هەڵبژێرە بۆ پیشاندانی خەمڵاندنی نرخ.';
      else estimate.textContent = 'نرخێکی چالاک بۆ ئەم route ـە نییە؛ داواکارییەکەت بۆ پێداچوونەوەی ستاف بنێرە.';
    }
  }

  function renderRoutePicker(id, hiddenId, values, labels) {
    const root = $(id), hidden = $(hiddenId);
    if (!root || !hidden || root.dataset.gcRoutePicker === '1') return;
    root.dataset.gcRoutePicker = '1';
    const selected = values.includes(hidden.value) ? hidden.value : values[0];
    hidden.value = selected;
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', id === 'reqOriginPicker' ? 'هەڵبژاردنی شوێنی سەرچاوە' : 'هەڵبژاردنی شوێنی گەیشتن');
    root.innerHTML = values.map((value) => `<button type="button" class="route-card${value === selected ? ' active' : ''}" data-route-value="${esc(value)}" aria-pressed="${value === selected}">${esc(labels[value] || value)}</button>`).join('');
    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-route-value]');
      if (!button) return;
      hidden.value = button.dataset.routeValue;
      root.querySelectorAll('[data-route-value]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      updateForm();
    });
  }

  async function loadCatalog() {
    try {
      const response = await fetch(CATALOG_URL, { method: 'GET', headers: { Accept: 'application/json', apikey: SUPABASE_KEY }, cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(body.rates)) throw new Error(body.error || 'Pricing catalog unavailable');
      state.rates = body.rates.filter((rate) => rate && rate.is_active !== false);
      state.minimumIqd = Number(body.minimum_charge_iqd || 5000);
      state.usdIqd = Number(body.usd_iqd_rate || 0);
      state.loaded = true;
    } catch (error) {
      state.error = error;
      console.warn('[Globall public quote catalog]', error);
    }
    updateForm();
  }

  async function handleRequestSubmit(event) {
    event.preventDefault();
    const form = $('requestForm');
    if (!form || !form.reportValidity()) return;
    if ($('reqHoneypot')?.value) return;
    const button = $('reqSubmitBtn');
    if (!button || button.disabled) return;
    const label = button.textContent;
    button.disabled = true; button.setAttribute('aria-busy', 'true'); button.textContent = 'داواکاری دەنێردرێت…';
    const origin = $('reqOrigin')?.value || 'guangzhou';
    const destination = $('reqDestination')?.value || 'erbil';
    const mode = $('reqType')?.value || 'air';
    const product = $('reqProduct')?.value.trim() || '';
    const weight = Number($('reqWeight')?.value || 0);
    const volume = Number($('reqVolume')?.value || 0);
    const itemCount = Number($('reqItems')?.value || 0);
    const items = Number.isInteger(itemCount) && itemCount > 0 ? itemCount : null;
    const selected = rowsForForm().find((rate) => norm(rate.product_type) === norm(product));
    const isDubaiAir = mode === 'air' && originGroup(origin) === 'dubai';
    const itemRate = selected && unitKind(selected.unit) === 'item';
    if ((isDubaiAir || itemRate) && (!product || !items)) {
      button.disabled = false; button.removeAttribute('aria-busy'); button.textContent = label;
      const hint = $('reqQuoteHint'); if (hint) hint.textContent = 'بۆ Dubai Air، جۆری کاڵای نرخدار و ژمارەی دانە پێویستن.';
      (!product ? $('reqProduct') : $('reqItems'))?.focus();
      return;
    }
    if (isDubaiAir && state.loaded && rowsForForm().length && !selected) {
      button.disabled = false; button.removeAttribute('aria-busy'); button.textContent = label;
      const hint = $('reqQuoteHint'); if (hint) hint.textContent = 'تکایە جۆری کاڵایەک لە نرخە چالاکەکانی لیستەکە هەڵبژێرە.';
      $('reqProduct')?.focus(); return;
    }
    if (mode === 'sea' && (!Number.isFinite(volume) || volume <= 0)) {
      button.disabled = false; button.removeAttribute('aria-busy'); button.textContent = label;
      $('reqVolume')?.focus(); return;
    }
    if (mode !== 'sea' && !isDubaiAir && !itemRate && (!Number.isFinite(weight) || weight <= 0)) {
      button.disabled = false; button.removeAttribute('aria-busy'); button.textContent = label;
      $('reqWeight')?.focus(); return;
    }
    const payload = {
      name: $('reqName')?.value.trim(), phone: $('reqPhone')?.value.trim(), email: $('reqEmail')?.value.trim() || null,
      origin_key: origin, dest_key: destination, transport_mode: mode,
      product_type: product || null, rate_key: selected?.rate_key || null,
      weight_kg: Number.isFinite(weight) && weight > 0 ? weight : null,
      volume_cbm: mode === 'sea' && Number.isFinite(volume) && volume > 0 ? volume : null,
      items_count: items, service_level: 'standard', incoterm: 'EXW', notes: $('reqNotes')?.value.trim() || null,
    };
    try {
      const response = await fetch(QUOTE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY }, body: JSON.stringify(payload), cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok !== true || !body.request?.request_number) throw new Error(body.error || 'Quote request could not be confirmed.');
      const requestNumber = String(body.request.request_number);
      const formWrap = $('requestFormWrap'), success = $('requestSuccessWrap');
      if (formWrap) formWrap.hidden = true;
      if (success) {
        success.hidden = false;
        success.replaceChildren();
        const heading = document.createElement('h3'); heading.textContent = 'داواکارییەکەت نێردرا';
        const message = document.createElement('p'); message.textContent = 'تیمی Globall Cloud پاش پشکنین نرخ و وردەکارییەکان پشتڕاست دەکاتەوە.';
        const id = document.createElement('strong'); id.dir = 'ltr'; id.textContent = requestNumber;
        const again = document.createElement('button'); again.type = 'button'; again.className = 'gc-btn gc-btn-primary'; again.textContent = 'داواکارییەکی دیکە بنێرە'; again.addEventListener('click', () => window.gcResetPublicQuote());
        success.append(heading, message, id, again);
      }
      form.reset();
      updateForm();
    } catch (error) {
      const hint = $('reqQuoteHint');
      if (hint) hint.textContent = error?.message?.includes('Too many') ? 'داواکاری زۆرە؛ تکایە دواتر دووبارە هەوڵبدەرەوە.' : 'ناردنی داواکاری سەرکەوتوو نەبوو؛ تکایە دووبارە هەوڵبدەرەوە.';
    } finally {
      button.disabled = false; button.removeAttribute('aria-busy'); button.textContent = label;
    }
  }
  window.handleRequestSubmit = handleRequestSubmit;
  window.gcResetPublicQuote = () => { const wrap = $('requestFormWrap'), success = $('requestSuccessWrap'); if (wrap) wrap.hidden = false; if (success) success.hidden = true; };

  function boot() {
    renderRoutePicker('reqOriginPicker', 'reqOrigin', ['guangzhou','shenzhen','dubai','sharjah'], { guangzhou:'چین · گوانگژۆ', shenzhen:'چین · شێنجەن', dubai:'دوبەی', sharjah:'شاریجە' });
    renderRoutePicker('reqDestPicker', 'reqDestination', ['erbil','sulaymaniyah','duhok','baghdad','basra','kirkuk','mosul'], { erbil:'هەولێر', sulaymaniyah:'سلێمانی', duhok:'دهۆک', baghdad:'بەغدا', basra:'بەسرە', kirkuk:'کەرکووک', mosul:'موسڵ' });
    if (!$('reqQuoteEstimate')) {
      const estimate = document.createElement('div'); estimate.id = 'reqQuoteEstimate'; estimate.className = 'gc-form-hint'; estimate.setAttribute('role', 'status'); estimate.setAttribute('aria-live', 'polite');
      $('reqQuoteHint')?.after(estimate);
    }
    ['reqType','reqProduct','reqWeight','reqVolume','reqItems'].forEach((id) => $(id)?.addEventListener('input', updateForm));
    ['reqType','reqProduct'].forEach((id) => $(id)?.addEventListener('change', updateForm));
    $('requestForm')?.addEventListener('reset', () => window.setTimeout(() => {
      [['reqOriginPicker','reqOrigin'],['reqDestPicker','reqDestination']].forEach(([pickerId,inputId]) => {
        const value = $(inputId)?.value;
        $(pickerId)?.querySelectorAll('[data-route-value]').forEach((button) => {
          const active = button.dataset.routeValue === value;
          button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
        });
      });
      updateForm();
    }, 0));
    loadCatalog();
    updateForm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
