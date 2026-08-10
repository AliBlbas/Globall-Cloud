# Globall Cloud — Production QA Patch

## Applied safely
- Added defense-in-depth staff-session/role checks before full shipment reads.
- Added staff-role guard before admin message reads.
- Added staff-session/role checks before single-shipment staff reads.
- Added Cloudflare `Content-Security-Policy-Report-Only` so the policy can be observed before enforcement.

## Intentionally not changed
- Supabase RLS policies or production data.
- Payment secrets or gateway credentials.
- Customer tracking RPC behavior.
- Storage buckets.

## Required production verification
1. Sign in as each staff role and verify dashboard, shipments, messages, warehouse, and exports.
2. Sign in as a normal customer and verify customer tracking/dashboard still works.
3. Review browser CSP reports; only then consider enforcing CSP.
4. Run Supabase Security Advisor after the application regression test.
5. Deploy this build to Cloudflare Pages only after the above checks pass.
