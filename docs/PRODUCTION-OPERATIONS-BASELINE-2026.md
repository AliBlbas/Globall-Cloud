# Globall Cloud — Production Operations Baseline 2026

## 1. Production architecture

- Public web: Cloudflare Pages.
- Server-side web/runtime: Cloudflare Pages Functions under `/functions`.
- Primary application database/auth/storage/realtime: Supabase project `ahslifnthiwfkmaswjno`.
- Source control and CI/CD: GitHub repository `AliBlbas/Globall-Cloud`.
- Business workloads already represented by dedicated Edge Functions include tracking, customer self-service, operations, warehouse receiving, notifications, payments, reconciliation, FX refresh, staff analytics, Discord notification, and control-tower functionality.

A dedicated VPS is not required for the current architecture. Add a VPS only for a workload that truly needs persistent processes, long-running workers, custom networking, or software that cannot run on Cloudflare/Supabase.

## 2. Security baseline

- Never expose Supabase service-role/secret keys in browser code.
- Keep RLS enabled on all customer/staff data tables.
- Keep staff and super-admin operations behind authenticated server-side functions.
- Treat webhook verification and payment reconciliation as server-only operations.
- Keep HSTS, CSP, frame-ancestors, X-Frame-Options, Referrer-Policy, Permissions-Policy and no-sniff headers enabled.
- Use explicit deny policies for server-only tables when RLS is enabled without client policies.
- Review Supabase Security Advisor after schema/auth changes and before production releases.
- Enable leaked-password protection and keep OTP expiry below one hour in Supabase Auth configuration.

## 3. Backup and recovery

### Database

- Enable Supabase automated backups appropriate to the plan.
- Keep an independent logical export of critical business tables on a scheduled basis.
- Test restore procedures, not only backup creation.

### Documents

- Keep shipment documents, receipts, proof-of-delivery media and other customer artifacts in Supabase Storage with least-privilege policies.
- Retain production files separately from source code and do not commit credentials or private exports.

### Recovery targets

- Target RPO: <= 15 minutes for operational events when realtime/event replication is configured.
- Target RTO: <= 60 minutes for ordinary application recovery.
- Critical payment or shipment integrity incidents should prioritize correctness over speed of restoration.

## 4. Monitoring

Monitor at minimum:

- `/api/health` edge health endpoint.
- Supabase Edge Function errors and latency.
- Database CPU, memory, connections, storage growth and slow queries.
- Shipment event ingestion and tracking freshness.
- Notification outbox/retry depth.
- Payment webhook/reconciliation failures.
- Warehouse receiving exceptions.
- Authentication failure spikes.
- Cloudflare Pages deployment status.

## 5. Deployment policy

Every production deployment should:

1. Validate JavaScript syntax.
2. Run repository tests and invariant checks.
3. Build a deployment bundle without secrets, SQL dumps or local environment files.
4. Deploy the static site plus Pages Functions.
5. Run a production health check after deployment.
6. Roll back the commit if the health check or critical smoke tests fail.

## 6. Hardware guidance

The current web platform is serverless/managed, so office hardware does not determine public-site capacity.

Recommended internal baseline for staff users:

- Modern i5/Ryzen 5 class CPU or better.
- 8 GB RAM minimum; 16 GB preferred for heavy operations dashboards.
- SSD storage.
- Stable broadband with low packet loss.
- Modern Chromium/Safari/Firefox browser.
- UPS for office network equipment and warehouse workstations.

Warehouse scanning devices should prioritize camera quality, battery endurance, Wi-Fi stability and ruggedness over raw CPU power.

## 7. Operational checklist

### Daily

- Confirm edge health.
- Confirm Supabase health.
- Review payment/reconciliation exceptions.
- Review shipment exceptions and overdue statuses.
- Review warehouse receiving backlog.
- Confirm notification retries are not accumulating.

### Weekly

- Review Security Advisor.
- Review failed GitHub Actions.
- Review database growth and query latency.
- Sample-check shipment audit trails.
- Verify backups and at least one restore artifact.

### Monthly

- Review access roles and inactive staff accounts.
- Rotate integration credentials where operationally appropriate.
- Review unused indexes and tables before removing anything.
- Test disaster-recovery procedures.
- Review Cloudflare/Supabase/GitHub configuration drift.

## 8. Release gates

A release is production-ready only when:

- Authentication works.
- Customer tracking works.
- Staff authorization is enforced.
- Shipment create/update/read paths work.
- Warehouse receiving paths work.
- Payment webhook verification/reconciliation works.
- Notifications do not leak private data.
- Health endpoint returns healthy state.
- Static assets load correctly on iPhone Safari and desktop browsers.
- No secrets are present in the repository or deployment artifact.

## 9. Known items requiring configuration outside source control

The following require account/project-level configuration and should not be hardcoded into the repository:

- Supabase Auth OTP lifetime.
- Supabase leaked-password protection.
- Supabase backup/retention plan.
- Cloudflare API credentials and Pages project settings.
- GitHub Actions availability/billing/runner settings.
- External payment, WhatsApp/Discord and mapping provider secrets.
