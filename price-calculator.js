// Price Calculator Engine - Globall Cloud
// Dynamic pricing based on weight, distance, type

class PriceCalculator {
  constructor() {
    this.baseRates = this.setupBaseRates();
    this.distanceMatrix = this.setupDistanceMatrix();
    this.modifiers = new Map();
  }

  setupBaseRates() {
    return {
      air: {
        perKg: 8.5,    // Per kilogram
        minCharge: 150, // Minimum charge
        description: 'Air Freight - Fastest delivery'
      },
      sea: {
        perCbm: 450,    // Per cubic meter
        minCharge: 300,
        description: 'Sea Freight - Most economical'
      },
      land: {
        perKg: 3.5,
        perKm: 0.25,
        minCharge: 100,
        description: 'Land Transport - Regional delivery'
      }
    };
  }

  setupDistanceMatrix() {
    // Distance in km between major hubs
    return {
      'China-UAE': 4800,
      'UAE-Iraq': 1200,
      'China-Iraq': 6000,
      'Erbil-Baghdad': 350,
      'Basra-Erbil': 900
    };
  }

  // Calculate shipping cost
  calculateShippingCost(shipmentType, weight, origin, destination) {
    const rate = this.baseRates[shipmentType];
    if (!rate) return null;

    let baseCost = 0;
    let breakdown = {};

    if (shipmentType === 'air') {
      baseCost = Math.max(weight * rate.perKg, rate.minCharge);
      breakdown.weight = weight * rate.perKg;
      breakdown.minCharge = rate.minCharge;
    } else if (shipmentType === 'sea') {
      // Estimate CBM from weight (rough calculation)
      const cbm = weight / 200; // Average density
      baseCost = Math.max(cbm * rate.perCbm, rate.minCharge);
      breakdown.cbm = cbm;
      breakdown.rate = rate.perCbm;
    } else if (shipmentType === 'land') {
      const distance = this.getDistance(origin, destination) || 500;
      baseCost = weight * rate.perKg + (distance * rate.perKm);
      baseCost = Math.max(baseCost, rate.minCharge);
      breakdown.weight = weight * rate.perKg;
      breakdown.distance = distance * rate.perKm;
    }

    // Apply modifiers
    let totalCost = baseCost;
    const appliedModifiers = {};

    for (let [name, modifier] of this.modifiers) {
      const modifiedCost = modifier.calculator(baseCost, { weight, origin, destination });
      appliedModifiers[name] = modifiedCost - baseCost;
      totalCost += appliedModifiers[name];
    }

    return {
      type: shipmentType,
      baseCost: Math.round(baseCost * 100) / 100,
      modifiers: appliedModifiers,
      totalCost: Math.round(totalCost * 100) / 100,
      currency: 'USD',
      breakdown: breakdown,
      breakdown_text: this.getBreakdownText(shipmentType, breakdown, baseCost)
    };
  }

  // Get distance between locations
  getDistance(origin, destination) {
    const key = `${origin}-${destination}`;
    return this.distanceMatrix[key] || null;
  }

  // Get detailed breakdown text
  getBreakdownText(type, breakdown, cost) {
    if (type === 'air') {
      return `${breakdown.weight?.toFixed(2)} USD (${breakdown.weight ? (breakdown.weight / cost * 100).toFixed(0) : 0}%) + Handling`;
    } else if (type === 'sea') {
      return `${breakdown.cbm?.toFixed(2)} CBM × $${breakdown.rate} = $${cost.toFixed(2)}`;
    } else if (type === 'land') {
      return `Weight: $${breakdown.weight?.toFixed(2)} + Distance: $${breakdown.distance?.toFixed(2)}`;
    }
    return '';
  }

  // Add price modifier (discount, insurance, etc.)
  addModifier(name, calculator) {
    this.modifiers.set(name, { calculator });
  }

  // Remove modifier
  removeModifier(name) {
    this.modifiers.delete(name);
  }

  // Get all available rates
  getAllRates() {
    return this.baseRates;
  }

  // Calculate estimated delivery time
  calculateDeliveryTime(shipmentType, origin, destination) {
    const times = {
      air: { min: 2, max: 5, unit: 'days' },
      sea: { min: 15, max: 30, unit: 'days' },
      land: { min: 3, max: 10, unit: 'days' }
    };
    return times[shipmentType] || null;
  }
}

// Initialize global calculator
window.priceCalculator = new PriceCalculator();

// Add example modifier: rush delivery
window.priceCalculator.addModifier('rush', {
  calculator: (baseCost) => baseCost * 0.25 // 25% surcharge
});
