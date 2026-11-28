/* Globall Cloud — shared shipping rate-card client.
 * Source of truth: public.gc_rate_cards exposed read-only by public-config.
 * Deliberately no seasonal, distance, or static-price modifiers: staff and
 * customers must see the same active rates, and a missing rate must not be
 * replaced with an invented number.
 */
class PriceCalculator {
  constructor(options = {}) {
    this.baseUrl = String(options.baseUrl || 'https://ahslifnthiwfkmaswjno.supabase.co').replace(/\/$/, '');
    this.publishableKey = options.publishableKey || 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
    this.fetchImpl = options.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    this.rateCards = Array.isArray(options.rateCards) ? options.rateCards : null;
    this.rateCardsPromise = null;
  }

  async loadRateCards({ refresh = false } = {}) {
    if (refresh) { this.rateCards = null; this.rateCardsPromise = null; }
    if (this.rateCards) return this.rateCards;
    if (this.rateCardsPromise) return this.rateCardsPromise;
    if (!this.fetchImpl) throw new Error('Network access is unavailable; active rates could not be loaded.');
    this.rateCardsPromise = (async () => {
      const response = await this.fetchImpl(`${this.baseUrl}/functions/v1/public-config?key=shipping_rate_cards`, {
        method: 'GET',
        headers: { apikey: this.publishableKey, Accept: 'application/json' },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(payload.rates)) {
        throw new Error(payload.error || 'Active shipping rates are unavailable.');
      }
      this.rateCards = payload.rates.filter((row) => row && row.is_active !== false);
      if (!this.rateCards.length) throw new Error('No active shipping rates are configured.');
      return this.rateCards;
    })().finally(() => { this.rateCardsPromise = null; });
    return this.rateCardsPromise;
  }

  normalizeOrigin(origin) {
    const value = String(origin || '').trim().toLowerCase();
    if (['uae', 'united arab emirates', 'dubai'].includes(value)) return 'Dubai';
    if (['usa', 'us', 'united states', 'united states of america'].includes(value)) return 'USA';
    if (value === 'china') return 'China';
    return String(origin || '').trim();
  }

  async calculateShippingCost(shipmentType, quantity, origin, destination, { cargoType = 'standard' } = {}) {
    const mode = String(shipmentType || '').trim().toLowerCase();
    const amount = Number(quantity);
    if (!['air', 'sea', 'land'].includes(mode) || !Number.isFinite(amount) || amount <= 0) return null;
    const country = this.normalizeOrigin(origin);
    let category = String(cargoType || 'standard').trim().toLowerCase();
    if (country === 'Dubai' && mode === 'land' && category === 'clothes' && amount > 100) category = 'clothes_100_plus';
    if (country === 'Dubai' && mode === 'land' && category === 'clothes_100_plus' && amount <= 100) {
      throw new Error('The clothing discount applies only to shipments above 100 kg.');
    }

    const rates = await this.loadRateCards();
    const rate = rates
      .filter((row) => String(row.origin).toLowerCase() === country.toLowerCase()
        && String(row.mode).toLowerCase() === mode
        && String(row.cargo_type).toLowerCase() === category)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];
    if (!rate) return null;

    const itemBased = country === 'Dubai' && mode === 'air'
      && ['used_phone', 'new_flagship', 'laptop', 'accessories'].includes(category);
    const unit = mode === 'sea' ? 'cbm' : itemBased ? 'item' : 'kg';
    if (String(rate.unit || '').toLowerCase() !== unit) {
      throw new Error('The active rate unit does not match the chosen cargo type. Ask an administrator to correct the rate card.');
    }
    if (String(rate.currency || 'USD').toUpperCase() !== 'USD') {
      throw new Error('The active rate is not in USD; quote generation has been stopped for safety.');
    }
    const unitPrice = Number(rate.price);
    const totalCost = Math.round(amount * unitPrice * 100) / 100;
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(totalCost)) {
      throw new Error('The active rate card contains an invalid price.');
    }
    return {
      type: mode,
      origin: country,
      destination: String(destination || ''),
      cargoType: category,
      quantity: amount,
      unit,
      rate: unitPrice,
      baseCost: totalCost,
      totalCost,
      currency: 'USD',
      note: String(rate.note || ''),
      rateId: String(rate.id || ''),
      generatedAt: new Date().toISOString(),
    };
  }

  async getAllRates() {
    return this.loadRateCards();
  }
}

if (typeof window !== 'undefined') window.priceCalculator = new PriceCalculator();
if (typeof module !== 'undefined' && module.exports) module.exports = { PriceCalculator };
