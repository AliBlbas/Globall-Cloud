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

The repository now contains the source for every active production Edge Function, with the JWT boundary declared in `supabase/config.toml`.

| Function | Access | Responsibility |
|---|---|---|
| `public-track` | Public, origin-restricted | Privacy-filtered shipment tracking and public timeline events |
| `public-message` | Public, rate-limited | Contact/request intake with validation and honeypot protection |
| `public-config` | Public, origin-restricted | Narrow public configuration bridge such as USD/IQD rate |
| `system-health` | Public, no-store | Database and shipment-table health probe |
| `account-admin` | Authenticated staff | Customer/staff accounts, receipts, staff logs, and dashboard reads |
| `operations-admin` | Authenticated staff | Shipment operations and shipment event timeline |
| `driver-gps` | Authenticated staff/driver | Assignment-scoped GPS updates and delivery status transitions |
| `account-self-profile` | Authenticated user | Own customer/staff profile projection |
| `account-self-password` | Authenticated user | Own password update with a minimum-length policy |
| `lg-track-shipment` | Authenticated, retired | Explicit `410 Gone` compatibility response for the removed legacy schema |

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

Run `npm test` locally before opening a pull request. The dependency-free harness validates JavaScript syntax, required pages and assets, all Edge Function directories, JWT configuration, migration filenames, client-side secret exposure, the public-config import, and the retired legacy endpoint behavior. `.github/workflows/production-integrity.yml` runs the same baseline plus the live public-site/config smoke test and the Cloudflare/Supabase integration invariants.

## Payment status
Real card payments are intentionally not enabled yet. A real payment provider must use a server-side secret inside a Supabase Edge Function; the browser must never contain payment secrets. This prevents a fake/broken payment flow from reaching customers.

## Deployment

The intended release path is:
**GitHub `main` → Cloudflare Pages production deployment → Supabase production backend.**

Deploy the frontend and Edge Functions as separate release steps, then verify both public URLs and protected authenticated workflows. Live deployment verification is a release gate; source code being present on GitHub alone is not treated as proof that the live site is updated. Never copy service-role or secret keys into browser files, GitHub Actions output, or Cloudflare Pages variables intended for client-side code.
