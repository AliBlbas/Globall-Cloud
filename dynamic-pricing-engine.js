// Dynamic Pricing Engine - Real-time Price Adjustment
// Prices update based on weight, distance, demand, fuel costs

class DynamicPricingEngine {
  constructor() {
    this.basePrices = new Map();
    this.priceHistory = [];
    this.marketData = new Map();
    this.lastUpdate = Date.now();
    this.updateInterval = 3600000; // 1 hour
    this.initializePricing();
    this.startAutoUpdate();
  }

  // Initialize base pricing
  initializePricing() {
    this.basePrices.set('air', {
      perKg: 8.5,
      range: { min: 5.0, max: 15.0 },
      lastPrice: 8.5,
      volatility: 0.15 // 15% volatility
    });

    this.basePrices.set('sea', {
      perCbm: 450,
      range: { min: 300, max: 600 },
      lastPrice: 450,
      volatility: 0.12
    });

    this.basePrices.set('land', {
      perKg: 3.5,
      range: { min: 2.0, max: 5.5 },
      lastPrice: 3.5,
      volatility: 0.10
    });
  }

  // Get current price with dynamic adjustment
  getCurrentPrice(shipmentType, weight = 1, origin = 'China', destination = 'Iraq') {
    const basePrice = this.basePrices.get(shipmentType);
    if (!basePrice) return null;

    // Calculate adjustments
    const demandMultiplier = this.getDemandMultiplier(shipmentType);
    const seasonalMultiplier = this.getSeasonalMultiplier();
    const fuelMultiplier = this.getFuelSurcharge();
    const distanceMultiplier = this.getDistanceMultiplier(origin, destination);
    const weightMultiplier = this.getWeightMultiplier(weight, shipmentType);

    let currentPrice = basePrice.lastPrice;
    currentPrice *= demandMultiplier;
    currentPrice *= seasonalMultiplier;
    currentPrice *= fuelMultiplier;
    currentPrice *= distanceMultiplier;
    currentPrice *= weightMultiplier;

    // Ensure price stays within acceptable range
    currentPrice = Math.max(basePrice.range.min, Math.min(currentPrice, basePrice.range.max));

    return {
      type: shipmentType,
      basePrice: basePrice.lastPrice,
      currentPrice: Math.round(currentPrice * 100) / 100,
      multipliers: {
        demand: demandMultiplier,
        seasonal: seasonalMultiplier,
        fuel: fuelMultiplier,
        distance: distanceMultiplier,
        weight: weightMultiplier
      },
      timestamp: new Date(),
      priceChangePercent: ((currentPrice - basePrice.lastPrice) / basePrice.lastPrice * 100).toFixed(2)
    };
  }

  // Get demand multiplier based on current bookings
  getDemandMultiplier(shipmentType) {
    const demand = this.marketData.get(`${shipmentType}_demand`) || 1.0;
    // High demand = higher prices
    return Math.min(1.5, Math.max(0.8, demand));
  }

  // Get seasonal multiplier
  getSeasonalMultiplier() {
    const month = new Date().getMonth();
    const season = {
      0: 1.15,  // January - winter surge
      1: 1.15,  // February
      2: 1.10,  // March - spring
      3: 1.05,
      4: 0.95,  // May - off-season
      5: 0.90,  // June - off-season
      6: 0.90,
      7: 1.00,  // August
      8: 1.05,  // September
      9: 1.15,  // October - peak
      10: 1.20, // November - peak
      11: 1.25  // December - holiday surge
    };
    return season[month] || 1.0;
  }

  // Get fuel surcharge
  getFuelSurcharge() {
    const baseOilPrice = 70; // USD per barrel (reference)
    const currentOilPrice = this.marketData.get('oil_price') || baseOilPrice;
    const surcharge = 1 + ((currentOilPrice - baseOilPrice) / baseOilPrice * 0.5);
    return Math.max(0.95, Math.min(1.30, surcharge));
  }

