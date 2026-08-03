// Admin Dashboard Analytics Engine
// Real-time metrics, reports, and business intelligence

class AdminDashboard {
  constructor() {
    this.metrics = new Map();
    this.reports = new Map();
    this.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    this.endDate = new Date();
    this.refreshInterval = 300000; // 5 minutes
    this.initializeDashboard();
  }

  initializeDashboard() {
    this.setupMetrics();
    this.startAutoRefresh();
  }

  setupMetrics() {
    // Revenue metrics
    this.metrics.set('totalRevenue', {
      value: 0,
      trend: 0,
      unit: 'USD',
      label: 'Total Revenue'
    });

    // Shipment metrics
    this.metrics.set('totalShipments', {
      value: 0,
      trend: 0,
      unit: 'count',
      label: 'Total Shipments'
    });

    this.metrics.set('activeShipments', {
      value: 0,
      trend: 0,
      unit: 'count',
      label: 'Active Shipments'
    });

    this.metrics.set('deliveredToday', {
      value: 0,
      trend: 0,
      unit: 'count',
      label: 'Delivered Today'
    });

    // Customer metrics
    this.metrics.set('totalCustomers', {
      value: 0,
      trend: 0,
      unit: 'count',
      label: 'Total Customers'
    });

    this.metrics.set('newCustomers', {
      value: 0,
      trend: 0,
      unit: 'count',
      label: 'New Customers (30d)'
    });

    // Performance metrics
    this.metrics.set('avgDeliveryTime', {
      value: 0,
      trend: 0,
      unit: 'days',
      label: 'Avg Delivery Time'
    });

    this.metrics.set('deliverySuccessRate', {
      value: 0,
      trend: 0,
      unit: '%',
      label: 'Success Rate'
    });
  }

  // Fetch dashboard data from Supabase
  async fetchDashboardData() {
    try {
      const { data: shipments } = await window.supabase
        .from('shipments')
        .select('*')
        .gte('created_at', this.startDate.toISOString())
        .lte('created_at', this.endDate.toISOString());

      const { data: customers } = await window.supabase
        .from('customers')
        .select('*');

      const { data: orders } = await window.supabase
        .from('orders')
        .select('*')
        .gte('created_at', this.startDate.toISOString());

      return { shipments, customers, orders };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return null;
    }
  }

  // Calculate key metrics
  async calculateMetrics() {
    const data = await this.fetchDashboardData();
    if (!data) return;

    const { shipments, customers, orders } = data;

    // Calculate revenue
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
    this.metrics.get('totalRevenue').value = Math.round(totalRevenue * 100) / 100;

    // Calculate shipment metrics
    this.metrics.get('totalShipments').value = shipments.length;
    this.metrics.get('activeShipments').value = shipments.filter(s => s.status !== 'delivered' && s.status !== 'cancelled').length;
    this.metrics.get('deliveredToday').value = shipments.filter(s => {
      const deliveredDate = new Date(s.delivered_at);
      const today = new Date();
      return deliveredDate.toDateString() === today.toDateString() && s.status === 'delivered';
    }).length;

    // Calculate customer metrics
    this.metrics.get('totalCustomers').value = customers.length;
    const newCustomersCount = customers.filter(c => {
      const createdDate = new Date(c.created_at);
      return createdDate >= this.startDate;
    }).length;
    this.metrics.get('newCustomers').value = newCustomersCount;

    // Calculate performance metrics
    const deliveryTimes = shipments
      .filter(s => s.delivered_at && s.created_at)
      .map(s => {
        const created = new Date(s.created_at);
        const delivered = new Date(s.delivered_at);
        return (delivered - created) / (1000 * 60 * 60 * 24); // Convert to days
      });
    const avgDeliveryTime = deliveryTimes.length > 0
      ? (deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length).toFixed(1)
      : 0;
    this.metrics.get('avgDeliveryTime').value = avgDeliveryTime;

    const successCount = shipments.filter(s => s.status === 'delivered').length;
    const successRate = shipments.length > 0 ? ((successCount / shipments.length) * 100).toFixed(1) : 0;
    this.metrics.get('deliverySuccessRate').value = successRate;
  }

