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

The v3 migration `20260817222324_logistics_advanced_workflows.sql` adds multi-leg routing (`shipment_route_legs`), a warehouse chain-of-custody ledger (`warehouse_movements`), physical consolidation manifests, quote approval and customer acceptance RPCs, standardized dimensional-weight calculation, document-vault metadata with SHA-256 integrity, private `shipment-documents` storage, and server-side reporting. Quote changes, warehouse scans, route-leg updates, and document registration are actor-bound to `auth.uid()` and audited through `staff_activity_log`.

The staff control plane now exposes `quotes`, `documents`, `movements`, and `route_legs` list views, together with `approve_quote`, `record_warehouse_movement`, `upsert_route_leg`, `upload_document`, and `get_report` actions. The customer portal supports a richer quote submission form, quote acceptance, document download links, invoice balances, and payment history. The browser never receives a service-role key or provider credential.

Document uploads are size-limited and hashed in the Edge Function before registration. The storage bucket is private, and the JWT-protected `document-access` endpoint verifies staff/customer ownership before issuing a fresh one-hour signed URL, so expired links do not become a permanent download failure.

## Super Admin staff control

`super-admin-command-center.html` is the privileged staff-management surface. A Super Admin can create staff accounts, change full name, email, role, branch, password, and active state, reactivate inactive staff, and deactivate/delete staff accounts across the `china`, `dubai`, `erbil`, and `all` branches. The UI is provided by `super-admin-staff-manager.js` with responsive styling in `super-admin-staff-manager.css`.

All staff mutations are routed through the existing JWT-protected `account-admin` Edge Function. The function creates or updates Supabase Auth users and the corresponding `staff` row, writes an audit record, prevents self-deactivation, and only allows the `super_admin` role to create accounts or grant the `super_admin` role. A staff deletion request deactivates the staff record and attempts to remove the linked Auth user; any Auth deletion warning is surfaced instead of being hidden.

## Qicard and FIB payments
Qicard and FIB payments use separate server-side provider adapters. The browser opens `payment-checkout.html?invoice_id=...`, while `payment-checkout` creates and reads payment sessions through Supabase Edge Functions. Qicard uses the documented merchant terminal/API credentials and RSA public key for signed webhook verification. FIB uses the documented OAuth2 client-credentials flow, IQD payment creation, QR/app links, status lookup, and callback URL.

The payment schema adds `payment_sessions` and `payment_webhook_events`. Settlement is accepted only when the provider status is re-queried and the provider amount/currency match the invoice. `record_payment_transaction` applies the ledger update through an idempotent server-side RPC. A browser redirect alone never marks an invoice paid.

