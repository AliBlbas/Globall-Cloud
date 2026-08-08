// WhatsApp Messaging Helper — Globall Cloud
// FIXED VERSION.
//
// The previous version of this file could never work in this project:
//  1. It read `process.env.WHATSAPP_API_KEY`. `process` does not exist in a
//     browser — this site is a static Cloudflare Pages site with no build
//     step, so that line threw a ReferenceError the moment this file loaded,
//     crashing the whole script.
//  2. Even if a key were hardcoded, sending it from browser JS would expose a
//     secret WhatsApp Cloud API token to every visitor — a real security bug.
//  3. It called `https://graph.instagram.com/...` — wrong domain. The
//     WhatsApp Cloud API lives at `https://graph.facebook.com/...`, and using
//     it at all requires Meta Business verification and pre-approved message
//     templates, which this project does not have configured (see index.html
//     comment near OWNER_WHATSAPP).
//  4. It referenced a `customers` table that doesn't exist in the real
//     database (see database-schema.js: the real tables are
//     customer_directory, shipments, warehouse_receipts, messages, staff).
//
// This rewrite instead uses the same approach already proven live on
// index.html and accounts-console.html: open a prefilled wa.me link so staff
// tap Send themselves. No backend, no secret key, no business verification
// needed, and it works today.

class WhatsAppMessenger {
	constructor() {
		// Must match the real business number used across the site
		// (index.html / OWNER_WHATSAPP / tel: links).
		this.businessNumber = '9647507577137';
		this.messageTemplates = this.setupTemplates();
	}

	setupTemplates() {
		return {
			orderConfirmation: (v) =>
				`سڵاو ${v.name || ''}، داواکارییەکەت (${v.orderId}) وەرگیرا.\n📦 کێش: ${v.weight || '-'}kg\n🚚 جۆر: ${v.type || '-'}\n💰 نرخ: $${v.cost || '-'}\nشوێنکەوتن: ${v.trackingLink || ''}`,
			warehouseReceived: (v) =>
				`بارەکەت گەیشتە کۆگا.\n📍 شوێن: ${v.location || '-'}\n⏰ کات: ${v.timestamp || '-'}\nکۆدی بار: ${v.orderId || ''}`,
			inTransit: (v) =>
				`بارەکەت لە ڕێگادایە.\n📍 لە: ${v.origin || '-'}\n🎯 بۆ: ${v.destination || '-'}\n⏱️ ETA: ${v.eta || '-'}`,
			customsClearance: (v) =>
				`بارەکەت لە گومرکدایە.\n🔍 دۆخ: ${v.status || '-'}`,
			outForDelivery: (v) =>
				`بارەکەت ئەمڕۆ دەگاتە دەست.\n🏠 ناونیشان: ${v.address || '-'}`,
			delivered: (v) =>
				`بارەکەت گەیشت! ✅\n⏰ کات: ${v.timestamp || '-'}`,
			delayed: (v) =>
				`بارەکەت دواکەوت.\n⚠️ هۆکار: ${v.reason || '-'}\n📅 ETAی نوێ: ${v.newEta || '-'}`,
			priceQuote: (v) =>
				`نرخی ${v.type || ''}\n📦 کێش: ${v.weight || '-'}kg\n📍 ڕێگا: ${v.route || '-'}\n💰 نرخی کۆتایی: $${v.finalPrice || '-'}`,
			supportResponse: (v) =>
				`سڵاو ${v.name || ''}،\n${v.message || ''}\n\nGloball Cloud`,
		};
	}

	toWhatsAppDigits(phone) {
		if (!phone) return null;
		let d = String(phone).replace(/[^\d]/g, '');
		if (!d) return null;
		if (d.startsWith('00')) d = d.slice(2);
		if (d.startsWith('0')) d = '964' + d.slice(1);
		else if (!d.startsWith('964')) d = '964' + d;
		return d;
	}

	/**
	 * Opens wa.me with a prefilled message. Staff taps Send — this is the only
	 * approach that works without Meta Business API access.
	 * @returns {boolean} whether a window was opened
	 */
	sendMessage(recipientPhone, templateName, variables = {}) {
		const build = this.messageTemplates[templateName];
		if (!build) {
			console.error(`Template '${templateName}' not found`);
			return false;
		}
		const digits = this.toWhatsAppDigits(recipientPhone);
		if (!digits) {
			console.error('Invalid recipient phone number');
			return false;
		}
		const text = build(variables);
		window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank');
		return true;
	}

	/** Opens a WhatsApp chat to the business number itself (owner notifications). */
	notifyOwner(text) {
		window.open(`https://wa.me/${this.businessNumber}?text=${encodeURIComponent(text)}`, '_blank');
	}
}

// Initialize global messenger
window.whatsappMessenger = new WhatsAppMessenger();

if (typeof module !== 'undefined' && module.exports) {
	module.exports = { WhatsAppMessenger };
}