  // Get distance multiplier
  getDistanceMultiplier(origin, destination) {
    const distanceKm = this.calculateDistance(origin, destination);
    // Base distance = 1000km
    return Math.max(0.8, Math.min(1.5, distanceKm / 1000));
  }

  // Get weight-based multiplier
  getWeightMultiplier(weight, shipmentType) {
    if (shipmentType === 'air') {
      // Volume discount for heavy loads
      if (weight > 1000) return 0.85;
      if (weight > 500) return 0.90;
      if (weight > 100) return 0.95;
    } else if (shipmentType === 'sea') {
      if (weight > 5000) return 0.80;
      if (weight > 1000) return 0.90;
    }
    return 1.0;
  }

  // Calculate distance between cities
  calculateDistance(origin, destination) {
    const distances = {
      'China-Iraq': 6000,
      'China-UAE': 4800,
      'UAE-Iraq': 1200,
      'Erbil-Baghdad': 350,
      'Baghdad-Basra': 550,
      'Erbil-Basra': 900
    };
    const key = `${origin}-${destination}`;
    return distances[key] || 1000; // Default 1000km
  }

  // Update market data (call from backend)
  async updateMarketData() {
    try {
      // Fetch real-time market data
      const response = await fetch('https://api.example.com/market-data');
      const data = await response.json();

      this.marketData.set('oil_price', data.oil_price);
      this.marketData.set('air_demand', data.air_demand);
      this.marketData.set('sea_demand', data.sea_demand);
      this.marketData.set('land_demand', data.land_demand);

      // Update base prices with slight random variation
      this.applyPriceAdjustment();

      this.lastUpdate = Date.now();
      console.log('Market data updated:', this.marketData);
    } catch (error) {
      console.error('Error updating market data:', error);
    }
  }

  // Apply random price adjustment (simulates market fluctuation)
  applyPriceAdjustment() {
    for (let [type, priceData] of this.basePrices) {
      const volatility = priceData.volatility;
      const change = (Math.random() - 0.5) * 2 * volatility; // -volatility to +volatility
      const newPrice = priceData.lastPrice * (1 + change);
      priceData.lastPrice = Math.max(priceData.range.min, Math.min(newPrice, priceData.range.max));

      // Store in history
      this.priceHistory.push({
        type,
        price: priceData.lastPrice,
        timestamp: new Date()
      });
    }
  }

  // Start automatic price updates
  startAutoUpdate() {
    setInterval(() => {
      this.updateMarketData();
    }, this.updateInterval);
  }

  // Get price history
  getPriceHistory(shipmentType, hoursBack = 24) {
    const cutoffTime = Date.now() - (hoursBack * 3600000);
    return this.priceHistory.filter(p => {
      return p.type === shipmentType && p.timestamp.getTime() > cutoffTime;
    });
  }

  // Get price trend
  getPriceTrend(shipmentType, hoursBack = 24) {
    const history = this.getPriceHistory(shipmentType, hoursBack);
    if (history.length < 2) return null;

    const oldPrice = history[0].price;
    const newPrice = history[history.length - 1].price;
    const change = newPrice - oldPrice;
    const percentChange = (change / oldPrice * 100).toFixed(2);

    return {
      type: shipmentType,
      oldPrice,
      newPrice,
      change: Math.round(change * 100) / 100,
      percentChange,
      trend: change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'STABLE',
      hoursBack
    };
  }

  // Add price lock option (customer can lock price for X hours)
  lockPrice(shipmentType, weight, origin, destination, lockHours = 24) {
    const currentPrice = this.getCurrentPrice(shipmentType, weight, origin, destination);
    const lockId = `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      lockId,
      lockedPrice: currentPrice.currentPrice,
      lockedUntil: new Date(Date.now() + lockHours * 3600000),
      shipmentType,
      weight,
      route: `${origin} → ${destination}`,
      message: `Price locked for ${lockHours} hours. Book your shipment now!`
    };
  }
}

// Initialize global pricing engine
window.dynamicPricing = new DynamicPricingEngine();
