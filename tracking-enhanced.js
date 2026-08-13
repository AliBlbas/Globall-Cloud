// Enhanced Tracking (optional add-on) — Globall Cloud
//
// Adds a small live SVG route map + browser notifications on top of the
// public tracking page in index.html.

const TRACKING_STEP_KEYS = ['placed', 'pickedUp', 'transit', 'customs', 'outForDelivery', 'delivered'];

/* Safari/WebKit hardening.
 * index.html already loads this module, so use that stable execution point to
 * install the compatibility CSS without requiring a second HTML edit.
 */
(function installCrossBrowserAssets() {
  const assets = ['browser-compat.css', 'logo-fix.css'];
  for (const href of assets) {
    if (document.querySelector(`link[data-gc-compat="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.gcCompat = href;
    document.head.appendChild(link);
  }

  const fallbackLogo = '/logo-icon.svg';
  const fixLogo = (img) => {
    if (!(img instanceof HTMLImageElement) || img.dataset.gcLogoFixed === '1') return;
    img.dataset.gcLogoFixed = '1';
    img.addEventListener('error', () => {
      if (img.src.endsWith('/logo-icon.svg')) return;
      img.src = fallbackLogo;
    }, { once: true });
  };

  document.querySelectorAll('img[src*="logo-icon"]').forEach(fixLogo);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.('img[src*="logo-icon"]')) fixLogo(node);
        node.querySelectorAll?.('img[src*="logo-icon"]').forEach(fixLogo);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();

class EnhancedTracking {
  constructor() {
    this.shipments = new Map();
    this.containers = new Map();
    this.realtimeChannels = new Map();
  }

  async initializeTracking(shipmentId, containerId) {
    const sb = window.sb || window.supabase;
    if (!sb) throw new Error('Supabase client not available');

    const shipment = await this.fetchShipmentData(sb, shipmentId);
    this.shipments.set(shipmentId, shipment);
    if (containerId) this.initializeMap(containerId, shipmentId);
    this.subscribeToRealtime(sb, shipmentId);
    return shipment;
  }

  async fetchShipmentData(sb, shipmentId) {
    const { data, error } = await sb.rpc('track_shipment', { p_id: shipmentId });
    if (error) throw error;
    const row = data && data[0];
    if (!row) throw new Error('Shipment not found');
    return row;
  }

  subscribeToRealtime(sb, shipmentId) {
    this.unsubscribeChannel(shipmentId);
    const channel = sb
      .channel(`shipment-${shipmentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shipments', filter: `id=eq.${shipmentId}` },
        (payload) => this.handleRealtimeUpdate(shipmentId, payload)
      )
      .subscribe();
    this.realtimeChannels.set(shipmentId, channel);
  }

  unsubscribeChannel(shipmentId) {
    const sb = window.sb || window.supabase;
    const channel = this.realtimeChannels.get(shipmentId);
    if (channel && sb) sb.removeChannel(channel);
    this.realtimeChannels.delete(shipmentId);
  }

  handleRealtimeUpdate(shipmentId, payload) {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) return;
    Object.assign(shipment, payload.new);
    this.triggerNotification(shipmentId, payload.new);
    this.renderMap(shipmentId);
  }

  triggerNotification(shipmentId, shipmentData) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const stepIndex = shipmentData.current_step_index ?? 0;
    const stepKey = TRACKING_STEP_KEYS[stepIndex] || 'unknown';
    new Notification('🚚 Globall Cloud', {
      body: `${shipmentId}: ${stepKey}`,
      icon: '/logo-icon.svg',
      tag: `tracking-${shipmentId}`,
    });
  }

  initializeMap(containerId, shipmentId) {
    this.containers.set(shipmentId, containerId);
    this.renderMap(shipmentId);
  }

  renderMap(shipmentId) {
    const containerId = this.containers.get(shipmentId);
    if (!containerId) return;
    const mapElement = document.getElementById(containerId);
    if (!mapElement) return;
    mapElement.innerHTML = this.generateMapHTML(shipmentId);
  }

  generateMapHTML(shipmentId) {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) return '';
    const stepIndex = shipment.current_step_index ?? 0;
    const progressX = 150 + (700 * Math.min(stepIndex, 5)) / 5;
    const etaText = shipment.eta ? new Date(shipment.eta).toISOString().slice(0, 10) : '—';

    return `
      <div class="live-map-container">
        <div class="map-summary">
          <span class="map-summary-route">${shipment.origin_key || '—'} → ${shipment.dest_key || '—'}</span>
          <span class="map-summary-eta">کاتی گەیشتن: ${etaText}</span>
        </div>
        <svg viewBox="0 0 1000 600" class="route-visualization">
          <circle cx="150" cy="300" r="15" class="map-point origin-point"/>
          <text x="150" y="330" text-anchor="middle" class="map-label">${shipment.origin_key || '—'}</text>
          <circle cx="${progressX}" cy="270" r="12" class="map-point current-point">
            <animate attributeName="r" values="12;18;12" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <polyline points="150,300 350,285 500,270 700,255 850,300" fill="none" class="route-line" stroke-dasharray="5,5"/>
          <circle cx="850" cy="300" r="15" class="map-point dest-point"/>
          <text x="850" y="330" text-anchor="middle" class="map-label">${shipment.dest_key || '—'}</text>
        </svg>
        <div class="map-legend">
          <span class="legend-item"><span class="dot" style="background:#22C55E"></span> کۆگا</span>
          <span class="legend-item"><span class="dot" style="background:#00D4FF"></span> ئێستا</span>
          <span class="legend-item"><span class="dot" style="background:#E5533D"></span> مەبەست</span>
        </div>
      </div>
    `;
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  }

  cleanup(shipmentId) {
    this.unsubscribeChannel(shipmentId);
    this.shipments.delete(shipmentId);
    this.containers.delete(shipmentId);
  }
}

window.enhancedTracking = new EnhancedTracking();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnhancedTracking };
}