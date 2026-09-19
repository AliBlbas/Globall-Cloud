# Shipment 360 live verification

Date: 2026-08-25

## Deployment

The existing GitHub repository `AliBlbas/Globall-Cloud` is clean on `main` at commit `2c0426965c113df2816cf398b658cbee2e171c1e` (`fix: wire shipment 360 actions`). Cloudflare Pages deployment `8866d8a0-e6a2-4875-a67a-393c2e886b5a` for project `globall-cloud` completed with deploy status `success`. The protected Supabase `logistics-control-plane` function was deployed as version 18 with JWT verification enabled.

## Live authenticated read verification

The live route `https://globall-cloud.pages.dev/staff-os?tab=shipments&release=2c04269` served the existing Staff OS and rendered a current authenticated browser session with role `super_admin`, branch `all`, and 14 visible shipments. No credentials were entered during this verification and no production write was triggered.

The live page loaded `staff-os-console.js?v=20260825-14`, `staff-os-ultra.css?v=20260825-11`, and the service-worker cache marker `gc-v69`. The first 360 action opened the Shipment 360 panel for `GC45608582`. The panel rendered the real shipment snapshot (`pending`, `normal`, weight `13`, with no fabricated volume, ETA, or location values) and related sections for lifecycle events, packages, route legs, customs, warehouse movements, manifests, exceptions, documents, invoices, and payments.

The browser recorded protected shipment-scoped requests for each related kind, including `shipment_id=GC45608582`. The UI honestly reported partial data for `events`, `manifests`, and `exceptions` where the current protected response was unavailable, and displayed empty states for related collections with zero records. This confirms the UI does not substitute invented operational values.

## Security and negative-path checks

The unauthenticated request to `https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/logistics-control-plane?kind=events&shipment_id=probe` returned HTTP 401 with `UNAUTHORIZED_NO_AUTH_HEADER`. The public `system-health` endpoint returned HTTP 200. Repository syntax checks, `npm test`, production validation, asset integrity, role/provider/reliability guards, and `git diff --check` all passed.

## Remaining boundary

The live session used for this verification was already authenticated. A dedicated synthetic staff account is still required for independent login testing, role-by-role branch scoping, and mobile authenticated screenshots at all required widths. Provider callbacks, outbound notifications, payments, and all production writes remain untested and intentionally untouched.
