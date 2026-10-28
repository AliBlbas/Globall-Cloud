# Globall Cloud — Production Refactor Notes (2026-10-28)

## What changed

- Scoped admin-only CSS/JS injection to staff and administration URLs.
- Unified customer self-service with the deployed `account-self-profile` Edge Function; profile preferences and private avatar storage now use owner-scoped paths and signed URLs.
- Consolidated public registration on `customer-gc-register`, restored an email-confirmation-aware Auth flow, and made confirmation return to the site's login page.
- Added a service-role-only `register_customer_with_gc` RPC and an atomic database-backed GC-code sequence. Existing `GC-###` and `GCN-###` codes are accepted by the customer login endpoint.
- Updated customer login to verify that the Auth user actually matches the customer-directory account linked to the entered GC code.
- Fixed stateless Edge Function authentication to validate the bearer JWT explicitly. Password changes use the Auth REST endpoint with the supplied user's JWT instead of relying on a persisted server-side session.
- Routed staff GC-code allocation and customer archival through the protected `account-admin` Edge Function.
- Replaced hard-coded quote prices with the active `gc_rate_cards` database contract on the public and staff calculators. When no verified rate exists, the calculators request a custom quote rather than inventing one.
- Added `/dashboard` and `/portal` redirect rules; bumped the service-worker cache and included the customer settings assets.
- Removed two unreferenced backup images and one unreferenced stylesheet after searching the source tree for references.
- Added regression invariants to `tests/validate.mjs`.

## Required deployment steps

1. Back up the production database before schema changes.
2. Apply the new migration `supabase/migrations/20261028070000_gc_customer_account_completion.sql` using the normal Supabase migration workflow.
3. Deploy the updated Edge Functions: `customer-gc-register`, `customer-gc-login`, `account-self-profile`, `account-self-password`, `account-admin`, `public-config`, `driver-gps`, `document-access`, `logistics-control-plane`, `payment-checkout`, `operations-admin`, and `public-track`.
4. Confirm the Supabase Auth email-confirmation template and allowed redirect URLs include `https://globall-cloud.pages.dev/login.html` (and the approved Netlify deployment if used).
5. Deploy the static site to Cloudflare Pages so `_middleware.js`, `_redirects`, the front-end files, and the updated service worker are published together.
6. In a staging project, test registration, confirmation email, GC/GCN login, profile edits, avatar upload, customer archival, staff GC allocation, every quote-rate combination, tracking access, and payment provider flows before production rollout.

## Validation performed on the ZIP source

- JavaScript `node --check`: all 49 files passed.
- TypeScript syntax transpilation: all 20 Edge Function files passed using the installed TypeScript compiler.
- Required production files: all 21 present.
- Supabase migration naming: all 109 migration files passed the filename convention.
- Structural regression checks: all passed.

This validation is static/source-level only. The migration has not been executed against the live database, Edge Functions have not been deployed, and live Auth, storage, rate cards, payment gateways, and browser journeys were not available to verify from this ZIP alone.
