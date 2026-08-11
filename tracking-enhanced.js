// Enhanced Tracking (optional add-on) — Globall Cloud
//
// Adds a small live SVG route map + browser notifications on top of the
// public tracking page in index.html, which already works fully without
// this file. Not loaded by any page by default — see tracking-integration.html
// for a ready-to-copy usage example.
//
// Bugs fixed here vs. the original draft of this module:
//  1. Realtime API mismatch: the original called `window.supabase.on(...)`,
//     the Supabase JS v1 syntax. This project loads supabase-js v2 (see
//     index.html: @supabase/supabase-js@2), where realtime subscriptions go
//     through a channel: `sb.channel(name).on('postgres_changes', cfg, cb).subscribe()`.
//  2. Wrong column names: the original read `origin`, `destination`,
//     `status`, `progress`, `events`, none of which exist in the real
//     schema. The real columns are `origin_key`, `dest_key`,
//     `current_step_index`, `step_dates`, `eta` (see database-schema.js).
//  3. Self-wiping state: `subscribeToRealtime()` called `cleanup()` as a
//     "clear any previous subscription" guard, but `cleanup()` also deleted
//     the shipment record that `initializeTracking()` had just fetched —
//     so by the time a realtime update arrived, `handleRealtimeUpdate()`'s
//     `this.shipments.get(shipmentId)` was always undefined and every
//     update silently no-op'd. Resubscribing now only tears down the old
//     channel, not the shipment/container state.
//  4. Wrong redraw target: `updateTrackingUI()` checked for a
//     `tracking-${shipmentId}` element but then always redrew into a
//     hardcoded `liveMapContainer` — fine for one shipment on a page, but
//     it meant two shipments tracked at once would overwrite each other's
//     map. Each shipment now remembers its own container id.

const TRACKING_STEP_KEYS = ['placed', 'pickedUp', 'transit', 'customs', 'outForDelivery', 'delivered'];

class EnhancedTracking {
  constructor() {
    this.shipments = new Map();        // shipmentId -> last-known row from Supabase
    this.containers = new Map();       // shipmentId -> DOM element id to render the map into
    this.realtimeChannels = new Map(); // shipmentId -> active Supabase realtime channel
  }

  /**
   * Start tracking a shipment: fetches its current state, renders the map
   * (if a containerId is given) and subscribes to live updates.
   * @param {string} shipmentId
   * @param {string} [containerId] - id of an element to render the live map into
   * @returns {Promise<object>} the shipment row
   */
  async initializeTracking(shipmentId, containerId) {
    const sb = window.sb || window.supabase; // window.sb is the real client created in index.html
    if (!sb) throw new Error('Supabase client not available');

    const shipment = await this.fetchShipmentData(sb, shipmentId);
    this.shipments.set(shipmentId, shipment);
    if (containerId) this.initializeMap(containerId, shipmentId);
    this.subscribeToRealtime(sb, shipmentId);
    return shipment;
  }

  async fetchShipmentData(sb, shipmentId) {
    // Uses the same track_shipment RPC as index.html's own public getShipment()
    // — not a direct sb.from('shipments').select(...). This project routes ALL
    // public/anonymous shipment reads through narrow RPCs (see
    // database-schema.js: track_shipment, admin_list_*_public, etc.) rather
    // than direct table access, which strongly implies RLS on `shipments`
    // does not grant anonymous SELECT directly. A raw .from('shipments')
    // select here — on the one page anonymous customers actually use this
    // module from — would likely be silently blocked by RLS for exactly the
    // visitors it's meant to serve, even though it can appear to work fine
    // when tested while signed in as staff (who may have broader table
    // access through RLS). Confirm this against your actual RLS policies;
    // if `shipments` genuinely does allow anonymous SELECT, either path works.
    const { data, error } = await sb.rpc('track_shipment', { p_id: shipmentId });
    if (error) throw error;
    const row = data && data[0];
    if (!row) throw new Error('Shipment not found');
    return row;
  }

  // Correct v2 realtime syntax: channel().on().subscribe()
  // Note: Supabase Realtime's postgres_changes is itself RLS-gated — it
  // can only be subscribed through a direct table+filter (no RPC
  // equivalent exists), so if RLS turns out not to allow anonymous
  // SELECT on `shipments` (see the comment on fetchShipmentData above),
  // this subscription will silently receive nothing for a signed-out
  // visitor even though the initial map (fetched via the RPC) still
  // renders fine. Degrades gracefully either way — worst case here is
  // "the map doesn't auto-update without a re-search", not a crash — but
  // if you want the live-update part working for anonymous customers too,
  // that's a Supabase RLS policy change, not something fixable from here.
  subscribeToRealtime(sb, shipmentId) {
    this.unsubscribeChannel(shipmentId); // drop any previous channel for this id, keep shipment/container state

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
      icon: 'logo-icon.png',
      tag: `tracking-${shipmentId}`,
    });
  }

  /** Render (or re-render) the map for a shipment into a specific container id. */
  initializeMap(containerId, shipmentId) {
    this.containers.set(shipmentId, containerId);
    this.renderMap(shipmentId);
  }

  /** Re-render into whichever container was registered for this shipment. */
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

  async requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  }

  /** Stop tracking a shipment entirely (unsubscribe + free its state). Call on page/section unmount. */
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