  // Generate revenue report
  async generateRevenueReport() {
    const { data: orders } = await window.supabase
      .from('orders')
      .select('created_at, total_cost, shipment_type')
      .gte('created_at', this.startDate.toISOString())
      .lte('created_at', this.endDate.toISOString());

    const revenueByType = {};
    const revenueByDay = {};

    orders.forEach(order => {
      // Group by shipment type
      if (!revenueByType[order.shipment_type]) {
        revenueByType[order.shipment_type] = 0;
      }
      revenueByType[order.shipment_type] += order.total_cost;

      // Group by day
      const day = new Date(order.created_at).toLocaleDateString();
      if (!revenueByDay[day]) {
        revenueByDay[day] = 0;
      }
      revenueByDay[day] += order.total_cost;
    });

    return {
      totalRevenue: Object.values(revenueByType).reduce((a, b) => a + b, 0),
      byType: revenueByType,
      byDay: revenueByDay,
      generatedAt: new Date()
    };
  }

  // Generate shipment performance report
  async generatePerformanceReport() {
    const { data: shipments } = await window.supabase
      .from('shipments')
      .select('*')
      .gte('created_at', this.startDate.toISOString())
      .lte('created_at', this.endDate.toISOString());

    const statusCounts = {};
    const routePerformance = {};

    shipments.forEach(shipment => {
      // Count by status
      if (!statusCounts[shipment.status]) {
        statusCounts[shipment.status] = 0;
      }
      statusCounts[shipment.status]++;

      // Performance by route
      const route = `${shipment.origin} → ${shipment.destination}`;
      if (!routePerformance[route]) {
        routePerformance[route] = {
          count: 0,
          delivered: 0,
          delayed: 0
        };
      }
      routePerformance[route].count++;
      if (shipment.status === 'delivered') routePerformance[route].delivered++;
      if (shipment.status === 'delayed') routePerformance[route].delayed++;
    });

    return {
      totalShipments: shipments.length,
      byStatus: statusCounts,
      routePerformance: routePerformance,
      generatedAt: new Date()
    };
  }

  // Generate customer insights report
  async generateCustomerInsights() {
    const { data: customers } = await window.supabase
      .from('customers')
      .select('id, created_at, email, phone');

    const { data: orders } = await window.supabase
      .from('orders')
      .select('customer_id, total_cost');

    const customerStats = {};

    customers.forEach(customer => {
      const customerOrders = orders.filter(o => o.customer_id === customer.id);
      customerStats[customer.id] = {
        email: customer.email,
        phone: customer.phone,
        orderCount: customerOrders.length,
        totalSpent: customerOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0),
        joinDate: customer.created_at
      };
    });

    // Top customers
    const topCustomers = Object.entries(customerStats)
      .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
      .slice(0, 10);

    return {
      totalCustomers: customers.length,
      topCustomers: topCustomers,
      customerStats: customerStats,
      generatedAt: new Date()
    };
  }

  // Get dashboard HTML
  getDashboardHTML() {
    const metricsHTML = Array.from(this.metrics.values()).map(metric => `
      <div class="admin-stat-card">
        <b>${metric.value.toLocaleString()} ${metric.unit}</b>
        <span>${metric.label}</span>
        <div class="trend-indicator" data-trend="${metric.trend > 0 ? 'up' : 'down'}"></div>
      </div>
    `).join('');

    return `
      <div class="admin-dashboard">
        <h1>📊 Dashboard</h1>
        <div class="admin-stats">
          ${metricsHTML}
        </div>
        <div class="admin-charts-grid">
          <div id="revenueChart" class="admin-chart-card">
            <b>Revenue Trend</b>
            <canvas id="revenueChartCanvas"></canvas>
          </div>
          <div id="shipmentChart" class="admin-chart-card">
            <b>Shipment Status</b>
            <canvas id="shipmentChartCanvas"></canvas>
          </div>
        </div>
      </div>
    `;
  }

  // Start auto refresh
  startAutoRefresh() {
    setInterval(() => {
      this.calculateMetrics();
    }, this.refreshInterval);
  }
}

// Initialize global dashboard
window.adminDashboard = new AdminDashboard();
