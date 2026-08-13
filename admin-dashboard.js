// Globall Cloud — Operations analytics adapter
// Reads protected operational data through the authenticated `account-admin` Edge Function.
// This avoids direct browser reads against RLS-protected tables and keeps the dashboard
// aligned with the real production schema.
//
// Schema note: shipments does not have a `status` or `delivered_at` column.
// Delivery is inferred from `step_dates.delivered` / `current_step_index`.
// Never assume columns that are not present in the live schema.

class AdminDashboard {
  constructor(client) {
    this.client = client || window.sb || null;
    this.metrics = new Map();
    this.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.endDate = new Date();
    this.refreshInterval = 300000;
    this._refreshTimer = null;
    this.setupMetrics();
    this.startAutoRefresh();
  }

  setupMetrics() {
    const defs = {
      totalRevenue: { unit: 'USD', label: 'Total Revenue' },
      totalShipments: { unit: 'count', label: 'Total Shipments' },
      activeShipments: { unit: 'count', label: 'Active Shipments' },
      deliveredToday: { unit: 'count', label: 'Delivered Today' },
      totalCustomers: { unit: 'count', label: 'Total Customers' },
      newCustomers: { unit: 'count', label: 'New Customers (30d)' },
      avgDeliveryTime: { unit: 'days', label: 'Avg Delivery Time' },
      deliverySuccessRate: { unit: '%', label: 'Success Rate' },
      totalReceipts: { unit: 'count', label: 'Warehouse Receipts' },
      totalMessages: { unit: 'count', label: 'Messages' },
      outstandingBalance: { unit: 'USD', label: 'Outstanding Balance' },
    };
    Object.entries(defs).forEach(([key, meta]) => {
      this.metrics.set(key, { value: 0, trend: 0, ...meta });
    });
  }

  async getSession() {
    const client = this.client || window.sb;
    if (!client?.auth) throw new Error('Supabase client is not available');
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error('Staff session is required');
    return data.session;
  }

