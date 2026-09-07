// Integration script for enhanced tracking. Requires tracking-enhanced.js
// to already be loaded on the page (defines window.enhancedTracking and
// the TRACKING_STEP_KEYS list this script reuses below).

const TRACKING_STEP_LABELS_KU = {
  placed: 'داواکاری تۆمارکرا',
  pickedUp: 'وەرگیرا لە کۆگا',
  transit: 'لە ڕێگادایە',
  customs: 'لە گومرکدایە',
  outForDelivery: 'بۆ گەیاندن دەرچووە',
  delivered: 'گەیشت',
};

function trackingEscapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function renderTrackingDetails(shipment) {
  const currentIndex = shipment.current_step_index ?? 0;
  const stepDates = shipment.step_dates || {};
  const rows = TRACKING_STEP_KEYS.map((key, i) => {
    const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'pending';
    const date = stepDates[key] ? new Date(stepDates[key]).toISOString().slice(0, 10) : '';
    return `
      <div class="tracking-step tracking-step--${state}">
        <span class="tracking-step-dot" aria-hidden="true"></span>
        <span class="tracking-step-label">${trackingEscapeHtml(TRACKING_STEP_LABELS_KU[key] || key)}</span>
        ${date ? `<span class="tracking-step-date">${trackingEscapeHtml(date)}</span>` : ''}
      </div>`;
  }).join('');
  return `<div class="tracking-step-list">${rows}</div>`;
}

function emitTrackingIntelligence(shipment, reason='initial') {
  window.dispatchEvent(new CustomEvent('gc:tracking-intelligence', { detail: { shipment, reason } }));
}

function enableNotifications() {
  window.enhancedTracking.requestNotificationPermission().then(granted => {
    if (granted) {
      showToast('ئاگادارکردنەوەکان چالاک کران!', 'success');
    } else {
      showToast('ئاگادارکردنەوەکان لە ڕێکخستنەکانی وێبگەڕەکەت ناچالاکن.', 'error');
    }
  });
}

let activeTrackedShipmentId = null;

function doTrackSearch() {
  const shipmentId = document.getElementById('trackInput').value.trim();
  if (!shipmentId) {
    showToast('تکایە ژمارەی شوێنکەوتن بنووسە', 'error');
    return;
  }

  if (activeTrackedShipmentId && activeTrackedShipmentId !== shipmentId) {
    window.enhancedTracking.cleanup(activeTrackedShipmentId);
  }

  window.enhancedTracking.initializeTracking(shipmentId, 'liveMapContainer')
    .then(shipment => {
      activeTrackedShipmentId = shipmentId;
      document.getElementById('trackingDetailsContainer').innerHTML = renderTrackingDetails(shipment);
      emitTrackingIntelligence(shipment, 'initial');
      showToast('شوێنکەوتن دەستیپێکرد! نوێکردنەوەکان ڕاستەوخۆن.', 'success');
    })
    .catch(error => {
      console.error('Tracking error:', error);
      showToast('بارگە نەدۆزرایەوە. تکایە ژمارەکە بپشکنە.', 'error');
    });
}

window.addEventListener('gc:tracking-shipment', event => {
  if (event.detail?.shipment) emitTrackingIntelligence(event.detail.shipment, 'realtime-update');
});

window.addEventListener('gc:tracking-event', event => {
  const shipment = window.enhancedTracking?.shipments?.get?.(event.detail?.shipmentId);
  if (shipment) emitTrackingIntelligence(shipment, 'new-event');
});

window.addEventListener('beforeunload', () => {
  if (activeTrackedShipmentId) window.enhancedTracking.cleanup(activeTrackedShipmentId);
});
