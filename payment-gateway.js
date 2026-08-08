// Payment Gateway (Stripe + PayPal) — Globall Cloud
// FIXED VERSION — but read this comment before using it.
//
// The previous version could never run:
//  1. `process.env.STRIPE_PUBLIC_KEY` — `process` doesn't exist in a browser.
//     This is a static Cloudflare Pages site with no build step, so that
//     line threw immediately when the file loaded.
//  2. It called `/api/create-payment-intent`, `/api/create-paypal-order`,
//     `/api/capture-paypal-payment`, `/api/refund-payment` — none of these
//     routes exist anywhere in this project. This project's only backend
//     endpoint is the Supabase Edge Function `account-admin` (used by
//     accounts-console.html). There is no generic `/api/*` server here.
//  3. It referenced `orders` / `customers` tables that don't exist in the
//     real schema (see database-schema.js).
//
// IMPORTANT — this cannot be "just fixed" into a working payment flow from
// the frontend alone, and I'm not going to fake one. Real payments require
// a server holding a SECRET key (Stripe secret key / PayPal client secret).
// That secret must never be embedded in browser JS. The correct shape for
// this project is:
//
//   Browser (this file)              Supabase Edge Function (you build)      Stripe/PayPal
//   -----------------------          ------------------------------------    -------------
//   holds PUBLISHABLE key only  -->  holds SECRET key, creates              -->  charges card
//   collects card via Stripe         PaymentIntent / PayPal order,
//   Elements / PayPal Buttons        writes result to `shipments`
//                                     (paid_amount) via service role
//
// This file is wired correctly for that shape and is safe to load (no
// crash), but the "Pay" button will show a clear error until you:
//   1. Fill in STRIPE_PUBLISHABLE_KEY / PAYPAL_CLIENT_ID below (publishable
//      keys only — these are meant to be public, like the Supabase anon key).
//   2. Build a Supabase Edge Function (same pattern as `account-admin`) that
//      creates the PaymentIntent/order server-side and updates
//      shipments.paid_amount.
//   3. Point EDGE_FUNCTION_URL below at it.
// Until then, calling any method here returns a clear "not configured"
// error instead of silently pretending to work.

const STRIPE_PUBLISHABLE_KEY = ''; // fill in: pk_live_... / pk_test_...
const PAYPAL_CLIENT_ID = ''; // fill in: your PayPal client id
const EDGE_FUNCTION_URL = ''; // fill in once you build it, e.g.
// 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/payments'

class PaymentGateway {
	constructor() {
		this.configured = !!(STRIPE_PUBLISHABLE_KEY && EDGE_FUNCTION_URL);
		this.stripe = (STRIPE_PUBLISHABLE_KEY && window.Stripe) ? window.Stripe(STRIPE_PUBLISHABLE_KEY) : null;
		this.pendingPayments = new Map();
	}

	_notConfigured() {
		return { success: false, error: 'Payment gateway not configured yet — see comment at top of payment-gateway.js' };
	}

	async initializeStripePayment(shipmentId, amount, currency = 'USD') {
		if (!this.configured || !this.stripe) return this._notConfigured();

		try {
			const sb = window.sb || window.supabase;
			const session = sb ? (await sb.auth.getSession()).data.session : null;

			const response = await fetch(`${EDGE_FUNCTION_URL}/create-payment-intent`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
				},
				body: JSON.stringify({ shipmentId, amount: Math.round(amount * 100), currency: currency.toLowerCase() }),
			});
			if (!response.ok) throw new Error(`Edge function error: ${response.status}`);
			const { clientSecret } = await response.json();

			const elements = this.stripe.elements({
				clientSecret,
				appearance: { theme: 'dark', variables: { colorPrimary: '#00C2D9', colorText: '#F5F9FD', fontFamily: '"Vazirmatn", sans-serif' } },
			});
			elements.create('payment').mount('#payment-element');
			this.pendingPayments.set(shipmentId, { clientSecret, elements });

			return { success: true, clientSecret };
		} catch (error) {
			console.error('Error initializing Stripe payment:', error);
			return { success: false, error: error.message };
		}
	}

	async submitStripePayment(shipmentId) {
		const payment = this.pendingPayments.get(shipmentId);
		if (!payment) return { success: false, error: 'Payment not found' };

		try {
			const { error, paymentIntent } = await this.stripe.confirmPayment({
				elements: payment.elements,
				confirmParams: { return_url: `https://globall-cloud.pages.dev/?paid=${shipmentId}` },
			});
			if (error) return { success: false, error: error.message };
			if (paymentIntent?.status === 'succeeded') {
				return { success: true, paymentId: paymentIntent.id };
			}
			return { success: false, error: 'Payment not completed' };
		} catch (error) {
			console.error('Error submitting Stripe payment:', error);
			return { success: false, error: error.message };
		}
	}

	async initializePayPalPayment(shipmentId, amount, currency = 'USD') {
		if (!this.configured || !PAYPAL_CLIENT_ID) return this._notConfigured();

		try {
			if (!window.paypal) await this._loadPayPalSDK();

			const response = await fetch(`${EDGE_FUNCTION_URL}/create-paypal-order`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ shipmentId, amount, currency }),
			});
			if (!response.ok) throw new Error(`Edge function error: ${response.status}`);
			const { id: paypalOrderId } = await response.json();

			await window.paypal
				.Buttons({
					createOrder: async () => paypalOrderId,
					onApprove: async (data) => this._capturePayPalPayment(shipmentId, data.orderID),
					onError: (err) => console.error('PayPal error:', err),
				})
				.render('#paypal-button-container');

			return { success: true, paypalOrderId };
		} catch (error) {
			console.error('Error initializing PayPal payment:', error);
			return { success: false, error: error.message };
		}
	}

	async _capturePayPalPayment(shipmentId, paypalOrderId) {
		try {
			const response = await fetch(`${EDGE_FUNCTION_URL}/capture-paypal-payment`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ shipmentId, paypalOrderId }),
			});
			const result = await response.json();
			if (result.status === 'COMPLETED') return { success: true, paymentId: paypalOrderId };
			throw new Error('Payment not completed');
		} catch (error) {
			console.error('Error capturing PayPal payment:', error);
			return { success: false, error: error.message };
		}
	}

	_loadPayPalSDK() {
		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
			script.onload = resolve;
			script.onerror = reject;
			document.head.appendChild(script);
		});
	}

	/** Read-only: payment history comes straight from the real shipments table. */
	async getPaymentHistory(directoryCustomerId) {
		const sb = window.sb || window.supabase;
		if (!sb) return { success: false, error: 'no-client' };
		const { data, error } = await sb
			.from('shipments')
			.select('id,total_amount,paid_amount,created_at,status')
			.eq('directory_customer_id', directoryCustomerId)
			.order('created_at', { ascending: false });
		if (error) return { success: false, error: error.message };
		return { success: true, payments: data };
	}
}

window.paymentGateway = new PaymentGateway();

if (typeof module !== 'undefined' && module.exports) {
	module.exports = { PaymentGateway };
}