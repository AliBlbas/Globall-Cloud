// Enhanced Tracking (optional add-on) — Globall Cloud
//
// Adds a small live SVG route map + realtime shipment updates + browser
// notifications on top of the public tracking page in index.html.

const TRACKING_STEP_KEYS = ['placed', 'pickedUp', 'transit', 'customs', 'outForDelivery', 'delivered'];

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
    this.lastEventIds = new Map();
  }

  async initializeTracking(shipmentId, containerId) {
    const sb = window.sb || window.supabase;
    if (!sb) throw new Error('Supabase client not available');

    const shipment = await this.fetchShipmentData(sb, shipmentId);
    this.shipments.set(shipmentId, shipment);
    if (containerId) this.initializeMap(containerId, shipmentId);
    await this.loadPublicEvents(shipmentId);
    this.subscribeToRealtime(sb, shipmentId);
    return shipment;
  }

  async fetchShipmentData(sb, shipmentId) {
    try {
      const { data, error } = await sb.rpc('track_shipment', { p_id: shipmentId });
      if (!error && data?.[0]) return data[0];
    } catch (_) {
      // The legacy RPC is optional. Fall through to the hardened public endpoint.
    }

    const projectUrl = window.gcSupabaseConfig?.url || 'https://ahslifnthiwfkmaswjno.supabase.co';
    const response = await fetch(
      `${projectUrl}/functions/v1/public-track?id=${encodeURIComponent(shipmentId)}`,
      { method: 'GET', headers: { Accept: 'application/json', apikey: this.getPublishableKey() }, cache: 'no-store' },
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body?.shipment) throw new Error(body?.error || 'Shipment not found');
    return body.shipment;
  }

  getPublishableKey() {
    return window.gcSupabaseConfig?.publishableKey || 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  }

  async loadPublicEvents(shipmentId) {
    try {
      const projectUrl = window.gcSupabaseConfig?.url || 'https://ahslifnthiwfkmaswjno.supabase.co';
      const response = await fetch(
        `${projectUrl}/functions/v1/public-track?id=${encodeURIComponent(shipmentId)}`,
        { method: 'GET', headers: { Accept: 'application/json', apikey: this.getPublishableKey() }, cache: 'no-store' },
      );
      if (!response.ok) return;
      const body = await response.json().catch(() => ({}));
      const events = Array.isArray(body.events) ? body.events : [];
      if (events.length) {
        this.shipments.get(shipmentId).tracking_events = events;
        const latest = events[0];
        this.lastEventIds.set(shipmentId, latest.id);
        this.emit('events', { shipmentId, events });
      }
    } catch (_) {
      // Tracking remains functional even if history cannot be loaded.
    }
  }

  subscribeToRealtime(sb, shipmentId) {
    this.unsubscribeChannel(shipmentId);
    const channel = sb
      .channel(`shipment-live-${shipmentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shipments', filter: `id=eq.${shipmentId}` },
        (payload) => this.handleRealtimeUpdate(shipmentId, payload)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shipment_tracking_events', filter: `shipment_id=eq.${shipmentId}` },
        (payload) => this.handleRealtimeEventInsert(shipmentId, payload)
      )
      .subscribe((status) => {
        this.emit('realtime', { shipmentId, status });
      });
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
    if (!shipment || !payload?.new) return;
    const previousStep = shipment.current_step_index;
    Object.assign(shipment, payload.new);
    this.triggerNotification(shipmentId, payload.new, previousStep);
    this.renderMap(shipmentId);
    this.emit('shipment', { shipmentId, shipment });
  }

  handleRealtimeEventInsert(shipmentId, payload) {
    const event = payload?.new;
    if (!event) return;
    const lastId = this.lastEventIds.get(shipmentId);
    if (lastId !== undefined && String(lastId) === String(event.id)) return;
    this.lastEventIds.set(shipmentId, event.id);
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) return;
    const events = Array.isArray(shipment.tracking_events) ? shipment.tracking_events : [];
    shipment.tracking_events = [event, ...events.filter((item) => String(item.id) !== String(event.id))].slice(0, 50);
    this.triggerEventNotification(shipmentId, event);
    this.renderMap(shipmentId);
    this.emit('event', { shipmentId, event, events: shipment.tracking_events });
  }

  triggerNotification(shipmentId, shipmentData, previousStep) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const stepIndex = shipmentData.current_step_index ?? 0;
    const stepKey = TRACKING_STEP_KEYS[stepIndex] || 'unknown';
    const changedStep = previousStep !== undefined && Number(previousStep) !== Number(stepIndex);
    if (!changedStep) return;
    new Notification('🚚 Globall Cloud', {
      body: `${shipmentId}: ${stepKey}`,
      icon: '/logo-icon.svg',
      tag: `tracking-${shipmentId}-step-${stepIndex}`,
    });
  }

  triggerEventNotification(shipmentId, event) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    new Notification('🚚 Globall Cloud', {
      body: event.title || event.status_key || `Tracking update: ${shipmentId}`,
      icon: '/logo-icon.svg',
      tag: `tracking-${shipmentId}-event-${event.id}`,
    });
  }

  emit(type, detail) {
    window.dispatchEvent(new CustomEvent(`gc:tracking-${type}`, { detail }));
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
    const etaText = shipment.eta ? new Date(shipment.eta).toLocaleString('ku-IQ', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
    const liveLabel = shipment.current_location_label || 'شوێنی ئێستا لە بەردەست نییە';

    return `
      <div class="live-map-container" data-live-shipment="${String(shipmentId).replace(/[^a-zA-Z0-9_-]/g, '')}">
        <div class="map-summary">
          <span class="map-summary-route">${this.escape(shipment.origin_key || '—')} → ${this.escape(shipment.dest_key || '—')}</span>
          <span class="map-summary-eta">ETA: ${this.escape(etaText)}</span>
        </div>
        <div class="map-live-label">● LIVE · ${this.escape(liveLabel)}</div>
        <svg viewBox="0 0 1000 600" class="route-visualization" aria-label="Live shipment route">
          <circle cx="150" cy="300" r="15" class="map-point origin-point"/>
          <text x="150" y="330" text-anchor="middle" class="map-label">${this.escape(shipment.origin_key || '—')}</text>
          <circle cx="${progressX}" cy="270" r="12" class="map-point current-point">
            <animate attributeName="r" values="12;18;12" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <polyline points="150,300 350,285 500,270 700,255 850,300" fill="none" class="route-line" stroke-dasharray="5,5"/>
          <circle cx="850" cy="300" r="15" class="map-point dest-point"/>
          <text x="850" y="330" text-anchor="middle" class="map-label">${this.escape(shipment.dest_key || '—')}</text>
        </svg>
        <div class="map-legend">
          <span class="legend-item"><span class="dot" style="background:#22C55E"></span> کۆگا</span>
          <span class="legend-item"><span class="dot" style="background:#00D4FF"></span> ئێستا</span>
          <span class="legend-item"><span class="dot" style="background:#E5533D"></span> مەبەست</span>
        </div>
      </div>
    `;
  }

  escape(value) {
    return String(value ?? '—').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  async requestNotificationPermission() {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  }

  cleanup(shipmentId) {
    this.unsubscribeChannel(shipmentId);
    this.shipments.delete(shipmentId);
    this.containers.delete(shipmentId);
    this.lastEventIds.delete(shipmentId);
  }
}

window.enhancedTracking = new EnhancedTracking();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnhancedTracking };
}
