# Globall Cloud System Status

This repository reflects the current production direction of Globall Cloud:

- **Frontend**: Cloudflare Pages static site
- **Backend**: Supabase Postgres + Auth + Storage + RLS + Edge Functions
- **Staff entry**: `management.html`
- **Staff portal**: `staff-portal.html`
- **Operations suite**: `operations-suite.html`
- **Management console**: `accounts-console.html`
- **Analytics**: `admin-dashboard.js` loads through the `account-admin` Edge Function instead of querying sensitive tables directly from the browser

## Live logistics tracking
- The public route card now renders a real interactive Leaflet/OpenStreetMap map rather than an SVG-only illustration.
- The China → Dubai leg is rendered as a multimodal geodesic corridor; Dubai → Erbil uses live road geometry from OSRM when available.
- Shipment coordinates (`origin_*`, `dest_*`, `current_*`) and transport metadata are stored in `public.shipments` when available.
- `public.shipment_tracking_events` stores auditable status/location/photo events with public-safe visibility and Supabase Realtime support.
- `public-track` Edge Function v6 returns safe shipment location data and public tracking events, while customer/staff-only fields remain protected.
- The map subscribes to shipment updates and moves the live marker without requiring a page refresh.

## Security hardening completed
- Mobile/public UI was polished without changing business logic.
- Privileged `SECURITY DEFINER` helpers were moved behind the non-exposed `private` schema.
- Public `is_staff()` / `is_admin()` wrappers are now `SECURITY INVOKER` and callable only by `authenticated` users.
- Public shipment tracking keeps its anonymous API behavior, while privileged implementation lives behind private helpers.
- Direct browser access to `app_settings` was removed; the `public-config` Edge Function uses the server-side service role key.
- Cloudflare `_headers` includes HSTS and explicitly allows the map routing dependency under the report-only CSP.
- Reproducible live-tracking migration: `supabase/migrations/20260812_live_logistics_tracking.sql`.

## Current Supabase project
- Project ID: `ahslifnthiwfkmaswjno`
- URL: `https://ahslifnthiwfkmaswjno.supabase.co`
- Region: `eu-central-1`

## Current architecture notes
- `public-config` and `public-track` are origin-allowlisted public Edge Functions.
- The service role key remains server-side only.
- Remaining advisor warnings are focused mostly on intentional authenticated table exposure and platform/auth configuration; they should be handled incrementally without breaking customer/staff workflows.
