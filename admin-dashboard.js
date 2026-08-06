// Admin Dashboard Analytics Engine
// Aligned with the live Globall Cloud Supabase schema.

class AdminDashboard {
  constructor() {
    this.metrics = new Map();
    this.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.endDate = new Date();
    this.refreshInterval = 300000;
    this.initializeDashboard();
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
      const supabase = window.supabase;
      if (!supabase) return null;

      const [shipmentsRes, customersRes, receiptsRes, messagesRes] = await Promise.all([
        supabase
          .from('shipments')
          .select('id,status,created_at,delivered_at,total_amount,paid_amount,origin_key,dest_key,branch,customer_name,customer_phone,directory_customer_id,current_step_index,eta')
          .gte('created_at', this.startDate.toISOString())
          .lte('created_at', this.endDate.toISOString()),
        supabase
          .from('customer_directory')
          .select('id,name,phone,email,city,delivery_location,created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('warehouse_receipts')
          .select('id,batch_code,location,created_at,received_at,directory_customer_id,created_by_name,consolidated')
          .gte('created_at', this.startDate.toISOString())
          .lte('created_at', this.endDate.toISOString()),
        supabase
          .from('messages')
          .select('id,created_at,company,request_type')
          .gte('created_at', this.startDate.toISOString())
          .lte('created_at', this.endDate.toISOString()),
      ]);

      if (shipmentsRes.error) throw shipmentsRes.error;
      if (customersRes.error) throw customersRes.error;
      if (receiptsRes.error) throw receiptsRes.error;
      if (messagesRes.error) throw messagesRes.error;

      return {
        shipments: shipmentsRes.data || [],
        customers: customersRes.data || [],
        receipts: receiptsRes.data || [],
        messages: messagesRes.data || [],
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return null;
    }
  }

  async calculateMetrics() {
    const data = await this.fetchDashboardData();
    if (!data) return;

    const { shipments, customers, receipts, messages } = data;

    const totalRevenue = shipments.reduce((sum, shipment) => sum + Number(shipment.total_amount || 0), 0);
    const totalDue = shipments.reduce((sum, shipment) => {
      const total = Number(shipment.total_amount || 0);
      const paid = Number(shipment.paid_amount || 0);
      return sum + Math.max(0, total - paid);
    }, 0);

    const deliveredToday = shipments.filter((s) => {
      if (!s.delivered_at || s.status !== 'delivered') return false;
      const deliveredDate = new Date(s.delivered_at).toDateString();
      return deliveredDate === new Date().toDateString();
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
  }

  async generateRevenueReport() {
    const supabase = window.supabase;
    if (!supabase) return null;

    const { data: shipments, error } = await supabase
      .from('shipments')
      .select('created_at,total_amount,origin_key,dest_key,type')
      .gte('created_at', this.startDate.toISOString())
      .lte('created_at', this.endDate.toISOString());

    if (error) throw error;

    const byRoute = {};
    const byDay = {};
    let totalRevenue = 0;

    (shipments || []).forEach((shipment) => {
      const amount = Number(shipment.total_amount || 0);
      totalRevenue += amount;

      const route = `${shipment.origin_key || '—'} → ${shipment.dest_key || '—'}`;
      byRoute[route] = (byRoute[route] || 0) + amount;

      const day = new Date(shipment.created_at).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + amount;
    });

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

    const { shipments } = data;
    const byStatus = {};
    const routePerformance = {};

    shipments.forEach((shipment) => {
      const status = String(shipment.status || 'unknown');
      byStatus[status] = (byStatus[status] || 0) + 1;

      const route = `${shipment.origin_key || '—'} → ${shipment.dest_key || '—'}`;
      if (!routePerformance[route]) {
        routePerformance[route] = { count: 0, delivered: 0, delayed: 0 };
      }
      routePerformance[route].count += 1;
      if (status === 'delivered') routePerformance[route].delivered += 1;
      if (status === 'delayed') routePerformance[route].delayed += 1;
    });

    return {
      totalShipments: shipments.length,
      byStatus,
      routePerformance,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateCustomerInsights() {
    const supabase = window.supabase;
    if (!supabase) return null;

    const [{ data: customers, error: cErr }, { data: shipments, error: sErr }] = await Promise.all([
      supabase.from('customer_directory').select('id,name,phone,email,created_at,city,delivery_location'),
      supabase.from('shipments').select('id,customer_name,customer_phone,customer_email,total_amount,directory_customer_id,customer_user_id,created_at,status'),
    ]);

    if (cErr) throw cErr;
    if (sErr) throw sErr;

    const shipmentRows = shipments || [];
    const customerStats = {};

    customers.forEach((customer) => {
      const linked = shipmentRows.filter((s) => s.directory_customer_id === customer.id || s.customer_phone === customer.phone);
      customerStats[customer.id] = {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        city: customer.city,
        deliveryLocation: customer.delivery_location,
        orderCount: linked.length,
        totalSpent: linked.reduce((sum, s) => sum + Number(s.total_amount || 0), 0),
        joinDate: customer.created_at,
      };
    });

    const topCustomers = Object.entries(customerStats)
      .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
      .slice(0, 10);

    return {
      totalCustomers: customers.length,
      topCustomers,
      customerStats,
      generatedAt: new Date().toISOString(),
    };
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
