/* Globall Cloud — Tracking Experience 2.0
 * Additive UI only. No direct database access.
 */
(() => {
  'use strict';
  const TARGETS = ['[data-gc-tracking-target]','#trackingResult','.tracking-result','.track-result','.tracking-panel','.track-panel'];
  const STEPS = [
    ['placed','نێردرا'],['pickedUp','وەرگیرا'],['transit','لە ڕێگایە'],
    ['customs','لە گومرکە'],['outForDelivery','بۆ گەیاندنە'],['delivered','گەیشتووە']
  ];
  const esc = (value) => String(value ?? '—').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const findTarget = () => TARGETS.map((s) => document.querySelector(s)).find(Boolean) || null;
  const statusFor = (index) => STEPS[Math.max(0, Math.min(Number(index) || 0, STEPS.length - 1))];
  const progressFor = (index) => Math.round((Math.max(0, Math.min(Number(index) || 0, STEPS.length - 1)) / (STEPS.length - 1)) * 100);

  function render({ shipment, trackingId }) {
    const target = findTarget();
    if (!target || !shipment) return;
    const current = Number(shipment.current_step_index) || 0;
    const [stepKey, stepLabel] = statusFor(current);
    const progress = progressFor(current);
    const eta = shipment.eta ? new Date(shipment.eta) : null;
    const etaText = eta && !Number.isNaN(eta.getTime()) ? eta.toLocaleDateString('ku-IQ', {year:'numeric',month:'short',day:'numeric'}) : 'لە ئێستا دیاری نەکراوە';
    const id = esc(trackingId || shipment.id);

    let root = target.querySelector('.gc-tracking-upgrade');
    if (!root) {
      root = document.createElement('section');
      root.className = 'gc-tracking-upgrade';
      target.appendChild(root);
    }
    root.innerHTML = `
      <div class="gc-tracking-top">
        <div class="gc-tracking-card">
          <div class="gc-tracking-route"><span class="gc-tracking-code">${id}</span><span class="gc-route-big">${esc(shipment.origin_key)} <span class="gc-route-arrow">→</span> ${esc(shipment.dest_key)}</span></div>
          <div class="gc-tracking-status"><div><div class="gc-tracking-muted">دۆخی بار</div><strong>${esc(stepLabel)}</strong></div><div class="gc-tracking-muted">${progress}% تەواو</div></div>
          <div class="gc-progress" aria-label="Tracking progress"><span style="width:${progress}%"></span></div>
          <div class="gc-track-actions" style="margin-top:14px">
            <button class="gc-track-action" type="button" data-gc-copy="${id}">کۆپی کۆدی tracking</button>
            <button class="gc-track-action" type="button" data-gc-share="${id}">هاوبەشی tracking</button>
          </div>
        </div>
        <div class="gc-tracking-card gc-eta"><span>کاتی گەیشتن (ETA)</span><b>${esc(etaText)}</b><span>${esc(stepKey)}</span></div>
      </div>
      <div class="gc-tracking-card">
        <div class="gc-tracking-facts">
          <div class="gc-fact"><span>جۆری بار</span><b>${esc(shipment.type)}</b></div>
          <div class="gc-fact"><span>کێش</span><b>${shipment.weight_kg != null ? esc(`${shipment.weight_kg} kg`) : '—'}</b></div>
          <div class="gc-fact"><span>ژمارەی دانە</span><b>${shipment.items_count != null ? esc(shipment.items_count) : '—'}</b></div>
          <div class="gc-fact"><span>بەرواری تۆمارکردن</span><b>${shipment.created_at ? esc(new Date(shipment.created_at).toLocaleDateString('ku-IQ')) : '—'}</b></div>
        </div>
      </div>`;

    root.querySelector('[data-gc-copy]')?.addEventListener('click', async (event) => {
      const value = event.currentTarget.getAttribute('data-gc-copy') || '';
      try { await navigator.clipboard.writeText(value); event.currentTarget.textContent = 'کۆد کۆپی کرا ✓'; }
      catch (_) { event.currentTarget.textContent = 'کۆپی نەکرا'; }
      setTimeout(() => { event.currentTarget.textContent = 'کۆپی کۆدی tracking'; }, 1800);
    });
    root.querySelector('[data-gc-share]')?.addEventListener('click', async (event) => {
      const value = event.currentTarget.getAttribute('data-gc-share') || '';
      const shareData = {title:'Globall Cloud Tracking',text:`Tracking: ${value}`,url:window.location.href};
      try {
        if (navigator.share) await navigator.share(shareData);
        else { await navigator.clipboard.writeText(window.location.href); event.currentTarget.textContent = 'لینک کۆپی کرا ✓'; }
      } catch (_) {}
      setTimeout(() => { event.currentTarget.textContent = 'هاوبەشی tracking'; }, 1800);
    });
  }

  window.addEventListener('gc:tracking-loaded', (event) => render(event.detail || {}));
})();
