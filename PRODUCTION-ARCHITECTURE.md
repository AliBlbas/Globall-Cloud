# Global Cloud Logistics OS — Production Architecture

> Production target: China / UAE → Iraq / Erbil logistics operations.

## System boundaries

- **Web edge:** Cloudflare Pages for the public/customer/staff web surfaces.
- **Data + auth:** Supabase Postgres, Auth, Storage and Realtime.
- **Server authority:** Supabase Edge Functions for privileged operations, webhooks, payment orchestration, document access, tracking and notifications.
- **Client authority:** browser code may use only the Supabase publishable key; privileged provider secrets must remain server-side.

## Operational domains

1. Shipment lifecycle and auditable state transitions.
2. Package-level traceability and barcode/scan workflows.
3. China → UAE/Dubai → Iraq/Erbil route legs and warehouse movement.
4. Customs case management and shipment documents.
5. Delivery assignment, driver GPS and proof-of-delivery.
6. Customer notifications with deterministic event keys and retryable delivery.
7. Invoice, QiCard/FIB payment-session and reconciliation controls.
8. Staff / admin / super-admin authorization and audit trail.
9. Public tracking with masked public-safe fields.
10. System health and production readiness checks.

## Production rules

- Database schema and Edge Functions must be versioned together.
- A migration is not considered production-ready until it has been applied successfully and the dependent server functions are verified against the resulting schema.
- Public endpoints must return only explicitly public-safe fields.
- Privileged RPCs must not be executable by `anon` or ordinary `authenticated` clients unless the authorization model explicitly requires it.
- Payment webhooks must be authenticated, idempotent and auditable.
- Notification dispatch must be idempotent and retry-safe.
- Document downloads must be authorized before issuing signed URLs.
- Driver/live-location writes must be authenticated and scoped to the assigned delivery context.
- Cloudflare Pages assets referenced by HTML/service-worker code must exist in the deployed Git tree.

## Release gates

Before merging production code:

- JavaScript syntax validation passes.
- Asset-reference integrity passes.
- CSP/external-script validation passes.
- Migration ordering and schema dependencies are verified.
- Supabase security and performance advisors have no newly introduced high-risk findings.
- Authenticated smoke tests cover customer, staff, shipment tracking and critical privileged actions.
- Payment and webhook changes are tested with deterministic/idempotent replay cases.

## Naming

Customer-facing product name: **Global Cloud Logistics**.

Internal platform name: **Global Cloud Logistics OS**.

The existing `globall-cloud.pages.dev` hostname and repository name are retained to avoid breaking deployment URLs and integrations.
