# Globall Cloud — Production QA Checklist

This build merges two independent passes made on top of the same base
project, so this checklist covers both.

## Applied safely
- Fixed real bugs found on re-audit: a silent 25%-markup default in
  `price-calculator.js` (affected every Quick Quote), the WhatsApp
  order-confirmation template being sent at the wrong shipment step, a
  customer's free-text "notes" being mislabeled "🏠 Address:" in the
  out-for-delivery message, a stray trailing quote breaking the CSP header
  value, and two broken links to a non-page code fragment
  (`tracking-integration.html`) from `staff-os.html`.
- Added `?track=<id>#track` as a real, clickable tracking URL — previously
  there was no link a customer could actually tap from outside the app
  (e.g. from WhatsApp) that would land pre-filled on their shipment.
- Changed `tracking-enhanced.js`'s initial shipment fetch to reuse the
  `track_shipment` RPC instead of a direct `shipments` table read — this
  project routes all public/anonymous shipment reads through narrow RPCs
  (see database-schema.js), so a direct table select on the one page
  anonymous customers actually use this module from was a likely-silent
  RLS failure. **Still needs verification against your real RLS policies
  — see "Required production verification" below.**
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
- Customer tracking RPC behavior (only tracking-enhanced.js's own fetch
  was changed, to match it).
- Storage buckets.

## Required production verification
1. **Open the public tracking page in a fully signed-out/incognito
   window** (not just while logged in as staff — that can mask an RLS
   problem) and confirm the live map actually renders. If it doesn't,
   check the browser console: an RLS/permission error there means
   `shipments` doesn't grant anonymous SELECT, and the realtime
   subscription (auto-updates without a re-search) needs a matching RLS
   policy to ever work for signed-out visitors — the initial map will
   still render either way now that it goes through `track_shipment`.
2. Sign in as each staff role (admin, accountant, super_admin) and verify
   dashboard, shipments, messages, warehouse receipts, and exports still
   work — including via the new `staff-os.html` entry point.
3. Sign in as a normal customer and verify customer tracking/dashboard
   still works, and that the new live-map/notifications UI on the tracking
   page degrades gracefully if realtime is unavailable.
4. From the Warehouse Receipts flow (both `index.html`'s admin panel and
   `accounts-console.html`), confirm the optional WhatsApp notify prompt
   opens the correct `wa.me` link and doesn't block the receipt save if
   dismissed.
5. Try the new Quick Quote tab in `accounts-console.html` with a few
   inputs and confirm it never overwrites `index.html`'s public quote form.
6. Trigger a WhatsApp update at each shipment step and read the actual
   message text end to end — confirm `orderConfirmation` fires at "placed"
   (not "warehouseReceived"), and that the `?track=<id>#track` link in it
   actually opens the right shipment when tapped from a phone.
7. Run Supabase Security Advisor after the application regression test.
8. Review browser CSP reports; only then consider enforcing the CSP — read
   the warning below first, this one isn't optional.
9. Deploy this build to Cloudflare Pages only after the above checks pass.

## ⚠️ Before you ever switch the CSP from Report-Only to enforcing
`script-src` in `_headers` is `'self' https://cdn.jsdelivr.net
https://cdnjs.cloudflare.com` — it does **not** include `'unsafe-inline'`.
Every page's actual logic lives in one large inline `<script>` block (that's
how this project is built, not a bug). If you switch
`Content-Security-Policy-Report-Only` to plain `Content-Security-Policy`
as-is, every one of those inline scripts stops running and the site goes
dark — this is report-only specifically so that can be watched for and
caught before it's live. You have two real options when you're ready to
enforce, and they're a genuine trade-off, not a bug to silently patch:
- Add `'unsafe-inline'` to `script-src`. Simple, and the policy still
  blocks loading external scripts from unauthorized origins — but it no
  longer stops an injected inline `<script>` tag from running, so it's
  meaningfully weaker than a normal CSP.
- Move to a nonce-based policy (`script-src 'nonce-<random-per-request>'`).
  Properly protective, but Cloudflare Pages serves static files, so
  generating a fresh nonce per request needs a Cloudflare Worker/Function
  in front of these pages — a real architecture change, not a config edit.

Whichever you pick, decide deliberately — don't just flip the header.

## 2026-08-11 Hardening Verification

- Static JavaScript syntax check: all 8 JavaScript files pass `node --check`.
- Local asset reference check: no genuinely missing static asset was found; only runtime-generated `${...}` references were detected.
- `staff.active` compatibility: live Supabase now provides a generated `active` alias backed by `is_active`, preventing legacy staff-console reads from breaking.
- Public tracking RPC: anonymous tracking was tested against a real shipment ID. Customer contact data, notes, financial amounts, customer IDs, photos, batch code, and branch are masked for anonymous callers.
- Customer phone lookup RPC: anonymous execution is revoked; authenticated customers/staff may use it within the ownership/staff guard.
- Production Supabase status: ACTIVE_HEALTHY.
- Remaining Supabase Advisor findings are intentionally left for a separate controlled pass because some require product-level decisions (GraphQL exposure, public extension placement, Auth OTP policy, leaked-password protection, and other existing policies).


## 2026-08-16 Backend source recovery and release hardening

- Recovered the source of all 10 active production Edge Functions from the authenticated Supabase project into `supabase/functions/`, including the retired `lg-track-shipment` compatibility function.
- Fixed the archive drift in `public-config`: the repository source now imports `createClient` and uses the production function contract.
- Added the production project reference and explicit `verify_jwt` settings for every Edge Function to `supabase/config.toml`.
- Added a dependency-free `npm test` harness that validates JavaScript syntax, required files, Edge Function coverage, migration filenames, client-side secret exposure, and critical endpoint invariants.
- Added `package.json` and `package-lock.json` so GitHub Actions npm caching is deterministic rather than failing on a missing manifest.
- Confirmed through read-only production inspection that the Supabase project is `ACTIVE_HEALTHY`, the public site is reachable, and the public USD/IQD configuration bridge returns a valid response.
- No production database migration, user data, payment setting, secret rotation, or live deployment was changed in this pass. Deployment remains a deliberate release-gate action after authenticated role-by-role regression testing.

## Live verification after the system-health fix

The initial live probe exposed a real operational defect: `system-health` returned HTTP 503 because its database check used the wrong access path for the current `app_settings` policy. The function was corrected to validate the public configuration bridge and to use the server-side key only for the shipment schema probe. The corrected function was deployed as version 2 and now returns HTTP 200 with `database=true`, `shipments=true`, and `configuration_bridge=true`.

The live public tracking endpoint was exercised with a real shipment identifier without exposing that identifier in this document. It returned HTTP 200, included both the shipment projection and event list, and passed the privacy check for anonymous contact fields. Invalid tracking input returns HTTP 400, and an unsupported method on the public message endpoint returns HTTP 405.

Supabase Security Advisor still reports policy and configuration warnings that require deliberate product decisions rather than blind automated changes, including the public `supabase-dbdev` extension, anonymous-role policy visibility, OTP expiry, and leaked-password protection. Performance Advisor reports many unused indexes as informational candidates. These are recorded for a controlled database-policy pass; no destructive migration was applied automatically.