  async edgeList(kind) {
    const session = await this.getSession();
    const client = this.client || window.sb;
    const baseUrl = `${client.supabaseUrl || ''}/functions/v1/account-admin`;
    if (!baseUrl.startsWith('http')) throw new Error('Supabase project URL is unavailable');
    const response = await fetch(`${baseUrl}?kind=${encodeURIComponent(kind)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: client.supabaseKey,
      },
      cache: 'no-store',
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { error: text }; }
    if (!response.ok) throw new Error(payload?.error || `account-admin failed (${response.status})`);
    return Array.isArray(payload?.items) ? payload.items : [];
  }

  async fetchDashboardData() {
    try {
      const [shipments, customers, receipts, logs] = await Promise.all([
        this.edgeList('shipment'),
        this.edgeList('customer'),
        this.edgeList('receipt'),
        this.edgeList('log'),
      ]);

      // Messages are intentionally not queried directly because the current account-admin
      // contract does not expose them. A recent activity count remains useful and safe.
      return { shipments, customers, receipts, logs, messages: [] };
    } catch (error) {
      console.error('AdminDashboard: protected data load failed', error);
      return null;
    }
  }

  isDelivered(shipment) {
    const deliveredAt = shipment?.step_dates?.delivered;
    return Boolean(deliveredAt) || Number(shipment?.current_step_index || 0) >= 5;
  }

  deliveredAt(shipment) {
    return shipment?.step_dates?.delivered || null;
  }

  async calculateMetrics() {
    const data = await this.fetchDashboardData();
    if (!data) return null;

    const { shipments, customers, receipts, messages } = data;
    const totalRevenue = shipments.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const totalDue = shipments.reduce((sum, s) => {
      const total = Number(s.total_amount || 0);
      const paid = Number(s.paid_amount || 0);
      return sum + Math.max(0, total - paid);
    }, 0);

    const delivered = shipments.filter((s) => this.isDelivered(s));
    const activeShipments = shipments.filter((s) => !this.isDelivered(s)).length;
    const deliveredToday = delivered.filter((s) => {
      const at = this.deliveredAt(s);
      return at && new Date(at).toDateString() === new Date().toDateString();
    }).length;
    const newCustomers = customers.filter((c) => new Date(c.created_at) >= this.startDate).length;

    const deliveryTimes = delivered
      .map((s) => {
        const deliveredAt = this.deliveredAt(s);
        if (!s.created_at || !deliveredAt) return null;
        return (new Date(deliveredAt) - new Date(s.created_at)) / (1000 * 60 * 60 * 24);
      })
      .filter((n) => Number.isFinite(n) && n >= 0);

    const avgDeliveryTime = deliveryTimes.length
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : 0;
    const successRate = shipments.length ? (delivered.length / shipments.length) * 100 : 0;

    const set = (key, value) => this.metrics.set(key, { ...this.metrics.get(key), value });
    set('totalRevenue', Math.round(totalRevenue * 100) / 100);
    set('totalShipments', shipments.length);
    set('activeShipments', activeShipments);
    set('deliveredToday', deliveredToday);
    set('totalCustomers', customers.length);
    set('newCustomers', newCustomers);
    set('avgDeliveryTime', Number(avgDeliveryTime.toFixed(1)));
    set('deliverySuccessRate', Number(successRate.toFixed(1)));
    set('totalReceipts', receipts.length);
    set('totalMessages', messages.length);
    set('outstandingBalance', Math.round(totalDue * 100) / 100);

    return this.metrics;
  }

  async generateRevenueReport() {
    const data = await this.fetchDashboardData();
    if (!data) return null;
    const byRoute = {};
    const byDay = {};
    let totalRevenue = 0;

    for (const s of data.shipments) {
      const amount = Number(s.total_amount || 0);
      totalRevenue += amount;
      const route = `${s.origin_key || '—'} → ${s.dest_key || '—'}`;
      byRoute[route] = (byRoute[route] || 0) + amount;
      if (s.created_at) {
        const day = new Date(s.created_at).toISOString().slice(0, 10);
        byDay[day] = (byDay[day] || 0) + amount;
      }
    }

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      byRoute,
      byDay,
      generatedAt: new Date().toISOString(),
    };
  }

  async generatePerformanceReport() {
    const data = await this.fetchDashboardData();
    if (!data) return null;

    const byProgress = {};
    const routePerformance = {};
    for (const s of data.shipments) {
      const progress = this.isDelivered(s) ? 'delivered' : `step-${Number(s.current_step_index || 0)}`;
      byProgress[progress] = (byProgress[progress] || 0) + 1;
      const route = `${s.origin_key || '—'} → ${s.dest_key || '—'}`;
      if (!routePerformance[route]) routePerformance[route] = { count: 0, delivered: 0 };
      routePerformance[route].count += 1;
      if (this.isDelivered(s)) routePerformance[route].delivered += 1;
    }

    return {
      totalShipments: data.shipments.length,
      byProgress,
      routePerformance,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateCustomerInsights() {
    const data = await this.fetchDashboardData();
    if (!data) return null;

    const customerStats = {};
    for (const c of data.customers) {
      const linked = data.shipments.filter((s) => s.directory_customer_id === c.id || s.customer_phone === c.phone);
      customerStats[c.id] = {
        name: c.name,
        phone: c.phone,
        email: c.email,
        city: c.city,
        deliveryLocation: c.delivery_location,
        orderCount: linked.length,
        totalSpent: linked.reduce((sum, s) => sum + Number(s.total_amount || 0), 0),
        outstanding: linked.reduce((sum, s) => sum + Math.max(0, Number(s.total_amount || 0) - Number(s.paid_amount || 0)), 0),
        joinDate: c.created_at,
      };
    }

    const topCustomers = Object.entries(customerStats)
      .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
      .slice(0, 10);

    return {
      totalCustomers: data.customers.length,
      topCustomers,
      customerStats,
      generatedAt: new Date().toISOString(),
    };
  }

  startAutoRefresh() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = setInterval(() => {
      this.calculateMetrics().catch((error) => console.debug('Analytics refresh skipped:', error?.message || error));
    }, this.refreshInterval);
  }

  stopAutoRefresh() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = null;
  }
}

if (typeof window !== 'undefined') window.AdminDashboard = AdminDashboard;
if (typeof module !== 'undefined' && module.exports) module.exports = { AdminDashboard };
