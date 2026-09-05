(() => {
  'use strict';

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (v) => String(v ?? '').trim();
  const money = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const PRICING_FN = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/public-pricing';
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';

  const originMap = { china: 'china', cn: 'china', foshan: 'china', uae: 'uae', dubai: 'dubai', usa: 'usa', us: 'usa' };
  const typeMap = {
    battery: 'battery', patry: 'battery', 'پاتری': 'battery',
    screen: 'screen', display: 'screen', monitor: 'screen', 'شاشە': 'screen',
    accessories: 'accessories', accessory: 'accessories', tablet: 'tablet', tab: 'tablet',
    playstation: 'playstation', ps5: 'playstation', laptop: 'laptop', labtop: 'laptop',
    camera: 'camera', android: 'android', 'android phone': 'android',
    'used iphone': 'used iphone', usediphone: 'used iphone',
    iphone: 'iphone', iphone17: 'iphone17', s25: 's25', s26: 's26'
  };

  function controls() {
    return {
      origin: document.getElementById('quoteOrigin'),
      product: document.getElementById('quoteProduct'),
      weight: document.getElementById('quoteWeight'),
      volume: document.getElementById('quoteVolume'),
      mode: document.getElementById('quoteType') || document.getElementById('quoteMode') || document.querySelector('[name="transport_mode"]')
    };
  }

  function installCompliance(c) {
    if (!c.product || document.querySelector('[data-gc-cargo-compliance]')) return;
    const host = c.product.closest('.form-row')?.parentElement || c.product.parentElement;
    const block = document.createElement('div');
    block.setAttribute('data-gc-cargo-compliance', '1');
    block.className = 'form-row';
    block.style.marginTop = '10px';
    block.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
        <label><input type="checkbox" id="gcMedicalDevice"> ئامێری پزیشکییە</label>
        <label><input type="checkbox" id="gcBattery"> پاتری هەیە</label>
        <label><input type="checkbox" id="gcLiquid"> شلەی هەیە</label>
        <label><input type="checkbox" id="gcMsds"> MSDS هەیە</label>
      </div>
      <small id="gcComplianceState" class="field-hint" aria-live="polite">یاساکانی وەرگرتن پشکنین دەکرێن.</small>`;
    host?.appendChild(block);
  }

  function installResult(c) {
    if (document.getElementById('gcAuthoritativeQuote')) return;
    const box = document.createElement('div');
    box.id = 'gcAuthoritativeQuote';
    box.className = 'card';
    box.style.marginTop = '12px';
    box.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">BACKEND PRICING</div><h3 style="margin:4px 0">نرخی فەرمی Global Cloud</h3><p id="gcQuoteStatus" class="muted">کۆنتڕۆڵەکان پڕ بکە بۆ حسابکردن.</p></div></div>
      <div id="gcQuoteRows" class="quote-box" hidden>
        <div class="quote-row"><span>Rate</span><strong id="gcRate">—</strong></div>
        <div class="quote-row"><span>Unit</span><strong id="gcUnit">—</strong></div>
        <div class="quote-row"><span>USD</span><strong id="gcUsd">—</strong></div>
        <div class="quote-row"><span>IQD</span><strong id="gcIqd">—</strong></div>
      </div>`;
    const anchor = c.volume?.parentElement || c.weight?.parentElement || c.product.closest('.form-row') || c.product.parentElement;
    anchor?.parentElement?.appendChild(box);
  }

  async function calculate() {
    const c = controls();
    if (!c.origin || !c.product || !c.weight) return;
    installCompliance(c); installResult(c);
    const state = document.getElementById('gcComplianceState');
    const status = document.getElementById('gcQuoteStatus');
    const rows = document.getElementById('gcQuoteRows');
    const origin = originMap[text(c.origin.value).toLowerCase()] || text(c.origin.value).toLowerCase();
    const product = typeMap[text(c.product.value).toLowerCase()] || text(c.product.value).toLowerCase() || 'general';
    const mode = text(c.mode?.value || (text(c.volume?.value) ? 'sea' : 'air')).toLowerCase();
    const weight = Number(c.weight.value);
    const volume = Number(c.volume?.value || 0);
    const medical = Boolean(document.getElementById('gcMedicalDevice')?.checked);
    const battery = Boolean(document.getElementById('gcBattery')?.checked) || product === 'battery';
    const liquid = Boolean(document.getElementById('gcLiquid')?.checked);
    const msds = Boolean(document.getElementById('gcMsds')?.checked);

    if (!(weight > 0) && !(volume > 0)) return;
    if (status) status.textContent = 'حسابکردن لە سێرڤەری pricing...';
    try {
      const r = await fetch(PRICING_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: KEY },
        body: JSON.stringify({ origin_key: origin, destination_key: 'erbil', transport_mode: mode, product_type: product, weight_kg: Number.isFinite(weight) && weight > 0 ? weight : null, volume_cbm: Number.isFinite(volume) && volume > 0 ? volume : null, has_battery: battery, has_liquid: liquid, msds_provided: msds, medical_device: medical }),
        cache: 'no-store'
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Pricing service error');
      if (!d.allowed) {
        rows.hidden = true;
        status.textContent = d.message_ku || 'کاڵاکە وەرناگیرێت.';
        if (state) state.textContent = d.message_ku || 'کاڵاکە وەرناگیرێت.';
        return;
      }
      const q = d.quote || {};
      if (state) state.textContent = 'یاساکانی وەرگرتن تێپەڕین.';
      rows.hidden = false;
      document.getElementById('gcRate').textContent = q.minimum_applied ? 'Minimum' : `$${money(q.rate_usd)} / ${q.unit || 'kg'}`;
      document.getElementById('gcUnit').textContent = q.minimum_applied ? 'fixed' : (q.unit || 'kg');
      document.getElementById('gcUsd').textContent = `$${money(q.usd)}`;
      document.getElementById('gcIqd').textContent = `${Number(q.iqd || 0).toLocaleString('en-US')} IQD`;
      status.textContent = `نرخی فەرمی: ${q.rate_key || 'minimum'}`;
    } catch (error) {
      rows.hidden = true;
      status.textContent = 'نەکرا نرخی فەرمی هەژمار بکرێت.';
      console.warn('[Globall Cloud] public pricing:', error);
    }
  }

  async function init() {
    for (let i = 0; i < 30; i++) {
      const c = controls();
      if (c.origin && c.product && c.weight) {
        installCompliance(c); installResult(c);
        [c.origin,c.product,c.weight,c.volume,c.mode].filter(Boolean).forEach((el)=>el.addEventListener('change',()=>void calculate()));
        [c.weight,c.volume].filter(Boolean).forEach((el)=>el.addEventListener('input',()=>void calculate()));
        ['gcMedicalDevice','gcBattery','gcLiquid','gcMsds'].forEach((id)=>document.getElementById(id)?.addEventListener('change',()=>void calculate()));
        return;
      }
      await sleep(200);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void init(), { once: true });
  else void init();
})();
