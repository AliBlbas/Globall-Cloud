// Enhanced Tracking (optional add-on) — Globall Cloud
// Public-safe version: reads shipment state through the public-track Edge Function.

const TRACKING_STEP_KEYS = ['placed', 'pickedUp', 'transit', 'customs', 'outForDelivery', 'delivered'];
const PUBLIC_TRACK_URL = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/public-track';

class EnhancedTracking {
  constructor() {
    this.shipments = new Map();
    this.containers = new Map();
    this.realtimeChannels = new Map();
  }

  async initializeTracking(shipmentId, containerId) {
    const shipment = await this.fetchShipmentData(shipmentId);
    this.shipments.set(shipmentId, shipment);
    if (containerId) this.initializeMap(containerId, shipmentId);
    this.subscribeToRealtime(shipmentId);
    return shipment;
  }

  async fetchShipmentData(shipmentId) {
    const id = String(shipmentId || '').trim();
    if (!id || id.length > 128) throw new Error('Invalid tracking id');

    const res = await fetch(`${PUBLIC_TRACK_URL}?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'omit',
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || `Tracking request failed (${res.status})`);
    if (!body?.shipment) throw new Error('Shipment not found');
    return body.shipment;
  }

  subscribeToRealtime(shipmentId) {
    const sb = window.sb || window.supabase;
    if (!sb?.channel) return;

    this.unsubscribeChannel(shipmentId);

    // Realtime is intentionally best-effort here. The canonical read path is
    // public-track, and the subscription does not grant access to shipment data.
    const channel = sb
      .channel(`shipment-${shipmentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shipments', filter: `id=eq.${shipmentId}` },
        async () => {
          try {
            const shipment = await this.fetchShipmentData(shipmentId);
            this.shipments.set(shipmentId, shipment);
            this.triggerNotification(shipmentId, shipment);
            this.renderMap(shipmentId);
          } catch (error) {
            console.warn('Tracking refresh unavailable', error);
          }
        }
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

  triggerNotification(shipmentId, shipmentData) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const stepIndex = shipmentData.current_step_index ?? 0;
    const stepKey = TRACKING_STEP_KEYS[stepIndex] || 'unknown';
    new Notification('🚚 Globall Cloud', {
      body: `${shipmentId}: ${stepKey}`,
      icon: 'logo-icon.png',
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
