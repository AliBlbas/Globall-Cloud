# Globall Cloud — Production Cutover Status · 2026-09-23

## Verified foundation

- Frontend: Cloudflare Pages static site.
- Backend: Supabase Postgres, Auth, Storage, RLS and Edge Functions.
- Supabase project: `ahslifnthiwfkmaswjno` (`eu-central-1`).
- Customer, staff, shipment, warehouse, tracking, finance, document and notification tables are present with RLS enabled in the production database.
- Privileged SECURITY DEFINER implementations are isolated in the `private` schema; public security-sensitive wrappers are not executable by `anon`.

## Product surfaces

1. **Public Logistics Platform** — explains the service, coverage and workflow, supports tracking and quote requests, and now presents a first-visit three-platform orientation.
2. **Customer Platform** — customer account/dashboard surface for shipments, tracking, documents, finance and notifications.
3. **Staff / Admin Platform** — protected Staff OS / command-center surface with role-aware operations, warehouse, finance, notifications and audit capabilities.

## Shopping retirement

- Legacy `shop/index.html`, `shop/order.html`, `shop/orders.html`, `shop/shein.html` and the legacy admin shopping page were removed.
- `/shop`, `/shop/` and `/shop/*` redirect to Logistics Services.
- Shared legacy navigation no longer exposes Shop/SHEIN/My Orders.
- Shopping/SHEIN database rows were retained for historical audit continuity.
- Shopping/SHEIN RPC execution and direct table access were revoked from `anon` and `authenticated`; service-role access remains for controlled archival/reconciliation only.

## Verification performed

- Production database connection verified.
- RLS inventory verified across public/private tables.
- Core shipment, quote, invoice, payment, document, notification and staff/customer contracts inspected.
- Shopping commerce RPC/table access verified disabled for app roles after migration.
- Current GitHub deployment workflow inspected.

## Current blocker

The Cloudflare Pages GitHub Actions workflow is currently failing at the runner/startup boundary within seconds of each Product push, before application steps are exposed in the job. The deployment workflow itself contains repository validation, Cloudflare credential checks, bundle checks, production health verification and exact live-release verification. This means live deployment cannot honestly be marked PASS until the GitHub Actions runner/account issue is resolved and the workflow completes those checks.

## Required release gate

Do not call the release production-complete until all of the following are green:

- repository validation (`npm test`)
- server-side JavaScript syntax checks
- Cloudflare Pages deployment
- `/api/health` returns `ok: true`
- `/release.json` commit exactly matches the deployed GitHub commit
- Supabase authenticated customer E2E
- Supabase staff/admin role E2E
- tracking public/negative-path checks
- payment sandbox/webhook checks with real provider credentials
- notification provider sandbox tests
- private document access tests
- mobile QA at 320/360/390/430/768 and desktop widths

A source-level PASS is not treated as a live-production PASS until the deployment and authenticated E2E gates are green.
