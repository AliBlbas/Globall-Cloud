/* Globall Cloud — live shipment summary + status timeline. */
(() => {
  'use strict';
  const labels = {
    placed: 'داواکاری تۆمارکرا', pickedUp: 'بار وەرگیرا', transit: 'لە ڕێگادایە',
    customs: 'پڕۆسەی گومرگ', outForDelivery: 'بۆ گەیاندن دەرچووە', delivered: 'گەیەنراوە'
  };
  const statusLabels = { pending:'چاوەڕێی وەرگرتن', in_transit:'لە ڕێگادایە', delivered:'گەیەنراوە', completed:'تەواوبووە' };
  const esc = (v) => String(v ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
  const fmt = (v) => v ? new Intl.DateTimeFormat('ku-IQ',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)) : '—';
  const mode = (v) => ({air:'ئاسمانی',sea:'دەریایی',land:'وشکانی'}[String(v||'').toLowerCase()] || v || '—');
  const stepKey = (s) => ['placed','pickedUp','transit','customs','outForDelivery','delivered'][Math.max(0,Math.min(5,num(s?.current_step_index)))];
  const statusTone = (s) => {
    const key = String(s?.operational_status || s?.status || '').toLowerCase();
    if (key === 'delivered' || key === 'completed' || num(s?.current_step_index) >= 5) return 'delivered';
    if (key === 'pending') return 'pending';
    return 'transit';
  };
  const getId = (s) => s?.customer_code || s?.tracking_number || s?.tracking_id || s?.id || document.getElementById('trackInput')?.value || '—';
  const routeName = (s, side) => s?.[side] || (side === 'origin_key' ? 'سەرچاوە' : 'مەبەست');
  const timeline = (s) => {
    const current = Math.max(0, Math.min(5, num(s?.current_step_index)));
    const events = Array.isArray(s?.tracking_events) ? s.tracking_events : [];
    if (events.length) return events.slice().sort((a,b)=>new Date(a.occurred_at||a.created_at||0)-new Date(b.occurred_at||b.created_at||0)).map((e,i) => ({
      state: i === events.length-1 ? 'current' : 'complete', title: e.title || labels[e.status_key] || e.status_key || 'نوێکاری',
      date: e.occurred_at || e.created_at, location: e.location_label, note: e.note
    }));
    const dates = s?.step_dates || {};
    return ['placed','pickedUp','transit','customs','outForDelivery','delivered'].map((key,i) => ({
      state: i < current ? 'complete' : i === current ? 'current' : 'upcoming', title: labels[key], date: dates[key], location: i === current ? s?.current_location_label : '', note: ''
    }));
  };
  const icon = (text, cls='') => `<span class="gc-trk-route-icon ${cls}" aria-hidden="true">${esc(text)}</span>`;
  function render(s) {
    const host = document.getElementById('trackingDetailsContainer');
    if (!host || !s) return;
    const id = getId(s), tone = statusTone(s), current = stepKey(s);
    const events = timeline(s);
    const progress = Math.round(num(s.current_step_index) / 5 * 100);
    host.innerHTML = `<section class="gc-tracking-result" aria-labelledby="gc-tracking-summary-title">
      <article class="gc-tracking-summary-card">
        <div class="gc-tracking-summary-top"><div><span class="gc-tracking-eyebrow">GLOBALL CLOUD · LIVE TRACKING</span><h2 id="gc-tracking-summary-title">${esc(labels[current] || statusLabels[s.operational_status] || 'دۆخی بارەکە')}</h2><p class="gc-tracking-code">Tracking ID: <strong>${esc(id)}</strong></p></div><span class="gc-tracking-status ${tone}"><i></i>${esc(statusLabels[s.operational_status] || labels[current] || 'ACTIVE')}</span></div>
        <div class="gc-tracking-route" aria-label="ڕێگای گەیاندن">${icon(routeName(s,'origin_key'))}<strong>→</strong>${icon(s.current_location_label || 'لە ڕێگا','current')}<strong>→</strong>${icon(routeName(s,'dest_key'),'destination')}</div>
        <div class="gc-tracking-metrics"><div><small>کاتی خەمڵێنراوی گەیشتن</small><b>${esc(fmt(s.eta))}</b></div><div><small>شێوازی گواستنەوە</small><b>${esc(mode(s.transport_mode))}</b></div><div><small>کۆتا نوێکردنەوە</small><b>${esc(fmt(s.tracking_updated_at))}</b></div></div>
        <div class="gc-tracking-actions"><button type="button" class="gc-tracking-action primary" data-gc-copy>کۆپی لینکی Tracking</button><a class="gc-tracking-action" target="_blank" rel="noopener" href="https://wa.me/9647507577137?text=${encodeURIComponent(`سڵاو Globall Cloud، زانیاریی بارەکەم ${id} دەمەوێت.`)}">WhatsApp support</a></div>
      </article>
      <article class="gc-tracking-timeline-card" aria-labelledby="gc-tracking-timeline-title"><div class="gc-tracking-timeline-head"><div><span class="gc-tracking-eyebrow">SHIPMENT JOURNEY</span><h3 id="gc-tracking-timeline-title">مێژووی گواستنەوە</h3></div><span class="gc-tracking-progress">${progress}%</span></div><div class="gc-tracking-progress-bar"><i style="width:${progress}%"></i></div><ol class="gc-tracking-timeline">${events.map((e,i)=>`<li class="gc-tracking-event ${e.state}"><span class="gc-tracking-marker" aria-hidden="true">${e.state==='complete'?'✓':e.state==='current'?'<i></i>':i+1}</span><div><div class="gc-tracking-event-row"><h4>${esc(e.title)}</h4><time>${esc(fmt(e.date))}</time></div>${e.note?`<p>${esc(e.note)}</p>`:''}${e.location?`<small>${esc(e.location)}</small>`:''}</div></li>`).join('')}</ol></article>
    </section>`;
    host.querySelector('[data-gc-copy]')?.addEventListener('click', async () => {
      const url = `${location.origin}${location.pathname}?gc=${encodeURIComponent(id)}`;
      try { await navigator.clipboard.writeText(url); window.showToast?.('لینکی Tracking کۆپی کرا.', 'success'); } catch { window.prompt('لینکی Tracking کۆپی بکە:', url); }
    });
  }
  window.addEventListener('gc:tracking-intelligence', e => render(e.detail?.shipment));
  window.addEventListener('gc:tracking-shipment', e => render(e.detail?.shipment));
  window.addEventListener('gc:tracking-event', e => { const s = window.enhancedTracking?.shipments?.get?.(e.detail?.shipmentId); if (s) render(s); });
  window.addEventListener('gc:tracking-realtime', e => { if (e.detail?.status === 'SUBSCRIBED') { const s = window.enhancedTracking?.shipments?.get?.(e.detail?.shipmentId); if (s) render(s); } });
})();
