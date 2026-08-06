// Enhanced Tracking (optional add-on) — Globall Cloud
// FIXED VERSION.
//
// Two real bugs in the previous version:
//  1. `window.supabase.on('postgres_changes', ...).subscribe()` is the
//     Supabase JS v1 realtime API. This project loads supabase-js v2
//     (see index.html: @supabase/supabase-js@2), where realtime works
//     through a channel: `sb.channel(name).on('postgres_changes', cfg, cb).subscribe()`.
//     Calling `.on()` directly on the client throws immediately in v2.
//  2. It read shipment fields that don't exist in the real schema
//     (`origin`, `destination`, `status`, `progress`, `events`). The real
//     columns are `origin_key`, `dest_key`, `current_step_index`,
//     `step_dates`, `eta` (see database-schema.js), and index.html already
//     has its own Kurdish-labeled step timeline (STEP_KEYS / STEP_LABELS_KU)
//     for the public tracking page — this module is meant to *add* an
//     optional live map on top of that, not replace it or invent new fields.
//
// This is an optional visual add-on (a small animated SVG route map). The
// public tracking page in index.html already works without it.

const TRACKING_STEP_KEYS = ['placed', 'pickedUp', 'transit', 'customs', 'outForDelivery', 'delivered'];

class EnhancedTracking {
  constructor() {
    this.shipments = new Map();
    this.mapInstances = new Map();
    this.realtimeChannels = new Map();
  }

  async initializeTracking(shipmentId) {
    const sb = window.sb || window.supabase; // window.sb is the real client created in index.html
    if (!sb) throw new Error('Supabase client not available');

    const shipment = await this.fetchShipmentData(sb, shipmentId);
    this.shipments.set(shipmentId, shipment);
    this.subscribeToRealtime(sb, shipmentId);
    return shipment;
  }

  async fetchShipmentData(sb, shipmentId) {
    const { data, error } = await sb
      .from('shipments')
      .select('id,origin_key,dest_key,current_step_index,step_dates,eta,branch')
      .eq('id', shipmentId)
      .single();
    if (error) throw error;
    return data;
  }

  // Correct v2 realtime syntax: channel().on().subscribe()
  subscribeToRealtime(sb, shipmentId) {
    this.cleanup(shipmentId); // avoid duplicate subscriptions on repeat calls

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

  handleRealtimeUpdate(shipmentId, payload) {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) return;
    Object.assign(shipment, payload.new);
    this.triggerNotification(shipmentId, payload.new);
    this.updateTrackingUI(shipmentId);
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
    const mapElement = document.getElementById(containerId);
    if (!mapElement) return;
    mapElement.innerHTML = this.generateMapHTML(shipmentId);
    this.mapInstances.set(shipmentId, mapElement);
  }

  generateMapHTML(shipmentId) {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) return '';
    const stepIndex = shipment.current_step_index ?? 0;
    const progressX = 150 + (700 * Math.min(stepIndex, 5)) / 5;

    return `
      <div class="live-map-container">
        <svg viewBox="0 0 1000 600" class="route-visualization">
          <circle cx="150" cy="300" r="15" class="map-point origin-point"/>
          <text x="150" y="330" text-anchor="middle" class="map-label">${shipment.origin_key || '—'}</text>

          <circle cx="${progressX}" cy="270" r="12" class="map-point current-point">
            <animate attributeName="r" values="12;18;12" dur="1.5s" repeatCount="indefinite"/>
          </circle>

          <polyline points="150,300 350,285 500,270 700,255 850,300"
                    fill="none" class="route-line" stroke-dasharray="5,5"/>

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

  updateTrackingUI(shipmentId) {
    const container = document.getElementById(`tracking-${shipmentId}`);
    if (!container) return;
    this.initializeMap(`liveMapContainer`, shipmentId);
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  }

  cleanup(shipmentId) {
    const sb = window.sb || window.supabase;
    const channel = this.realtimeChannels.get(shipmentId);
    if (channel && sb) sb.removeChannel(channel);
    this.realtimeChannels.delete(shipmentId);
    this.shipments.delete(shipmentId);
    this.mapInstances.delete(shipmentId);
  }
}

window.enhancedTracking = new EnhancedTracking();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnhancedTracking };
}
