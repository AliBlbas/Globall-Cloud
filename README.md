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
- `logistics-control-plane` — authenticated production API for shipment transitions, package traceability, customs cases, finance control, exception resolution, paginated operational reads, and notification outbox processing
- `payment-checkout` — authenticated payment-session API for Qicard and FIB create/status/cancel flows; it never exposes provider credentials
- `payment-webhook` — Qicard RSA-signed and FIB callback intake with provider status re-query, idempotent event storage, amount/currency matching, and settlement RPC
- `payment-reconcile` — server-only status polling worker for pending sessions, provider mismatch detection, expiry handling, and reconciliation summary
- `integration-webhook` — HMAC-verified, idempotent provider event intake into `integration_inbox`; it does not execute arbitrary provider payloads
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

## Production control plane
The production control-plane migration adds `shipment_status_history`, `shipment_packages`, `shipment_customs_cases`, `integration_inbox`, and `notification_outbox`. State changes are performed through `record_shipment_transition`, which applies step monotonicity, delivery-proof gating, idempotency, timeline events, customer notifications, and staff audit logging. Package, customs, exception, and notification operations are exposed through the authenticated `logistics-control-plane` Edge Function and the `control-plane.html` staff console.

The notification pipeline uses `notification-dispatch`, a server-only worker protected by `NOTIFICATION_WORKER_SECRET`. It claims outbox rows with `FOR UPDATE SKIP LOCKED`, delivers `in_app` notifications through Supabase, email through Resend, WhatsApp through the Meta Cloud API, and SMS through Twilio, then completes each row through the retry-aware RPC. Missing provider credentials produce a retryable failure instead of a fake success. Provider event intake remains separated behind `integration-webhook`, which requires a server-side HMAC secret and stores each event once by `(provider, event_id)` before adapter-specific processing.

## v3 advanced logistics workflows

The v3 migration `20260817090000_logistics_advanced_workflows.sql` adds multi-leg routing (`shipment_route_legs`), a warehouse chain-of-custody ledger (`warehouse_movements`), physical consolidation manifests, quote approval and customer acceptance RPCs, standardized dimensional-weight calculation, document-vault metadata with SHA-256 integrity, private `shipment-documents` storage, and server-side reporting. Quote changes, warehouse scans, route-leg updates, and document registration are actor-bound to `auth.uid()` and audited through `staff_activity_log`.

The staff control plane now exposes `quotes`, `documents`, `movements`, and `route_legs` list views, together with `approve_quote`, `record_warehouse_movement`, `upsert_route_leg`, `upload_document`, and `get_report` actions. The customer portal supports a richer quote submission form, quote acceptance, document download links, invoice balances, and payment history. The browser never receives a service-role key or provider credential.

Document uploads are size-limited and hashed in the Edge Function before registration. The storage bucket is private, and the JWT-protected `document-access` endpoint verifies staff/customer ownership before issuing a fresh one-hour signed URL, so expired links do not become a permanent download failure.

## Qicard and FIB payments
Qicard and FIB payments use separate server-side provider adapters. The browser opens `payment-checkout.html?invoice_id=...`, while `payment-checkout` creates and reads payment sessions through Supabase Edge Functions. Qicard uses the documented merchant terminal/API credentials and RSA public key for signed webhook verification. FIB uses the documented OAuth2 client-credentials flow, IQD payment creation, QR/app links, status lookup, and callback URL.

The payment schema adds `payment_sessions` and `payment_webhook_events`. Settlement is accepted only when the provider status is re-queried and the provider amount/currency match the invoice. `record_payment_transaction` applies the ledger update through an idempotent server-side RPC. A browser redirect alone never marks an invoice paid.

Set these as Supabase Edge Function secrets, never in HTML or JavaScript: `NOTIFICATION_WORKER_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `QICARD_API_BASE_URL` (sandbox default is used if omitted), `QICARD_USERNAME`, `QICARD_PASSWORD`, `QICARD_TERMINAL_ID`, `QICARD_WEBHOOK_PUBLIC_KEY`, `FIB_API_BASE_URL` (sandbox default is used if omitted), `FIB_CLIENT_ID`, `FIB_CLIENT_SECRET`, `FIB_CALLBACK_URL` if FIB requires a fixed public callback, `PAYMENT_FINISH_URL`, and `PAYMENT_WORKER_SECRET` for the server-only reconciliation worker. The public callback URL must be HTTPS and reachable from the provider.

Provider documentation must be checked again before switching from sandbox to live. Qicard production access requires merchant-terminal credentials and its gateway public key; FIB production access requires credentials issued through its integration process. The system intentionally returns configuration errors rather than pretending that a payment was accepted.

## Deployment
The intended release path is:
**GitHub `main` → Cloudflare Pages production deployment → Supabase production backend.**

Live deployment verification is a release gate; source code being present on GitHub alone is not treated as proof that the live site is updated. Production release order is: apply the migrations, deploy `logistics-control-plane`, `document-access`, `notification-dispatch`, `payment-checkout`, `payment-webhook`, `payment-reconcile` and `system-health`, set server-side provider secrets, configure the notification worker to run from a protected scheduler/heartbeat, configure public HTTPS callback URLs in Qicard/FIB, then deploy the Pages frontend and run a sandbox transaction and notification test for each enabled provider.

## Local validation

Use Node.js 20 or newer. Install the locked dependency set before running the integrity checks:

```bash
npm ci --ignore-scripts
npm test
bash scripts/validate-production.sh
```

The validation suite now treats the TypeScript parser as mandatory and checks all Supabase Edge Function files instead of silently skipping TypeScript syntax validation when dependencies are unavailable. The GitHub Actions production-integrity workflow runs the same dependency installation step before its release gates.

## GitHub Actions and Cloudflare Pages status

Cloudflare Pages is the production frontend host for this repository. The repository does not require GitHub Pages or a Jekyll build; production deploy status is reported by the Cloudflare Pages check on each `main` commit. GitHub Actions checks such as Production Integrity and CodeQL require the GitHub account to be eligible to run Actions. If GitHub reports that the account is locked due to a billing issue, resolve that account-level issue in GitHub Billing & licensing and rerun the failed workflows; this does not indicate a Cloudflare Pages deployment failure.

After billing is cleared, verify the latest commit with `gh run list --repo AliBlbas/Globall-Cloud --branch main` and confirm the Cloudflare Pages check is successful before treating the release as complete.

## Reliability and recovery runbook

The production release must run the notification-dispatch worker from a protected scheduler or Heartbeat with `NOTIFICATION_WORKER_SECRET`; it must never be exposed as an unauthenticated public job. Payment callbacks and integration events are replay-safe through provider event identifiers and idempotency keys, while outbox deliveries are claimed and completed through retry-aware server-side RPCs.

Before a migration or release, take a Supabase backup or verify the project’s point-in-time recovery window, apply migrations in timestamp order, deploy Edge Functions, run authenticated smoke tests for customer and staff flows, and only then publish the Pages frontend. Recovery should restore the database first, redeploy the matching function commit, and replay only unprocessed outbox or inbox events. Provider credentials, signing keys, and scheduler secrets must be rotated through the platform secret manager rather than committed to this repository.