Set these as Supabase Edge Function secrets, never in HTML or JavaScript: `NOTIFICATION_WORKER_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `QICARD_API_BASE_URL` (sandbox default is used if omitted), `QICARD_USERNAME`, `QICARD_PASSWORD`, `QICARD_TERMINAL_ID`, `QICARD_WEBHOOK_PUBLIC_KEY`, `FIB_API_BASE_URL` (sandbox default is used if omitted), `FIB_CLIENT_ID`, `FIB_CLIENT_SECRET`, `FIB_CALLBACK_URL` if FIB requires a fixed public callback, `PAYMENT_FINISH_URL`, and `PAYMENT_WORKER_SECRET` for the server-only reconciliation worker. The public callback URL must be HTTPS and reachable from the provider.

Provider documentation must be checked again before switching from sandbox to live. Qicard production access requires merchant-terminal credentials and its gateway public key; FIB production access requires credentials issued through its integration process. The system intentionally returns configuration errors rather than pretending that a payment was accepted.

## Deployment
The live release observed on 2026-11-11 was served from GitHub branch `Product`, commit `5e19e98e55515c2df17b9cb7ef87d740dc5ebaff`. Do not assume `main` is the production branch; confirm the deployed branch and exact commit from `/release.json` before preparing a release.

Cloudflare Pages is the live frontend host. Production releases must use the checked GitHub Actions workflow; source code or a successful CI run alone is not proof that the live site updated. After deploy, verify `/api/health`, `/api/ready`, and `/release.json`, and require the live release commit to equal the intended source commit. Production release order is: apply the migrations, deploy `logistics-control-plane`, `document-access`, `notification-dispatch`, `payment-checkout`, `payment-webhook`, `payment-reconcile` and `system-health`, set server-side provider secrets, configure the notification worker to run from a protected scheduler/heartbeat, configure public HTTPS callback URLs in Qicard/FIB, then deploy the Pages frontend and run a sandbox transaction and notification test for each enabled provider.

## CI/CD release gate

`Production CI and Cloudflare Pages Deploy` is configured to run on every push and pull request. It runs `npm ci`, `npm test`, production contract checks, production/security validation, asset integrity validation, and the Pages build. Only after all of those steps pass may a push to `Product` proceed to Cloudflare deployment; that run then checks health, backend readiness, exact release SHA, and read-only public/international smoke tests. The Supabase Edge Functions workflow runs the same validation suite before its deployment job.

Activation is not complete until Cloudflare's automatic Git production/preview builds are disabled and these repository Actions secrets are configured: `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit), `CLOUDFLARE_ACCOUNT_ID`, and `SUPABASE_ACCESS_TOKEN` (for the existing Edge Function deployment). Never commit these values. Until the Cloudflare auto-build switch and credentials are in place, do not merge the production workflow: Cloudflare's current Git integration can deploy independently of Actions, and the current repository's deploy runs report missing credentials.

## Local validation

Use Node.js 20 or newer. Install the locked dependency set before running the integrity checks:

```bash
npm ci --ignore-scripts
npm test
bash scripts/validate-production.sh
```

## Private Excel reconciliation

The repository includes `scripts/audit-workbook.py` and `docs/WORKBOOK_IMPORT.md` for reviewing private operational workbooks before an approved import. The utility repairs Excel files locally when their stylesheet XML is incompatible with strict readers, reports sheet structure, and deliberately avoids exporting or uploading private rows. Raw `.xlsx`/`.xlsm` files and local audit outputs are ignored by Git.

The validation suite now treats the TypeScript parser as mandatory and checks all Supabase Edge Function files instead of silently skipping TypeScript syntax validation when dependencies are unavailable. The GitHub Actions production-integrity workflow runs the same dependency installation step before its release gates.

## GitHub Actions and Cloudflare Pages status

Cloudflare Pages is the production frontend host for this repository. The repository does not require GitHub Pages or a Jekyll build. The `Production CI and Cloudflare Pages Deploy` workflow validates every push and pull request; its Product deployment steps are sequentially downstream of all tests and build checks. The separate Supabase function deploy job also depends on full validation and is configured only for the `Product` branch. GitHub Actions checks such as Production Integrity and CodeQL still require the GitHub account to be eligible to run Actions. If GitHub reports that the account is locked due to a billing issue, resolve that account-level issue in GitHub Billing & licensing; a runner or secret failure blocks deployment and must not be bypassed.

Use `gh run list --repo AliBlbas/Globall-Cloud --branch Product` to inspect release workflow runs. Treat `/release.json` exact-commit verification and `/api/ready` as the live deployment evidence; do not infer deployment status from a branch name or Actions history alone.

## Reliability and recovery runbook

The production release must run the notification-dispatch worker from a protected scheduler or Heartbeat with `NOTIFICATION_WORKER_SECRET`; it must never be exposed as an unauthenticated public job. Payment callbacks and integration events are replay-safe through provider event identifiers and idempotency keys, while outbox deliveries are claimed and completed through retry-aware server-side RPCs.

Before a migration or release, take a Supabase backup or verify the project’s point-in-time recovery window, apply migrations in timestamp order, deploy Edge Functions, run authenticated smoke tests for customer and staff flows, and only then publish the Pages frontend. Recovery should restore the database first, redeploy the matching function commit, and replay only unprocessed outbox or inbox events. Provider credentials, signing keys, and scheduler secrets must be rotated through the platform secret manager rather than committed to this repository.
