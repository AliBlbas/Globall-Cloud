// Price Calculator — Globall Cloud
//
// This project previously shipped TWO separate, silently diverging pricing
// engines with the same base numbers (this file and a since-deleted
// dynamic-pricing-engine.js) — a bug waiting to happen, since editing one
// wouldn't update the other. dynamic-pricing-engine.js additionally called
// `fetch('https://api.example.com/market-data')` every hour —
// api.example.com is a documentation placeholder domain, not a real
// endpoint, so that call always failed silently (caught by try/catch) and
// did nothing. It has been removed entirely; this file is the one
// surviving pricing engine. Seasonal and demand-based pricing here is kept
// as *local, deterministic* logic (no network dependency), available as
// opt-in modifiers.
//
// NOT currently loaded by index.html, and intentionally so: index.html's
// quote form (#page-services) already has its own tailored calcQuote(),
// with its own rate table and a live USD→IQD conversion this generic
// module doesn't do. Wiring this file in alongside that one would recreate
// the exact duplicate-pricing-logic problem described above. Keep this as
// a standalone utility (e.g. for a future staff-side quick-quote tool, or
// an API) rather than loading it next to index.html's calculator.

class PriceCalculator {
  constructor() {
    this.baseRates = this.setupBaseRates();
    this.distanceMatrix = this.setupDistanceMatrix();
    this.modifiers = new Map();
  }

  setupBaseRates() {
    return {
      air: { perKg: 8.5, range: { min: 5.0, max: 15.0 }, minCharge: 150, description: 'Air Freight - Fastest delivery' },
      sea: { perCbm: 450, range: { min: 300, max: 600 }, minCharge: 300, description: 'Sea Freight - Most economical' },
      land: { perKg: 3.5, perKm: 0.25, range: { min: 2.0, max: 5.5 }, minCharge: 100, description: 'Land Transport - Regional delivery' },
    };
  }

  setupDistanceMatrix() {
    return {
      'China-UAE': 4800,
      'UAE-Iraq': 1200,
      'China-Iraq': 6000,
      'Erbil-Baghdad': 350,
      'Baghdad-Basra': 550,
      'Erbil-Basra': 900,
    };
  }

  getDistance(origin, destination) {
    return this.distanceMatrix[`${origin}-${destination}`] || null;
  }

  /** Seasonal multiplier — deterministic, no network call. */
  getSeasonalMultiplier() {
    const season = {
      0: 1.15, 1: 1.15, 2: 1.10, 3: 1.05, 4: 0.95, 5: 0.90,
      6: 0.90, 7: 1.00, 8: 1.05, 9: 1.15, 10: 1.20, 11: 1.25,
    };
    return season[new Date().getMonth()] ?? 1.0;
  }

  /** Weight-tier discount — deterministic, no network call. */
  getWeightMultiplier(weight, shipmentType) {
    if (shipmentType === 'air') {
      if (weight > 1000) return 0.85;
      if (weight > 500) return 0.90;
      if (weight > 100) return 0.95;
    } else if (shipmentType === 'sea') {
      if (weight > 5000) return 0.80;
      if (weight > 1000) return 0.90;
    }
    return 1.0;
  }

  /**
   * Calculate shipping cost.
   * @param {boolean} useSeasonal - apply the seasonal multiplier (opt-in,
   *   since the quote form may want a flat, predictable price instead)
   */
  calculateShippingCost(shipmentType, weight, origin, destination, { useSeasonal = false } = {}) {
    const rate = this.baseRates[shipmentType];
    if (!rate) return null;

    let baseCost = 0;
    const breakdown = {};

    if (shipmentType === 'air') {
      baseCost = Math.max(weight * rate.perKg, rate.minCharge);
      breakdown.weight = weight * rate.perKg;
      breakdown.minCharge = rate.minCharge;
    } else if (shipmentType === 'sea') {
      const cbm = weight / 200; // rough density estimate
      baseCost = Math.max(cbm * rate.perCbm, rate.minCharge);
      breakdown.cbm = cbm;
      breakdown.rate = rate.perCbm;
    } else if (shipmentType === 'land') {
      const distance = this.getDistance(origin, destination) || 500;
      baseCost = Math.max(weight * rate.perKg + distance * rate.perKm, rate.minCharge);
      breakdown.weight = weight * rate.perKg;
      breakdown.distance = distance * rate.perKm;
    }

    let totalCost = baseCost * this.getWeightMultiplier(weight, shipmentType);
    if (useSeasonal) totalCost *= this.getSeasonalMultiplier();

    // keep price inside the sane published range
    totalCost = Math.max(rate.range.min * weight, Math.min(totalCost, rate.range.max * weight * 1.5));

    const appliedModifiers = {};
    for (const [name, modifier] of this.modifiers) {
      const modifiedCost = modifier.calculator(totalCost, { weight, origin, destination });
      appliedModifiers[name] = modifiedCost - totalCost;
      totalCost = modifiedCost;
    }

    return {
      type: shipmentType,
      baseCost: Math.round(baseCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      currency: 'USD',
      breakdown,
      modifiers: appliedModifiers,
      generatedAt: new Date().toISOString(),
    };
  }

  calculateDeliveryTime(shipmentType) {
    const times = {
      air: { min: 2, max: 5, unit: 'days' },
      sea: { min: 15, max: 30, unit: 'days' },
      land: { min: 3, max: 10, unit: 'days' },
    };
    return times[shipmentType] || null;
  }

  addModifier(name, calculator) {
    this.modifiers.set(name, { calculator });
  }

  removeModifier(name) {
    this.modifiers.delete(name);
  }

  getAllRates() {
    return this.baseRates;
  }
}

window.priceCalculator = new PriceCalculator();

// A modifier registered here would apply to every single call to
// calculateShippingCost() from that point on — including this project's
// Quick Quote tool in accounts-console.html — with no visible indication
// in the UI that anything was added. That's exactly backwards for a tool
// staff use to sanity-check a number: baseline output must match the
// baseRates/distanceMatrix above with nothing hidden added on top. This
// file used to auto-register a 25%-markup 'rush' modifier right here at
// load time, unconditionally, on every quote — removed for that reason.
// addModifier()/removeModifier() below are still there if a specific
// scenario (e.g. a genuine rush order) ever needs one applied deliberately
// and visibly, on purpose, not as a silent default.

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PriceCalculator };
}
