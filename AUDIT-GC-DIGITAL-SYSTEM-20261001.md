# Globall Cloud digital-system audit — 2026-10-01

## Sources inspected
- Live homepage: https://globall-cloud.pages.dev/
- Live customer route: https://globall-cloud.pages.dev/dashboard (resolves to customer-portal)
- Live staff route: https://globall-cloud.pages.dev/staff (resolves to staff-os-v5)
- Authorized repository: AliBlbas/Globall-Cloud, branch main, clean at inspection

## Current strengths
- Static Cloudflare Pages frontend with strong security headers/CSP and no-store HTML.
- Supabase Auth + RLS + Edge Functions already present.
- Existing `staff-os.html` is role-gated; existing `accounts-console.html` supports customer records, staff, warehouse receipts, receipt photos, activity logs and a quick quote.
- Existing `customer-portal.html` supports email/password login, shipment/quote/payment/document/POD sections and a customer-self Edge Function.
- Existing shipment model has `customer_user_id`, `step_photos`, status/timeline fields; advanced migrations add route legs, warehouse movement, private document storage and notification outbox.
- Existing production tests pass: `npm test` -> all checks passed; JS syntax 48 files; 104 migrations OK.

## Gaps against requested product
1. **Customer identity mismatch:** requested login is GC code + password, but customer portal currently shows email + password and customer accounts are keyed mainly by auth email/user id. Existing customer table has `code`/display aliases but no explicit GC-code login contract.
2. **GC code lifecycle:** staff UI displays a code if present but does not expose a clear staff-only "generate next code" action or enforce the requested sequence starting at GC-100 and current GC-708. Need a DB-backed allocator and binding action to customer email.
3. **Shipment intake UX:** existing staff console has warehouse receipt + photos, but the requested simple shipment fields (weight, cargo type, cost, warehouse, status) are not exposed in the same focused workflow and shipment photos are not clearly surfaced in customer portal.
4. **Pricing conflict:** `price-calculator.js` uses generic placeholder rates (air 8.5/kg, sea 450/CBM, land 3.5/kg) and the homepage calculator has its own rate table. Requested business rates need one authoritative deterministic rate table with minimum IQD 5,000.
5. **Warehouse directory:** homepage/customer portal use generic warehouse copy; requested customer-visible detailed China, Dubai, USA warehouse addresses and Erbil pickup hours (09:00–17:00) are not a dedicated authenticated directory.
6. **UX clarity:** public homepage is visually strong and RTL/mobile-aware, but has many operations/marketing layers and does not clearly lead with the requested two-system model. Customer dashboard is a feature shell but unauthenticated state still reads like a generic email-auth portal.

## Implementation decision
Preserve current routes, IDs, Supabase boundaries and static deployment. Add a forward-only migration for code sequencing/ownership and a small secured customer-login bridge, update the account console and customer portal with focused GC-code controls, consolidate pricing constants and add an authenticated warehouse directory. Do not expose secrets or service-role credentials.
