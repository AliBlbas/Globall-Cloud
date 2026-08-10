// Admin Dashboard Analytics Engine
// Aligned with the live Globall Cloud Supabase schema.
//
// Analytics now load through the account-admin Edge Function instead of
// querying public tables directly from the browser. This keeps the staff
// console fast while making the database exposure easier to tighten later.

class AdminDashboard {
  constructor(client) {
    this.client = client || window.sb || null;
    this.metrics = new Map();
    this.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.endDate = new Date();
    this.refreshInterval = 300000;
    this.apiBaseUrl = this.resolveApiBaseUrl();
    this.initializeDashboard();
  }

  resolveApiBaseUrl() {
    const base =
      this.client?.supabaseUrl ||
      this.client?.url ||
      window.SUPABASE_URL ||
      'https://ahslifnthiwfkmaswjno.supabase.co';
    return `${String(base).replace(/\/$/, '')}/functions/v1/account-admin`;
  }

  async getSessionToken() {
    const supabase = this.client;
    if (!supabase?.auth?.getSession) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  }

  async edgeGet(kind) {
    const token = await this.getSessionToken();
    if (!token) throw new Error('Please sign in first');

    const res = await fetch(`${this.apiBaseUrl}?kind=${encodeURIComponent(kind)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return Array.isArray(data?.items) ? data.items : [];
  }

  initializeDashboard() {
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
    };

    Object.entries(defs).forEach(([key, meta]) => {
      this.metrics.set(key, { value: 0, trend: 0, ...meta });
    });
  }

  async fetchDashboardData() {
    try {
      if (!this.client) {
        console.error('AdminDashboard: no Supabase client available (pass one to `new AdminDashboard(sb)`)');
        return null;
      }

      const [shipments, customers, receipts, messages] = await Promise.all([
        this.edgeGet('shipment'),
        this.edgeGet('customer'),
        this.edgeGet('receipt'),
        this.edgeGet('log'),
      ]);

      return { shipments, customers, receipts, messages };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return null;
    }
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

    const deliveredToday = shipments.filter((s) => {
      if (!s.delivered_at || s.status !== 'delivered') return false;
      return new Date(s.delivered_at).toDateString() === new Date().toDateString();
    }).length;

    const activeShipments = shipments.filter((s) => !['delivered', 'cancelled'].includes(String(s.status || '').toLowerCase())).length;
    const newCustomers = customers.filter((c) => new Date(c.created_at) >= this.startDate).length;

    const deliveryTimes = shipments
      .filter((s) => s.created_at && s.delivered_at)
      .map((s) => (new Date(s.delivered_at) - new Date(s.created_at)) / (1000 * 60 * 60 * 24))
      .filter((n) => Number.isFinite(n) && n >= 0);

    const avgDeliveryTime = deliveryTimes.length
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : 0;

    const successRate = shipments.length
      ? (shipments.filter((s) => s.status === 'delivered').length / shipments.length) * 100
      : 0;

    this.metrics.set('totalRevenue', { ...this.metrics.get('totalRevenue'), value: Math.round(totalRevenue * 100) / 100 });
    this.metrics.set('totalShipments', { ...this.metrics.get('totalShipments'), value: shipments.length });
    this.metrics.set('activeShipments', { ...this.metrics.get('activeShipments'), value: activeShipments });
    this.metrics.set('deliveredToday', { ...this.metrics.get('deliveredToday'), value: deliveredToday });
    this.metrics.set('totalCustomers', { ...this.metrics.get('totalCustomers'), value: customers.length });
    this.metrics.set('newCustomers', { ...this.metrics.get('newCustomers'), value: newCustomers });
    this.metrics.set('avgDeliveryTime', { ...this.metrics.get('avgDeliveryTime'), value: Number(avgDeliveryTime.toFixed(1)) });
    this.metrics.set('deliverySuccessRate', { ...this.metrics.get('deliverySuccessRate'), value: Number(successRate.toFixed(1)) });
    this.metrics.set('totalReceipts', { ...this.metrics.get('totalReceipts'), value: receipts.length });
    this.metrics.set('totalMessages', { ...this.metrics.get('totalMessages'), value: messages.length });
    this.metrics.set('outstandingBalance', { value: Math.round(totalDue * 100) / 100, trend: 0, unit: 'USD', label: 'Outstanding Balance' });

    return this.metrics;
  }

  async generateRevenueReport() {
    const shipments = await this.edgeGet('shipment');

    const byRoute = {};
    const byDay = {};
    let totalRevenue = 0;

    (shipments || []).forEach((s) => {
      const amount = Number(s.total_amount || 0);
      totalRevenue += amount;
      const route = `${s.origin_key || '—'} → ${s.dest_key || '—'}`;
      byRoute[route] = (byRoute[route] || 0) + amount;
      const day = new Date(s.created_at).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + amount;
    });

    return { totalRevenue: Math.round(totalRevenue * 100) / 100, byRoute, byDay, generatedAt: new Date().toISOString() };
  }

  async generatePerformanceReport() {
    const data = await this.fetchDashboardData();
    if (!data) return null;

    const { shipments } = data;
    const byStatus = {};
    const routePerformance = {};

    shipments.forEach((s) => {
      const status = String(s.status || 'unknown');
      byStatus[status] = (byStatus[status] || 0) + 1;
      const route = `${s.origin_key || '—'} → ${s.dest_key || '—'}`;
      if (!routePerformance[route]) routePerformance[route] = { count: 0, delivered: 0, delayed: 0 };
      routePerformance[route].count += 1;
      if (status === 'delivered') routePerformance[route].delivered += 1;
      if (status === 'delayed') routePerformance[route].delayed += 1;
    });

    return { totalShipments: shipments.length, byStatus, routePerformance, generatedAt: new Date().toISOString() };
  }

  async generateCustomerInsights() {
    const [customers, shipments] = await Promise.all([
      this.edgeGet('customer'),
      this.edgeGet('shipment'),
    ]);

    const customerStats = {};

    customers.forEach((c) => {
      const linked = shipments.filter((s) => s.directory_customer_id === c.id || s.customer_phone === c.phone);
      customerStats[c.id] = {
        name: c.name,
        phone: c.phone,
        email: c.email,
        city: c.city,
        deliveryLocation: c.delivery_location,
        orderCount: linked.length,
        totalSpent: linked.reduce((sum, s) => sum + Number(s.total_amount || 0), 0),
        joinDate: c.created_at,
      };
    });

    const topCustomers = Object.entries(customerStats).sort((a, b) => b[1].totalSpent - a[1].totalSpent).slice(0, 10);

    return { totalCustomers: customers.length, topCustomers, customerStats, generatedAt: new Date().toISOString() };
  }

  startAutoRefresh() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = setInterval(() => this.calculateMetrics(), this.refreshInterval);
  }

  stopAutoRefresh() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = null;
  }
}

if (typeof window !== 'undefined') {
  window.AdminDashboard = AdminDashboard;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdminDashboard };
}
