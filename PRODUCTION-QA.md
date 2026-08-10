# Globall Cloud — Production QA Checklist

This build merges two independent passes made on top of the same base
project, so this checklist covers both.

## Applied safely
- Wired `tracking-enhanced.js` + `tracking-styles.css` into the public
  tracking page (live route map + notification opt-in). Falls back to the
  plain tracking result if the script fails to load.
- Wired `whatsapp-messenger.js` into `index.html` (staff "send WhatsApp
  update" now uses per-status templates) and `accounts-console.html`
  (optional warehouse-arrival notice after a receipt is saved). Always
  opens a prefilled `wa.me` link for a staff member to tap Send — nothing
  is sent automatically or silently.
- Wired `webhook-handler.js` for the same "notify after warehouse receipt"
  flow in `index.html`'s admin panel; `warehouse_receipts` inserts there
  now also save `directory_phone`.
- Added a "Quick Quote" staff tool in `accounts-console.html`, powered by
  `price-calculator.js`. Kept separate from `index.html`'s own
  `calcQuote()` (different rate table + live USD→IQD conversion) to avoid
  recreating the duplicate-pricing-engine bug described in the README.
- Added `staff-os.html` — an authenticated Staff OS landing page (Supabase
  Auth + staff-role check) with quick metrics and nav cards into
  `accounts-console.html`. Linked from the main nav, mobile nav, and
  `management.html`; excluded via `robots.txt` and a `noindex` meta tag.
- Added defense-in-depth staff-session/role checks before: the full
  shipment list read (`getAllShipments`), a single staff shipment read
  (`getShipmentForStaff`), and admin message reads (`getRecentMessages`).
- Added a Cloudflare `Content-Security-Policy-Report-Only` header so the
  policy can be observed before anyone considers enforcing it.

## Intentionally not changed
- Supabase RLS policies or production data.
- Payment secrets or gateway credentials (`payment-gateway.js` stays
  unwired — see README).
- Customer tracking RPC behavior.
- Storage buckets.

## Required production verification
1. Sign in as each staff role (admin, accountant, super_admin) and verify
   dashboard, shipments, messages, warehouse receipts, and exports still
   work — including via the new `staff-os.html` entry point.
2. Sign in as a normal customer and verify customer tracking/dashboard
   still works, and that the new live-map/notifications UI on the tracking
   page degrades gracefully if realtime is unavailable.
3. From the Warehouse Receipts flow (both `index.html`'s admin panel and
   `accounts-console.html`), confirm the optional WhatsApp notify prompt
   opens the correct `wa.me` link and doesn't block the receipt save if
   dismissed.
4. Try the new Quick Quote tab in `accounts-console.html` with a few
   inputs and confirm it never overwrites `index.html`'s public quote form.
5. Review browser CSP reports; only then consider enforcing the CSP.
6. Run Supabase Security Advisor after the application regression test.
7. Deploy this build to Cloudflare Pages only after the above checks pass.
