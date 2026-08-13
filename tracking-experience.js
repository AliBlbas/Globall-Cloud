/* Globall Cloud — Tracking Experience 2.1
 * Additive UI only. No direct database access.
 */
(() => {
  'use strict';

  const TARGETS = ['[data-gc-tracking-target]','#trackingResult','.tracking-result','.track-result','.tracking-panel','.track-panel'];
  const STEPS = [
    ['placed','نێردرا'], ['pickedUp','وەرگیرا'], ['transit','لە ڕێگایە'],
    ['customs','لە گومرکە'], ['outForDelivery','بۆ گەیاندنە'], ['delivered','گەیشتووە']
  ];

  const esc = (value) => String(value ?? '—').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const findTarget = () => TARGETS.map((selector) => document.querySelector(selector)).find(Boolean) || null;
  const clampStep = (index) => Math.max(0, Math.min(Number(index) || 0, STEPS.length - 1));
  const statusFor = (index) => STEPS[clampStep(index)];
  const progressFor = (index) => Math.round((clampStep(index) / (STEPS.length - 1)) * 100);
  const dateText = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('ku-IQ', { year:'numeric', month:'short', day:'numeric' });
  };
  const renderLoading = () => {
    const target = findTarget();
    if (!target) return;
    let root = target.querySelector('.gc-tracking-upgrade');
    if (!root) {
      root = document.createElement('section');
      root.className = 'gc-tracking-upgrade';
      target.appendChild(root);
    }
    root.innerHTML = '<div class="gc-tracking-card gc-tracking-loading"><div class="gc-skeleton-line wide"></div><div class="gc-skeleton-line"></div><div class="gc-skeleton-bar"></div><div class="gc-skeleton-grid"><span></span><span></span><span></span><span></span></div></div>';
  };
  const renderError = (message = 'شوێنکەوتنی بار بەردەست نییە.') => {
    const target = findTarget();
    if (!target) return;
    let root = target.querySelector('.gc-tracking-upgrade');
    if (!root) {
      root = document.createElement('section');
      root.className = 'gc-tracking-upgrade';
      target.appendChild(root);
    }
    root.innerHTML = `<div class="gc-tracking-card gc-tracking-error"><div class="gc-error-icon">!</div><strong>کێشەیەک ڕوویدا</strong><p>${esc(message)}</p><button class="gc-track-action" type="button" onclick="location.reload()">دووبارە هەوڵبدەرەوە</button></div>`;
  };

  function render({ shipment, trackingId }) {
    const target = findTarget();
    if (!target || !shipment) return;

    const current = clampStep(shipment.current_step_index);
    const [stepKey, stepLabel] = statusFor(current);
    const progress = progressFor(current);
    const eta = shipment.eta ? new Date(shipment.eta) : null;
    const etaText = eta && !Number.isNaN(eta.getTime()) ? dateText(shipment.eta) : 'لە ئێستا دیاری نەکراوە';
    const id = esc(trackingId || shipment.id);
    const updatedAt = shipment.updated_at || shipment.created_at;
    const liveLabel = current === STEPS.length - 1 ? 'گەیشتووە' : 'Live tracking';

    let root = target.querySelector('.gc-tracking-upgrade');
    if (!root) {
      root = document.createElement('section');
      root.className = 'gc-tracking-upgrade';
      target.appendChild(root);
    }

    root.innerHTML = `
      <div class="gc-tracking-top">
        <div class="gc-tracking-card">
          <div class="gc-tracking-route">
            <span class="gc-tracking-code">${id}</span>
            <span class="gc-route-big">${esc(shipment.origin_key)} <span class="gc-route-arrow">→</span> ${esc(shipment.dest_key)}</span>
            <span class="gc-live-pill"><i></i>${esc(liveLabel)}</span>
          </div>
          <div class="gc-tracking-status">
            <div><div class="gc-tracking-muted">دۆخی بار</div><strong>${esc(stepLabel)}</strong></div>
            <div class="gc-tracking-muted">${progress}% تەواو</div>
          </div>
          <div class="gc-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" aria-label="Tracking progress"><span style="width:${progress}%"></span></div>
          <div class="gc-step-rail" aria-label="Shipment timeline">${STEPS.map(([key,label], index) => `<span class="${index < current ? 'done ' : ''}${index === current ? 'current' : ''}"><i></i><b>${esc(label)}</b></span>`).join('')}</div>
          <div class="gc-track-actions" style="margin-top:14px">
            <button class="gc-track-action" type="button" data-gc-copy="${id}">کۆپی کۆدی tracking</button>
            <button class="gc-track-action" type="button" data-gc-share="${id}">هاوبەشی tracking</button>
          </div>
        </div>
        <div class="gc-tracking-card gc-eta"><span>کاتی گەیشتن (ETA)</span><b>${esc(etaText)}</b><span>${esc(stepLabel)}</span><small>نوێکراوەتەوە: ${esc(dateText(updatedAt))}</small></div>
      </div>
      <div class="gc-tracking-card">
        <div class="gc-tracking-facts">
          <div class="gc-fact"><span>جۆری بار</span><b>${esc(shipment.type)}</b></div>
          <div class="gc-fact"><span>کێش</span><b>${shipment.weight_kg != null ? esc(`${shipment.weight_kg} kg`) : '—'}</b></div>
          <div class="gc-fact"><span>ژمارەی دانە</span><b>${shipment.items_count != null ? esc(shipment.items_count) : '—'}</b></div>
          <div class="gc-fact"><span>بەرواری تۆمارکردن</span><b>${esc(dateText(shipment.created_at))}</b></div>
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
      const shareData = { title:'Globall Cloud Tracking', text:`Tracking: ${value}`, url:window.location.href };
      try {
        if (navigator.share) await navigator.share(shareData);
        else { await navigator.clipboard.writeText(window.location.href); event.currentTarget.textContent = 'لینک کۆپی کرا ✓'; }
      } catch (_) {}
      setTimeout(() => { event.currentTarget.textContent = 'هاوبەشی tracking'; }, 1800);
    });
  }

  renderLoading();
  window.addEventListener('gc:tracking-loaded', (event) => render(event.detail || {}));
  window.addEventListener('gc:tracking-error', (event) => renderError(event.detail?.message));
})();
