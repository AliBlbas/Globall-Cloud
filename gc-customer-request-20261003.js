/* Authenticated shipment request workflow with catalog-derived billing units. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('requestForm');
  if (!form) return;
  const setStatus = (message, kind = '') => {
    const node = $('requestMessage');
    if (node) { node.textContent = message; node.className = `form-message ${kind}`; }
  };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const modeKind = (origin, mode, product) => {
    const selected = String(product || '').trim();
    if (String(mode).toLowerCase() === 'sea') return 'cbm';
    if (String(origin).toLowerCase() === 'dubai' && String(mode).toLowerCase() === 'air') return 'item';
    const catalogRateKey = window.gcGetRequestRateKey?.();
    if (catalogRateKey && selected) return window.gcRequestRateUnit?.() || 'kg';
    return 'kg';
  };
  const renderHistory = (items) => {
    const root = $('requestHistory');
    if (!root) return;
    if (!items.length) { root.innerHTML = '<div class="empty-line">هێشتا داواکارییەکت نییە.</div>'; return; }
    root.innerHTML = items.slice(0, 8).map((item) => {
      const units = Number(item.items_count) > 0 ? `${Number(item.items_count).toLocaleString()} item(s)` : Number(item.volume_cbm) > 0 ? `${Number(item.volume_cbm).toLocaleString()} CBM` : `${Number(item.weight_kg || 0).toLocaleString()} kg`;
      return `<article class="item"><div class="row"><strong>${esc(item.origin_key || '—')} → ${esc(item.dest_key || 'Erbil')}</strong><span class="pill">${esc(item.status || 'pending')}</span></div><small class="muted">${esc(item.product_type || item.transport_mode || 'shipment')} · ${esc(units)} · ${item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</small></article>`;
    }).join('');
  };
  const submit = async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    if (button?.disabled) return;
    const originalButtonMarkup = button?.innerHTML || '';
    const sessionResult = await window.sb?.auth?.getSession?.();
    const token = sessionResult?.data?.session?.access_token;
    if (!token) { setStatus('تکایە سەرەتا login بکە بۆ ناردنی داواکاری.', 'error'); $('loginBtn')?.click(); return; }

    const origin = $('requestCountry')?.value || 'china';
    const mode = $('requestMode')?.value || 'air';
    const product = $('requestProduct')?.value.trim() || '';
    const weight = Number($('requestWeight')?.value || 0);
    const volume = Number($('requestVolume')?.value || 0);
    const itemCount = Number($('requestItems')?.value || 0);
    const items = Number.isInteger(itemCount) && itemCount > 0 ? itemCount : null;
    const description = $('requestDescription')?.value.trim() || '';
    const kind = modeKind(origin, mode, product);
    if (!description) { setStatus('وەسفی بار پڕبکەرەوە.', 'error'); $('requestDescription')?.focus(); return; }
    if (kind === 'item' && (!product || !items)) { setStatus('بۆ Dubai Air جۆری کاڵا و ژمارەی دانە پێویستن.', 'error'); (!product ? $('requestProduct') : $('requestItems'))?.focus(); return; }
    if (kind === 'cbm' && (!Number.isFinite(volume) || volume <= 0)) { setStatus('بۆ Sea حەجمی بار بە CBM پێویستە.', 'error'); $('requestVolume')?.focus(); return; }
    if (kind === 'kg' && (!Number.isFinite(weight) || weight <= 0)) { setStatus('کێشی بار بە KG پێویستە.', 'error'); $('requestWeight')?.focus(); return; }

    if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
    setStatus('داواکارییەکەت بە شێوەی پارێزراو دەنێردرێت…');
    try {
      const payload = {
        origin_key: origin, dest_key: 'Erbil', transport_mode: mode,
        product_type: product || description, rate_key: window.gcGetRequestRateKey?.() || null,
        weight_kg: kind === 'kg' && weight > 0 ? weight : null,
        volume_cbm: kind === 'cbm' && volume > 0 ? volume : null,
        items_count: kind === 'item' ? items : null,
        service_level: 'standard', incoterm: 'EXW', notes: description,
      };
      const response = await fetch('https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/customer-self', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_quote', data: payload }), cache: 'no-store',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'ناردنی داواکاری سەرکەوتوو نەبوو.');
      setStatus('داواکارییەکەت نێردرا؛ تیمەکەمان پاش پشکنین وەڵامت دەداتەوە.', 'success');
      form.reset();
      window.gcUpdateDashboardRateFields?.();
      await window.gcCustomerReload?.();
    } catch (error) { setStatus(error.message || 'هەڵەیەک ڕوویدا.', 'error'); }
    finally {
      if (button) { button.disabled = false; button.removeAttribute('aria-busy'); button.innerHTML = originalButtonMarkup; }
    }
  };
  form.addEventListener('submit', (event) => submit(event).catch((error) => setStatus(error?.message || 'هەڵەیەک ڕوویدا.', 'error')));
  window.addEventListener('gc:customer-loaded', (event) => renderHistory(event.detail?.quotes || window.__customerQuotes || []));
})();
