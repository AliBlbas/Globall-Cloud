// Globall Cloud payment facade: Qicard + FIB only.
// Provider secrets live inside Supabase Edge Functions, never in this browser file.
(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/payment-checkout`;

  class PaymentGateway {
    constructor() { this.pendingPayments = new Map(); }

    async _headers() {
      const client = window.gcSupabase || window.sb || window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_KEY);
      const session = client ? (await client.auth.getSession()).data.session : null;
      if (!session?.access_token) throw new Error('Authentication required for payment');
      return { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
    }

    async _request(body, idempotencyKey = null) {
      const headers = await this._headers();
      if (idempotencyKey) headers['x-idempotency-key'] = idempotencyKey;
      const response = await fetch(FUNCTION_URL, { method: 'POST', headers, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Payment service error ${response.status}`);
      return payload;
    }

    async createPayment(provider, invoiceId, amount, idempotencyKey) {
      const payload = await this._request({ action: 'create', data: { provider, invoice_id: invoiceId, amount, idempotency_key: idempotencyKey } }, idempotencyKey);
      if (payload.session?.id) this.pendingPayments.set(payload.session.id, payload.session);
      return { success: true, ...payload };
    }

    async createQiCardPayment(invoiceId, amount, idempotencyKey) { return this.createPayment('qicard', invoiceId, amount, idempotencyKey); }
    async createFibPayment(invoiceId, amount, idempotencyKey) { return this.createPayment('fib', invoiceId, amount, idempotencyKey); }

    async getPaymentStatus(sessionId) {
      const payload = await this._request({ action: 'status', data: { session_id: sessionId } });
      if (payload.session) this.pendingPayments.set(sessionId, payload.session);
      return { success: true, ...payload };
    }

    async cancelPayment(sessionId) {
      const payload = await this._request({ action: 'cancel', data: { session_id: sessionId } });
      if (payload.session) this.pendingPayments.set(sessionId, payload.session);
      return { success: true, ...payload };
    }

    initializeStripePayment() { return Promise.resolve({ success: false, error: 'Stripe is not enabled. Use QiCard or FIB.' }); }
    submitStripePayment() { return Promise.resolve({ success: false, error: 'Stripe is not enabled. Use QiCard or FIB.' }); }
    initializePayPalPayment() { return Promise.resolve({ success: false, error: 'PayPal is not enabled. Use QiCard or FIB.' }); }
  }

  window.paymentGateway = new PaymentGateway();
  if (typeof module !== 'undefined' && module.exports) module.exports = { PaymentGateway };
})();
