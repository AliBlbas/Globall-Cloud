// Shipment Event Helpers — Globall Cloud
// FIXED VERSION.
//
// The previous version of this file was written against a database schema
// that does not exist in this project: `customers`, `orders`,
// `shipment_events`, `support_messages`. The real schema (see
// database-schema.js) only has: customer_directory, shipments,
// warehouse_receipts, messages, staff, and the lg_* corridor tables.
//
// It was also structured as "webhook handlers" — but this project is a
// static Cloudflare Pages site with no server to receive inbound webhooks.
// A real inbound webhook (e.g. from a payment provider or WhatsApp) needs a
// server endpoint, which here means a Supabase Edge Function (the same
// pattern already used by accounts-console.html's `account-admin` function),
// not browser JavaScript.
//
// This rewrite keeps the useful part — "when X happens, notify the
// customer" — as plain browser-callable helpers wired to the real tables and
// the real wa.me messaging approach (see whatsapp-messenger.js). Anything
// that must run server-side (verifying a real inbound webhook signature) is
// left as a clearly marked TODO for a Supabase Edge Function, not faked.

class ShipmentEvents {
	/**
	 * Call this after updating a shipment's status (mirrors what
	 * updateShipmentStep() already does in index.html's admin panel).
	 */
	async notifyStatusChange(shipmentId, statusLabel) {
		if (!window.sb) {
			console.error('Supabase client (window.sb) not available');
			return { success: false, error: 'no-client' };
		}

		const { data: shipment, error } = await window.sb
			.from('shipments')
			.select('customer_phone, customer_name')
			.eq('id', shipmentId)
			.maybeSingle();

		if (error) return { success: false, error: error.message };
		if (!shipment || !shipment.customer_phone) {
			return { success: false, error: 'no-phone-on-file' };
		}

		const sent = window.whatsappMessenger?.sendMessage(shipment.customer_phone, 'inTransit', {
			status: statusLabel,
		});

		return { success: !!sent };
	}

	/**
	 * Call this after a warehouse receipt is registered
	 * (see database-schema.js: warehouse_receipts table).
	 */
	async notifyWarehouseReceived(receiptId) {
		if (!window.sb) return { success: false, error: 'no-client' };

		const { data: receipt, error } = await window.sb
			.from('warehouse_receipts')
			.select('batch_code, location, directory_phone, received_at')
			.eq('id', receiptId)
			.maybeSingle();

		if (error) return { success: false, error: error.message };
		if (!receipt || !receipt.directory_phone) {
			return { success: false, error: 'no-phone-on-file' };
		}

		const sent = window.whatsappMessenger?.sendMessage(receipt.directory_phone, 'warehouseReceived', {
			location: receipt.location,
			timestamp: receipt.received_at ? new Date(receipt.received_at).toLocaleString() : '-',
			orderId: receipt.batch_code,
		});

		return { success: !!sent };
	}

	/**
	 * Logs a new inbound message from the public "Request a Quote" / Contact
	 * form into the real `messages` table. This already happens via
	 * FormSubmit.co in index.html; this helper exists for any additional entry
	 * point (e.g. a future WhatsApp inbound bridge) that needs to write the
	 * same row shape.
	 */
	async logInboundMessage({ name, email, message, company, request_type }) {
		if (!window.sb) return { success: false, error: 'no-client' };
		const { error } = await window.sb.from('messages').insert([
			{ name, email, message, company, request_type },
		]);
		if (error) return { success: false, error: error.message };
		return { success: true };
	}

	// TODO (server-side, not browser JS): if you later add a real inbound
	// webhook source (e.g. a payment provider or the WhatsApp Cloud API),
	// implement it as a Supabase Edge Function that verifies the provider's
	// signature server-side, then calls the helpers above via the Supabase
	// service role — never verify webhook signatures or hold secret keys in
	// browser code.
}

window.shipmentEvents = new ShipmentEvents();

if (typeof module !== 'undefined' && module.exports) {
	module.exports = { ShipmentEvents };
}