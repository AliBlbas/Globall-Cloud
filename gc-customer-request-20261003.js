/* Globall Cloud — authenticated shipment request workflow */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('customerRequestForm');
  if (!form) return;
  const modeSelect = $('requestMode');
  const weightInput = $('requestWeight');
  const volumeWrap = $('requestVolumeWrap');
  const volumeInput = $('requestVolume');
  const syncModeFields = () => {
    const isSea = modeSelect?.value === 'sea';
    if (weightInput) weightInput.required = !isSea;
    if (volumeInput) {
      volumeInput.required = isSea;
      volumeInput.setAttribute('aria-required', String(isSea));
    }
    if (volumeWrap) volumeWrap.hidden = !isSea;
    if (!isSea && volumeInput) volumeInput.value = '';
  };
  modeSelect?.addEventListener('change', syncModeFields);
  syncModeFields();
  const setStatus = (message, kind = '') => {
    const node = $('requestMessage');
    if (node) { node.textContent = message; node.className = `form-message ${kind}`; }
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const renderHistory = (items) => {
    const root = $('requestHistory');
    if (!root) return;
    if (!items.length) { root.innerHTML = '<div class="empty-line">هێشتا داواکارییەکت نییە.</div>'; return; }
    root.innerHTML = items.slice(0, 8).map((item) => {
      const isSea = String(item.transport_mode || 'air').toLowerCase() === 'sea';
      const measure = isSea
        ? `${escapeHtml(item.volume_cbm ?? '—')} CBM${item.weight_kg != null ? ` · ${escapeHtml(item.weight_kg)} kg` : ''}`
        : `${escapeHtml(item.weight_kg ?? '—')} kg`;
      return `<article class="item"><div class="row"><strong>${escapeHtml(item.origin_key || '—')} → ${escapeHtml(item.dest_key || '—')}</strong><span class="pill">${escapeHtml(item.status || 'pending')}</span></div><small class="muted">${escapeHtml(item.transport_mode || 'air')} · ${measure} · ${item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</small></article>`;
    }).join('');
  };
  const submit = async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const sessionResult = await window.sb?.auth?.getSession?.();
    const token = sessionResult?.data?.session?.access_token;
    if (!token) { setStatus('تکایە سەرەتا login بکە بۆ ناردنی داواکاری.', 'error'); $('loginBtn')?.click(); return; }
    const mode = modeSelect?.value || 'air';
    const readOptionalNumber = (id) => {
      const raw = String($(id)?.value ?? '').trim();
      if (!raw) return null;
      const number = Number(raw);
      return Number.isFinite(number) ? number : Number.NaN;
    };
    const weight = readOptionalNumber('requestWeight');
    const volume = readOptionalNumber('requestVolume');
    const items = readOptionalNumber('requestItems');
    const description = $('requestDescription')?.value.trim() || '';
    const weightValid = mode === 'sea'
      ? (weight === null || (Number.isFinite(weight) && weight > 0))
      : (Number.isFinite(weight) && weight > 0);
    const volumeValid = mode === 'sea'
      ? Number.isFinite(volume) && volume > 0
      : (volume === null || (Number.isFinite(volume) && volume >= 0));
    const itemsValid = items === null || (Number.isInteger(items) && items > 0);
    if (!description || !weightValid || !volumeValid || !itemsValid) {
      setStatus(mode === 'sea'
        ? 'بۆ بارە دەریاییەکان قەبارەی CBM پڕبکەرەوە؛ کێش ئارەزوومەندانەیە. ژمارەی کاڵاش دەبێت ژمارەیەکی تەواو بێت.'
        : 'وەسفی کاڵا و کێشی زیاتر لە سفر پڕبکەرەوە؛ ژمارەی کاڵاش دەبێت ژمارەیەکی تەواو بێت.', 'error');
      return;
    }
    if (button) { button.disabled = true; button.textContent = 'داواکاری دەنێردرێت…'; }
    setStatus('داواکارییەکەت بە شێوەی پارێزراو دەنێردرێت…');
    try {
      const response = await fetch('https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/customer-self', { method: 'POST', headers: { Authorization: `Bearer ${token}`, apikey: 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', data: { origin_key: $('requestCountry')?.value || 'china', dest_key: 'Erbil', transport_mode: mode, weight_kg: weight, volume_cbm: volume, items_count: items, service_level: 'standard', incoterm: 'EXW', notes: description } }), cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'ناردنی داواکاری سەرکەوتوو نەبوو.');
      setStatus('داواکارییەکەت نێردرا؛ تیمەکەمان پاش پشکنین وەڵامت دەداتەوە.', 'success');
      renderHistory([{ origin_key: $('requestCountry')?.value || 'china', dest_key: 'Erbil', transport_mode: mode, weight_kg: weight, volume_cbm: volume, status: 'pending', created_at: new Date().toISOString() }, ...((window.__customerQuotes || []).filter((x) => x?.id))]);
      form.reset();
      syncModeFields();
    } catch (error) { setStatus(error.message || 'هەڵەیەک ڕوویدا.', 'error'); }
    finally { if (button) { button.disabled = false; button.innerHTML = '<span data-dash-icon="send"></span>ناردنی داواکاری'; } }
  };
  form.addEventListener('submit', submit);
  window.addEventListener('gc:customer-loaded', (event) => renderHistory(event.detail?.quotes || window.__customerQuotes || []));
})();
