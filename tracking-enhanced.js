// Enhanced Tracking System - Globall Cloud
// Features: Live Map, Real-time Notifications, Detailed Timeline

class EnhancedTracking {
  constructor() {
    this.shipments = new Map();
    this.notificationQueue = [];
    this.mapInstances = new Map();
    this.realtimeSubscriptions = new Map();
  }

  // Initialize tracking for a shipment
  async initializeTracking(shipmentId) {
    try {
      const shipment = await this.fetchShipmentData(shipmentId);
      this.shipments.set(shipmentId, shipment);
      this.subscribeToRealtime(shipmentId);
      return shipment;
    } catch (error) {
      console.error('Error initializing tracking:', error);
      throw error;
    }
  }

  // Fetch shipment data from Supabase
  async fetchShipmentData(shipmentId) {
    const { data, error } = await window.supabase
      .from('shipments')
      .select('*')
      .eq('id', shipmentId)
      .single();

    if (error) throw error;
    return data;
  }

  // Subscribe to real-time updates
  subscribeToRealtime(shipmentId) {
    const subscription = window.supabase
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments',
          filter: `id=eq.${shipmentId}`
        },
        (payload) => {
          this.handleRealtimeUpdate(shipmentId, payload);
        }
      )
      .subscribe();

    this.realtimeSubscriptions.set(shipmentId, subscription);
  }

  // Handle real-time updates from Supabase
  handleRealtimeUpdate(shipmentId, payload) {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) return;

    // Update local state
    Object.assign(shipment, payload.new);

    // Trigger notifications
    this.triggerNotification(shipmentId, payload.new);

    // Update UI
    this.updateTrackingUI(shipmentId);
  }

  // Trigger browser notification
  triggerNotification(shipmentId, shipmentData) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const status = shipmentData.status || 'Unknown';
    const message = this.getNotificationMessage(status);

    new Notification('🚚 Globall Cloud Tracking Update', {
      body: `Shipment ${shipmentId}: ${message}`,
      icon: 'logo-icon.png',
      tag: `tracking-${shipmentId}`,
      requireInteraction: true
    });
  }

  // Get notification message based on status
  getNotificationMessage(status) {
    const messages = {
      'pending': '⏳ Your shipment is being processed',
      'warehouse': '📦 Package arrived at warehouse',
      'transit': '✈️ Your shipment is in transit',
      'customs': '🔍 Customs clearance in progress',
      'delivery': '🚛 Out for delivery',
      'delivered': '✅ Successfully delivered',
      'delayed': '⚠️ Shipment delayed - contact support'
    };
    return messages[status] || 'Status updated';
  }

  // Initialize live map
  initializeMap(containerId, shipmentId) {
    const mapElement = document.getElementById(containerId);
    if (!mapElement) return;

    // Create SVG-based map or integrate with mapping library
    const mapHTML = this.generateMapHTML(shipmentId);
    mapElement.innerHTML = mapHTML;
    this.mapInstances.set(shipmentId, mapElement);
  }

  // Generate map HTML with route visualization
  generateMapHTML(shipmentId) {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) return '';

    return `
      <div class="live-map-container">
        <svg viewBox="0 0 1000 600" class="route-visualization">
          <!-- Origin -->
          <circle cx="150" cy="300" r="15" fill="#22C55E" class="map-point origin-point"/>
          <text x="150" y="330" text-anchor="middle" class="map-label">${shipment.origin}</text>

          <!-- Current Position -->
          <circle cx="500" cy="250" r="12" fill="#00D4FF" class="map-point current-point">
            <animate attributeName="r" values="12;18;12" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <text x="500" y="280" text-anchor="middle" class="map-label">Current Location</text>

          <!-- Route Line -->
          <polyline points="150,300 350,280 500,250 700,200 850,300" 
                    fill="none" stroke="#1677FF" stroke-width="3" stroke-dasharray="5,5"
                    class="route-line"/>

          <!-- Destination -->
          <circle cx="850" cy="300" r="15" fill="#E5533D" class="map-point dest-point"/>
          <text x="850" y="330" text-anchor="middle" class="map-label">${shipment.destination}</text>
        </svg>
        <div class="map-legend">
          <span class="legend-item"><span class="dot" style="background:#22C55E"></span> Origin</span>
          <span class="legend-item"><span class="dot" style="background:#00D4FF"></span> Current</span>
          <span class="legend-item"><span class="dot" style="background:#E5533D"></span> Destination</span>
        </div>
      </div>
    `;
  }

  // Update tracking UI
  updateTrackingUI(shipmentId) {
    const shipment = this.shipments.get(shipmentId);
    const container = document.getElementById(`tracking-${shipmentId}`);
    if (!container) return;

    container.innerHTML = this.generateTrackingHTML(shipment);
  }

  // Generate detailed tracking timeline
  generateTrackingHTML(shipment) {
    const timeline = this.generateTimeline(shipment);
    const statusBadge = this.getStatusBadge(shipment.status);

    return `
      <div class="tracking-details">
        <div class="tracking-header">
          <h3>${shipment.id}</h3>
          ${statusBadge}
        </div>
        <div class="tracking-route">
          <strong>${shipment.origin}</strong> → <strong>${shipment.destination}</strong>
        </div>
        <div class="tracking-progress">
          <div class="progress-bar" style="width: ${shipment.progress || 0}%"></div>
        </div>
        ${timeline}
      </div>
    `;
  }

  // Generate timeline of events
  generateTimeline(shipment) {
    const events = shipment.events || [];
    const timelineHTML = events.map((event, index) => `
      <div class="timeline-item ${event.completed ? 'completed' : 'pending'}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <strong>${event.status}</strong>
          <p>${event.location || 'N/A'}</p>
          <span class="timeline-date">${new Date(event.timestamp).toLocaleString()}</span>
        </div>
      </div>
    `).join('');

    return `<div class="timeline">${timelineHTML}</div>`;
  }

  // Get status badge HTML
  getStatusBadge(status) {
    const badges = {
      'pending': '<span class="badge badge-warning">⏳ Pending</span>',
      'transit': '<span class="badge badge-info">✈️ In Transit</span>',
      'delivered': '<span class="badge badge-success">✅ Delivered</span>',
      'delayed': '<span class="badge badge-danger">⚠️ Delayed</span>'
    };
    return badges[status] || '<span class="badge">Status Unknown</span>';
  }

  // Request notification permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Cleanup subscriptions
  cleanup(shipmentId) {
    const subscription = this.realtimeSubscriptions.get(shipmentId);
    if (subscription) {
      window.supabase.removeSubscription(subscription);
      this.realtimeSubscriptions.delete(shipmentId);
    }
    this.shipments.delete(shipmentId);
    this.mapInstances.delete(shipmentId);
  }
}

// Initialize global tracking instance
window.enhancedTracking = new EnhancedTracking();
