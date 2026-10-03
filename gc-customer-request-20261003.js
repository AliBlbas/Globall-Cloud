/* Globall Cloud — authenticated shipment request workflow */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('requestForm');
  if (!form) return;
  const setStatus = (message, kind = '') => {
    const node = $('requestMessage');
    if (node) { node.textContent = message; node.className = `form-message ${kind}`; }
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const renderHistory = (items) => {
    const root = $('requestHistory');
    if (!root) return;
    if (!items.length) { root.innerHTML = '<div class="empty-line">هێشتا داواکارییەکت نییە.</div>'; return; }
    root.innerHTML = items.slice(0, 8).map((item) => `<article class="item"><div class="row"><strong>${escapeHtml(item.origin_key || '—')} → ${escapeHtml(item.dest_key || '—')}</strong><span class="pill">${escapeHtml(item.status || 'pending')}</span></div><small class="muted">${escapeHtml(item.transport_mode || 'air')} · ${escapeHtml(item.weight_kg || 0)} kg · ${item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</small></article>`).join('');
  };
  const submit = async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const sessionResult = await window.sb?.auth?.getSession?.();
    const token = sessionResult?.data?.session?.access_token;
    if (!token) { setStatus('تکایە سەرەتا login بکە بۆ ناردنی داواکاری.', 'error'); $('loginBtn')?.click(); return; }
    const weight = Number($('requestWeight')?.value || 0);
    const items = Number($('requestItems')?.value || 0) || null;
    const description = $('requestDescription')?.value.trim() || '';
    if (!description || !Number.isFinite(weight) || weight <= 0) { setStatus('وەسف و کێشی بار پڕبکەرەوە.', 'error'); return; }
    if (button) { button.disabled = true; button.textContent = 'داواکاری دەنێردرێت…'; }
    setStatus('داواکارییەکەت بە شێوەی پارێزراو دەنێردرێت…');
    try {
      const response = await fetch('https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/customer-self', { method: 'POST', headers: { Authorization: `Bearer ${token}`, apikey: 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', data: { origin_key: $('requestCountry')?.value || 'china', dest_key: 'Erbil', transport_mode: $('requestMode')?.value || 'air', weight_kg: weight, items_count: items, service_level: 'standard', incoterm: 'EXW', notes: description } }), cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'ناردنی داواکاری سەرکەوتوو نەبوو.');
      setStatus('داواکارییەکەت نێردرا؛ تیمەکەمان پاش پشکنین وەڵامت دەداتەوە.', 'success');
      renderHistory([{ origin_key: $('requestCountry')?.value || 'china', dest_key: 'Erbil', transport_mode: $('requestMode')?.value || 'air', weight_kg: weight, status: 'pending', created_at: new Date().toISOString() }, ...((window.__customerQuotes || []).filter((x) => x?.id))]);
      form.reset();
    } catch (error) { setStatus(error.message || 'هەڵەیەک ڕوویدا.', 'error'); }
    finally { if (button) { button.disabled = false; button.innerHTML = '<span data-dash-icon="send"></span>ناردنی داواکاری'; } }
  };
  form.addEventListener('submit', submit);
  window.addEventListener('gc:customer-loaded', (event) => renderHistory(event.detail?.quotes || window.__customerQuotes || []));
})();
