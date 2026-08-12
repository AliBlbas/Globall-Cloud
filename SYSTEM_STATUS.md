# Globall Cloud System Status

This repository reflects the current production direction of Globall Cloud:

- **Frontend**: Cloudflare Pages static site
- **Backend**: Supabase Postgres + Auth + Storage + RLS + Edge Functions
- **Staff entry**: `management.html`
- **Staff portal**: `staff-portal.html`
- **Operations suite**: `operations-suite.html`
- **Management console**: `accounts-console.html`
- **Analytics**: `admin-dashboard.js` loads through the `account-admin` Edge Function instead of querying sensitive tables directly from the browser

## Security hardening completed
- Mobile/public UI was polished without changing business logic.
- Privileged `SECURITY DEFINER` helpers were moved behind the non-exposed `private` schema.
- Public `is_staff()` / `is_admin()` wrappers are now `SECURITY INVOKER` and callable only by `authenticated` users.
- Public shipment tracking keeps its anonymous API behavior, while the privileged implementation now lives in `private.track_shipment()`.
- Direct browser access to `app_settings` was removed; the `public-config` Edge Function now uses the server-side service role key.
- Cloudflare `_headers` now includes HSTS for HTTPS production traffic.
- Reproducible migration: `supabase/migrations/20260812_move_privileged_helpers_private.sql`.

## Current Supabase project
- Project ID: `ahslifnthiwfkmaswjno`
- URL: `https://ahslifnthiwfkmaswjno.supabase.co`
- Region: `eu-central-1`

## Current architecture notes
- `public-config` is an unauthenticated Edge Function with strict origin allowlisting for the production domains.
- The service role key remains server-side only.
- Remaining advisor warnings are now focused mostly on intentional authenticated table exposure and platform/auth configuration. These should be handled incrementally without breaking customer/staff workflows.
