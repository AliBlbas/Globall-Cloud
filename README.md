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
- `logistics-control-plane` — authenticated production API for shipment transitions, package traceability, customs cases, finance control, exception resolution, paginated operational reads, and the core control-plane flows.
- `payment-checkout` — authenticated payment-session API for Qicard and FIB create/status/cancel flows; it never exposes provider credentials
- `payment-webhook` — Qicard RSA-signed and FIB callback intake with provider status re-query, idempotent event storage, amount/currency matching, and settlement RPC
- `payment-reconcile` — server-only status polling worker for pending sessions, provider mismatch detection, expiry handling, and reconciliation summary
- `integration-webhook` — HMAC-verified, idempotent provider event intake into `integration_inbox`; it does not execute arbitrary provider payloads
- `public-message` — public contact/quote form submission (rate-limited, honeypot-protected)
- `account-self-password` — authenticated self-service password change
- `account-self-profile` — authenticated self-service profile lookup (staff or customer)
- `lg-track-shipment` — retired; returns 410 Gone. Superseded by `account-admin`/`public-track` after the legacy `lg_shipments`/`lg_tracking_events` tables were dropped. Kept only so old callers do not break unexpectedly.

## Customer workflow
Customer quote/request → shipment creation → warehouse intake → transit/customs → driver assignment → live GPS → ETA/SLA monitoring → delivery proof → delivered → customer notifications.

## Mobile-first experience
Driver and customer surfaces use responsive/mobile-first layouts, safe-area handling, touch-sized controls, realtime tracking states, and Safari/WebKit compatibility layers.

## Security notes
- Use only the Supabase publishable key in browser code.
- Never expose a Supabase service-role key or other secret in frontend code.
- Staff actions are protected by Supabase Auth, role checks, Edge Functions, and RLS.
- Public tracking intentionally exposes only the minimum fields required for shipment tracking.
- Cloudflare security headers enforce CSP and allow only the origins/capabilities required by the production app.

## CI / production integrity
`.github/workflows/production-integrity.yml` validates JavaScript syntax, required files, migration naming, security invariants, Supabase configuration, service-role secret absence, Realtime/CSP requirements, and security gate checks required for production readiness.

## Roadmap and enterprise expansion
This repository already covers the operational logistics core. The next milestone is to evolve it from a strong logistics website into a full enterprise logistics operating system.

### Current maturity
- Tracking: strong
- Warehouse: strong
- Operations: strong
- Customer Portal: strong
- Driver Portal: strong
- Payments: good foundation
- Security: strong
- Analytics: partial foundation
- Finance ERP: incomplete
- HR: incomplete
- Fleet management: incomplete
- AI operations layer: not yet implemented
- Mobile apps: design-first, not yet native

### Priority roadmap
1. Unified Enterprise OS
   - Single shell for operations, warehouse, CRM, finance, HR, analytics, and AI center
   - Shared RBAC and navigation model across customer, driver, staff, and admin roles
2. Finance ERP foundation
   - Chart of accounts, general ledger, journal posting, cash flow, P&L, branch comparison, and payroll linkage
3. HR and fleet modules
   - Attendance, leave management, payroll, staffing KPIs, vehicles, fuel, maintenance, service schedules, and cost tracking
4. BI and analytics
   - Exec reports, revenue forecast, branch comparison, KPI center, and operational dashboards
5. AI layer
   - ETA prediction, OCR/document handling, support agent, smart pricing, and demand forecasting
6. Mobile delivery
   - Android/iPhone app shell, push notifications, and offline sync strategy

### Recommended delivery sequence
- Phase 0: roadmap, governance, issue tracking, and enterprise scope alignment
- Phase 1: enterprise dashboard, finance ledger, and role-based access foundation
- Phase 2: HR and fleet workflows
- Phase 3: BI, AI, and mobile delivery

## Deployment
The intended release path is:
**GitHub `main` → Cloudflare Pages production deployment → Supabase production backend.**

Live deployment verification is a release gate; source code being present on GitHub alone is not treated as proof that the live site is updated. Production release order is: apply the migrations, validate the release artifact, confirm the production environment, and only then proceed to the live deployment.
