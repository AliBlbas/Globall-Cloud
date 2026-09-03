(() => {
  'use strict';

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (v) => String(v ?? '').trim();
  const money = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

  const originMap = { china: 'China', cn: 'China', foshan: 'China', uae: 'UAE', dubai: 'UAE', usa: 'USA', us: 'USA' };
  const typeMap = {
    battery: 'battery', patry: 'battery', 'پاتری': 'battery',
    screen: 'screen', display: 'screen', monitor: 'screen', 'شاشە': 'screen',
    accessories: 'accessories', accessory: 'accessories', tablet: 'tablet', tab: 'tablet',
    playstation: 'playstation', ps5: 'playstation', laptop: 'laptop', labtop: 'laptop',
    camera: 'camera', android: 'android', 'android phone': 'android',
    'used iphone': 'used iphone', usediphone: 'used iphone',
    iphone: 'iphone', iphone17: 'iphone17', s25: 's25', s26: 's26'
  };

  async function clientReady() {
    for (let i = 0; i < 20; i++) {
      if (window.sb?.rpc) return window.sb;
      if (typeof window.gcEnsureSupabase === 'function') {
        try { const client = await window.gcEnsureSupabase(); if (client?.rpc) return client; } catch {}
      }
      await sleep(150);
    }
    return null;
  }

  function controls() {
    const origin = document.getElementById('quoteOrigin');
    const product = document.getElementById('quoteProduct');
    const weight = document.getElementById('quoteWeight');
    const volume = document.getElementById('quoteVolume');
    const mode = document.getElementById('quoteType') || document.getElementById('quoteMode') || document.querySelector('[name="transport_mode"]');
    return { origin, product, weight, volume, mode };
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
    const origin = originMap[text(c.origin.value).toLowerCase()] || text(c.origin.value);
    const product = typeMap[text(c.product.value).toLowerCase()] || text(c.product.value).toLowerCase() || 'general';
    const mode = text(c.mode?.value || (text(c.volume?.value) ? 'sea' : 'air')).toLowerCase();
    const weight = Number(c.weight.value);
    const volume = Number(c.volume?.value || 0);
    const medical = Boolean(document.getElementById('gcMedicalDevice')?.checked);
    const battery = Boolean(document.getElementById('gcBattery')?.checked) || product === 'battery';
    const liquid = Boolean(document.getElementById('gcLiquid')?.checked);
    const msds = Boolean(document.getElementById('gcMsds')?.checked);

    const client = await clientReady();
    if (!client) return;
    if (!(weight > 0) && !(volume > 0)) return;
    if (status) status.textContent = 'حسابکردن لە backend...';
    try {
      const compliance = await client.rpc('validate_logistics_cargo', {
        p_product_type: product,
        p_has_battery: battery,
        p_has_liquid: liquid,
        p_msds_provided: msds,
        p_medical_device: medical,
      });
      if (compliance.error) throw compliance.error;
      if (!compliance.data?.allowed) {
        rows.hidden = true;
        status.textContent = compliance.data?.message_ku || 'کاڵاکە وەرناگیرێت.';
        if (state) state.textContent = compliance.data?.message_ku || 'کاڵاکە وەرناگیرێت.';
        return;
      }
      if (state) state.textContent = 'یاساکانی وەرگرتن تێپەڕین.';
      const result = await client.rpc('calculate_logistics_price', {
        p_origin_key: origin,
        p_destination_key: 'Erbil',
        p_transport_mode: mode === 'sea' ? 'sea' : 'air',
        p_product_type: product,
        p_weight_kg: Number.isFinite(weight) && weight > 0 ? weight : null,
        p_volume_cbm: Number.isFinite(volume) && volume > 0 ? volume : null,
        p_rate_key: null,
      });
      if (result.error) throw result.error;
      const d = result.data;
      rows.hidden = false;
      document.getElementById('gcRate').textContent = d.minimum_applied ? 'Minimum 5,000 IQD' : `$${money(d.rate_usd)} / ${d.unit || 'kg'}`;
      document.getElementById('gcUnit').textContent = d.minimum_applied ? 'fixed' : d.unit;
      document.getElementById('gcUsd').textContent = `$${money(d.usd)}`;
      document.getElementById('gcIqd').textContent = `${Number(d.iqd || 0).toLocaleString('en-US')} IQD`;
      status.textContent = `نرخی فەرمی: ${d.rate_key || 'minimum'}`;
    } catch (error) {
      rows.hidden = true;
      status.textContent = 'نەکرا نرخی فەرمی بۆ ئەم داواکارییە هەژمار بکرێت.';
      console.warn('[Globall Cloud] authoritative pricing:', error);
    }
  }

  async function init() {
    for (let i = 0; i < 30; i++) {
      const c = controls();
      if (c.origin && c.product && c.weight) {
        installCompliance(c); installResult(c);
        [c.origin,c.product,c.weight,c.volume,c.mode,document.getElementById('gcMedicalDevice'),document.getElementById('gcBattery'),document.getElementById('gcLiquid'),document.getElementById('gcMsds')].filter(Boolean).forEach((el)=>el.addEventListener('change',()=>void calculate()));
        [c.weight,c.volume].filter(Boolean).forEach((el)=>el.addEventListener('input',()=>void calculate()));
        return;
      }
      await sleep(200);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void init(), { once: true });
  else void init();
})();
