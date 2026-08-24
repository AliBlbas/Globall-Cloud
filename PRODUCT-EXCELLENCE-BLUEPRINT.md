# Globall Cloud — Product Excellence Blueprint

## Product direction

Globall Cloud should feel like an operating system for cross-border logistics rather than a brochure website. The public experience should answer three questions immediately: where the shipment can move, how the customer can request or track it, and why the operator is trustworthy. The internal experience should make every operational state visible without forcing staff to switch between legacy consoles.

## Experience pillars

| Pillar | Public experience | Staff experience | Technical contract |
| --- | --- | --- | --- |
| Clarity | One primary tracking action, one quote action, route and service proof | One command center with role-aware modules | Preserve current route names, IDs, and authenticated API contracts |
| Trust | Live corridor, visible service coverage, operational proof, clear contact paths | Health state, delivery status, audit trail, unread indicators | Never expose service-role credentials or internal records |
| Speed | Shorter path to tracking and quote request; good empty/error states | Bounded list responses, refresh and realtime signals | Keep account-admin JWT boundary and Supabase RLS |
| Distinction | Navy/cyan/gold signal language, route-line visual system, consistent iconography | Dense but calm operational cockpit with clear hierarchy | Use existing static-site architecture and versioned assets |
| Resilience | Graceful unavailable/offline messaging instead of migration jargon | Retryable API states and safe role fallback | Keep legacy URLs and Cloudflare rewrites valid |

## Delivery order

First, preserve and verify the current production foundation: Supabase bootstrap, Staff OS route, account-admin, migrations, RLS, Realtime publication, and Cloudflare Git integration. Second, add visual refinement through externalized, low-risk CSS overrides and small markup additions that do not change existing data attributes or event contracts. Third, improve staff and public empty/error/loading states only where the live contract proves a real issue. Fourth, validate at 320, 360, 390, 430, 768, and desktop widths, then verify public deployment and protected API behavior.

## Non-breaking boundaries

The implementation must not replace the static-site architecture, remove the legacy `staff-os.html` route, change Supabase table semantics, expose staff data to anonymous users, or bypass `account-admin` for privileged mutations. Any new UI action must use the existing `data-gc-onclick` or current Staff OS controller patterns. Database changes must be forward-only and must preserve Realtime, notifications, activity logs, and service-role Edge Function access.

## Success criteria

A release is successful when the public homepage presents a premium and coherent logistics identity, tracking and quote actions remain functional, the Staff OS opens at `/staff`, role-aware staff access remains protected, account-admin protected requests return intentional 401/403 responses instead of schema/permission-driven 500s, and the repository and Cloudflare production deployment point to the same commit. Authenticated multi-user Realtime chat remains a separately identified test if no two staff sessions are available.
