(() => {
  'use strict';
  const URL = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/public-pricing';
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const $ = (id) => document.getElementById(id);
  const money = (value, currency = 'USD') => `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`;
  const fallback = ({ mode, origin, weight, volume }) => {
    const o = String(origin || '').toLowerCase();
    const w = Number(weight || 0);
    const v = Number(volume || 0);
    if (mode === 'sea') return { total: Math.max(v * 300, 300), days: '45–60 ڕۆژ', note: 'حاسیبەی مەتر کۆنتینەر / Sea' };
    if (mode === 'land') return { total: Math.max(w * (o.includes('dubai') || o.includes('uae') ? 1.5 : 3.5), 100), days: '7–15 ڕۆژ', note: 'نرخی نزیکەیی گواستنەوەی وشکانی' };
    return { total: Math.max(w * (o.includes('dubai') || o.includes('uae') ? 8.25 : 9), 75), days: '7–15 ڕۆژ', note: 'نرخی نزیکەیی گواستنەوەی ئاسمانی' };
  };
  const boot = () => {
    const form = $('quoteForm');
    if (!form || $('gcQuotePreview')) return;
    const box = document.createElement('div');
    box.id = 'gcQuotePreview';
    box.className = 'gc-quote-preview';
    box.setAttribute('aria-live', 'polite');
    box.innerHTML = '<span class="gc-quote-preview-label">LIVE ESTIMATE</span><strong>زانیاری بارەکەت بنووسە</strong><small>نرخی کۆتایی دوای پشکنینی کاڵا و مەبەست پشتڕاست دەکرێتەوە.</small>';
    form.appendChild(box);
    const update = async () => {
      const mode = $('quoteMode')?.value || 'air';
      const origin = $('quoteOrigin')?.value.trim() || '';
      const destination = $('quoteDestination')?.value.trim() || 'Erbil';
      const weight = Number($('quoteWeight')?.value || 0);
      const volume = Number($('quoteVolume')?.value || 0);
      if ((mode === 'sea' && volume <= 0) || (mode !== 'sea' && weight <= 0)) {
        box.innerHTML = '<span class="gc-quote-preview-label">LIVE ESTIMATE</span><strong>بڕی بار و مەتر بنووسە</strong><small>بۆ Sea مەتر کۆنتینەر، بۆ Air/Land کیلۆ بنووسە.</small>';
        return;
      }
      box.innerHTML = '<span class="gc-quote-preview-label">LIVE ESTIMATE</span><strong>لە حاڵی حیسابکردندا…</strong><small>نرخەکە لە کۆنتراکتی production وەرگیراوە.</small>';
      const payload = { product_type: 'general', origin_key: origin, destination_key: destination, transport_mode: mode, weight_kg: mode === 'sea' ? null : weight, volume_cbm: mode === 'sea' ? volume : (volume || null), has_battery: false, has_liquid: false, msds_provided: false, medical_device: false };
      try {
        const response = await fetch(URL, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.allowed === false) throw new Error(data.message_ku || data.error || 'fallback');
        const quote = data.quote || data;
        const total = quote.total ?? quote.total_cost ?? quote.amount ?? quote.price ?? quote.usd;
        if (!Number.isFinite(Number(total))) throw new Error('fallback');
        const primary = quote.usd !== undefined ? money(quote.usd, 'USD') : money(total, quote.currency || 'USD');
        const iqD = quote.iqd !== undefined ? ` · ${money(quote.iqd, 'IQD')}` : '';
        const days = quote.delivery_days || quote.estimated_days || quote.transit_time || 'بەپێی route';
        box.innerHTML = `<span class="gc-quote-preview-label">LIVE ESTIMATE · ${mode.toUpperCase()}</span><strong>${primary}${iqD}</strong><small>${String(origin || 'Origin')} → ${String(destination)} · گەیشتن: ${String(days)} · نرخی production</small>`;
      } catch {
        const result = fallback({ mode, origin, weight, volume });
        box.innerHTML = `<span class="gc-quote-preview-label">ESTIMATE · ${mode.toUpperCase()}</span><strong>${money(result.total)}</strong><small>${result.note} · ${result.days} · نرخەکە پێش ناردنی invoice پشتڕاست دەکرێتەوە.</small>`;
      }
    };
    let timer;
    form.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(update, 420); });
    form.addEventListener('change', update);
    update();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
