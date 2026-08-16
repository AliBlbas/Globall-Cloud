# Globall Cloud

Globall Cloud is a production-oriented logistics platform for shipping from China and the UAE to Iraq.

## Live stack
- Frontend: static website on Cloudflare Pages with security headers
- Backend: Supabase (Postgres, Auth, Storage, RLS, Realtime, Edge Functions)
- Staff tools: customer accounts, staff access, warehouse receipts, delivery operations, and activity logs

## Production architecture
- `shipments` is the source of truth for shipment state and current tracking location.
- `warehouse_receipts` records warehouse intake and QR/barcode chain-of-custody verification.
- `delivery_assignments` records driver assignment, route state, check-in/check-out, and live driver location.
- `delivery_proofs` is the controlled delivery-completion boundary; GPS updates cannot mark a shipment delivered.
- `shipment_tracking_events`, `shipment_events`, `logistics_exceptions`, and `customer_notifications` provide the audit/event/exception/notification layers.
- Supabase RLS remains the primary data security boundary.

## Edge Functions
- `public-track` — narrow public tracking gateway
- `driver-gps` — authenticated driver assignment/GPS workflow
- `account-admin` — staff account and warehouse operations
- `operations-admin` — operations workflows
- `public-config` — narrow public configuration/health bridge
- `system-health` — lightweight backend health probe
- `public-message` — public contact/quote form submission (rate-limited, honeypot-protected)
- `account-self-password` — authenticated self-service password change
- `account-self-profile` — authenticated self-service profile lookup (staff or customer)
- `lg-track-shipment` — retired; returns 410 Gone. Superseded by `account-admin`/`public-track` after the legacy `lg_shipments`/`lg_tracking_events` tables were dropped. Kept only so old callers get an honest error.

## Customer workflow
Customer quote/request → shipment creation → warehouse intake → transit/customs → driver assignment → live GPS → ETA/SLA monitoring → delivery proof → delivered → customer notification.

## Mobile-first experience
Driver and customer surfaces use responsive/mobile-first layouts, safe-area handling, touch-sized controls, realtime tracking states, and Safari/WebKit compatibility layers.

## Security notes
- Use only the Supabase publishable key in browser code.
- Never expose a Supabase service-role key or other secret in frontend code.
- Staff actions are protected by Supabase Auth, role checks, Edge Functions, and RLS.
- Public tracking intentionally exposes only the minimum fields required for shipment tracking.
- Cloudflare security headers enforce CSP and allow only the origins/capabilities required by the production app.

## CI / production integrity
`.github/workflows/production-integrity.yml` validates JavaScript syntax, required files, migration naming, security invariants, Supabase configuration, service-role secret absence, Realtime/CSP requirements, and runtime/cache version consistency before a change is considered production-ready.

## Payment status
Real card payments are intentionally not enabled yet. A real payment provider must use a server-side secret inside a Supabase Edge Function; the browser must never contain payment secrets. This prevents a fake/broken payment flow from reaching customers.

## Deployment
The intended release path is:
**GitHub `main` → Cloudflare Pages production deployment → Supabase production backend.**

Live deployment verification is a release gate; source code being present on GitHub alone is not treated as proof that the live site is updated.
