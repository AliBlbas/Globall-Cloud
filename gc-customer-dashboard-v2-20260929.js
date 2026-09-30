/* Customer Portal dashboard v2 — workflow-first navigation layer. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const statusIndex = (rows) => {
    const text = (rows || []).map(x => `${x.status || ''} ${x.operational_status || ''} ${x.current_step || ''}`.toLowerCase()).join(' ');
    if (/deliver|گەیەن/.test(text)) return 3;
    if (/transit|moving|transit|ڕێگا/.test(text)) return 2;
    if (/pickup|warehouse|وەرگیرا/.test(text)) return 1;
    return 0;
  };
  const boot = () => {
    const deck = $('#gcCustomerCommandDeck'); if (!deck || $('#gcPortalFlow')) return;
    const flow = document.createElement('section'); flow.id = 'gcPortalFlow'; flow.className = 'gc-portal-flow'; flow.setAttribute('aria-label', 'Shipment workflow');
    flow.innerHTML = `<div class="gc-flow-head"><div><span>SHIPMENT WORKFLOW</span><h3>لە داواکاری تا گەیاندن</h3></div><small id="gcFlowStatus">READY FOR YOUR NEXT MOVE</small></div><div class="gc-flow-track"><a href="#gcRequestSection" data-flow-step="0"><i>01</i><span>Quote</span><b>داواکاری</b></a><div class="gc-flow-line"></div><a href="#gcLiveSection" data-flow-step="1"><i>02</i><span>Pickup</span><b>وەرگرتن و QC</b></a><div class="gc-flow-line"></div><a href="#gcLiveSection" data-flow-step="2"><i>03</i><span>Transit</span><b>لە گواستنەوە</b></a><div class="gc-flow-line"></div><a href="#gcLiveSection" data-flow-step="3"><i>04</i><span>Delivery</span><b>گەیاندن</b></a></div>`;
    deck.after(flow);
    const refresh = () => { const active = statusIndex(window.__customerShipments); flow.dataset.activeStep = String(active); flow.querySelectorAll('[data-flow-step]').forEach(step => step.classList.toggle('is-active', Number(step.dataset.flowStep) <= active)); const status = $('#gcFlowStatus'); if (status) status.textContent = window.__customerShipments?.length ? `${window.__customerShipments.length} SHIPMENT · WORKSPACE SYNCED` : 'READY FOR YOUR NEXT MOVE'; };
    refresh(); setInterval(refresh, 2200);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 1100), {once:true}); else setTimeout(boot, 1100);
})();
