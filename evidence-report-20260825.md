# Globall Cloud Production Evidence Report — 2026-08-25

## Executive summary

The existing Globall Cloud application was improved in place. No replacement site, new Supabase project, new Cloudflare Pages project, production business records, real receipt uploads, payment mutations, chat messages, or owner credentials were used. The repository remains `AliBlbas/Globall-Cloud`, the Supabase project remains `ahslifnthiwfkmaswjno`, and Cloudflare Pages continues to deploy the `main` branch.

This increment completes two connected read-only visibility surfaces. Customers can now receive ownership-filtered warehouse receipt evidence from `customer-self`, including receipt stage, location, GC verification metadata, timestamps, and validated photo URLs. The Customer Portal includes a Warehouse Evidence panel with escaped text and safe external photo links. Staff with the existing permitted shipment-operations scope can select a shipment in Staff OS and load a protected lifecycle timeline from the existing `operations-admin` events contract, with a current-location map link when real coordinates are present and a retry state on failure.

## Implementation evidence

| Area | Result | Evidence |
| --- | --- | --- |
| Customer warehouse evidence API | Implemented and deployed | `supabase/functions/customer-self/index.ts` returns `receipts` using `directory_customer_id = customer.id`, bounded to 30 rows. |
| Customer Portal rendering | Implemented and deployed | `gc-csp-scripts/customer-portal-inline-1.js` renders `dashboard.receipts` with escaped values, status, stage, location, GC code, timestamp, count, and safe `https` photo links. |
| Staff shipment lifecycle | Implemented and deployed | `staff-os-console.js` calls the protected `operations-admin` `kind=events` endpoint only after an authenticated Staff OS user selects a shipment. |
| Ownership and role boundaries | Preserved | Customer receipts remain customer-directory scoped. Operations event reads use the established server-side shipment scope, including driver/warehouse restrictions. No sensitive direct browser writes were added. |
| Cache compatibility | Updated | Customer controller is `v=20260825-1`; Staff controller is `v=20260825-4`; service-worker cache advanced to `gc-v58`; local and CI release assertions were updated. |
| Git and deployment | Published | Commit `8575f1c` exposed customer warehouse evidence; commit `2b1ed59` added the protected Staff lifecycle timeline. Both were pushed to `main`. |

## Validation results

| Check | Result |
| --- | --- |
| Repository JavaScript and Edge Function syntax | Pass: 48 JavaScript files and 23 TypeScript files. |
| `npm test` | Pass. |
| `bash scripts/validate-production.sh` | Pass: all production checks passed, including asset integrity, CSP, role guards, provider guards, migration filename checks, and no hardcoded service-role secret. |
| `git diff --check` | Pass before the lifecycle commit. |
| Public production E2E | Pass: 39/39 assertions against the live site and Supabase public function contracts. |
| Cloudflare Pages deployment for `2b1ed59` | Success. Deployment ID `a764fa85-680c-477a-a11e-f64544f9da8a`; production branch `main`; build and deploy stages successful. |
| Live Customer Portal route | Pass: `/customer-portal` loaded HTTP 200 and showed the Warehouse Evidence panel. |
| Live customer renderer asset | Pass: deployed `customer-portal-inline-1.js?v=20260825-1` contains both `renderReceipts` and `renderReceipts(dashboard.receipts || [])`. |
| Live Staff OS route | Pass: `/staff-os` loaded the protected login shell; unauthenticated access remains gated. |
| Live Staff renderer asset | Pass: deployed `staff-os-console.js?v=20260825-4` contains the protected `operations-admin` endpoint, timeline loader, and retry state. |

## Explicit limitations

An authenticated customer photo-visibility E2E was not claimed because no dedicated synthetic customer account with a correctly linked `customer_directory.auth_user_id` was supplied. No receipt row or photo was created merely to test production. Therefore, the live API ownership query, renderer, and UI contract are deployed and statically/publicly verified, while the final authenticated data-bearing path remains credential-dependent.

The Staff timeline was not tested with owner credentials or a live shipment click. Its protected route, server-side event scope, client wiring, syntax, release gates, and unauthenticated public denial were verified. A real click-through requires a permitted synthetic Staff account and an existing non-sensitive test shipment. Two-user Realtime chat/presence, OCR provider execution, WhatsApp delivery, push notifications, voice notes, offline synchronization, payment-provider callbacks, and map tile rendering remain provider- or multi-session-dependent and are not represented as fully certified.

The public E2E suite intentionally uses honeypot/no-op quote and contact payloads. It does not create real quote or contact business records.

## Next safe increments

The next recommended sequence remains: add finance branch filters and read-only export through the protected finance contract; improve chat room onboarding, unread/read state, reconnect handling, and two-session staging validation; then complete reporting and responsive regression coverage at 320, 360, 390, 430, and 768 CSS pixels. Provider-dependent work should remain adapter-based until the required provider credentials, templates, callback URLs, and terms are explicitly supplied.

> Production safety boundary: real receipt uploads, quote acceptance, customer messages, staff tasks, chat sends, finance mutations, payment callbacks, and destructive deletes remain excluded from default verification and must target a disposable staging fixture with synthetic identities and a verified cleanup path.

## References

1. [Globall Cloud production site](https://globall-cloud.pages.dev/)
2. [Customer Portal](https://globall-cloud.pages.dev/customer-portal)
3. [Staff OS protected route](https://globall-cloud.pages.dev/staff-os)
4. [Globall Cloud GitHub repository](https://github.com/AliBlbas/Globall-Cloud)
5. [WhatsApp primary contact CTA](https://wa.me/message/4P6O3FXDR4HUA1)

**Author:** Manus AI
> This report is based on repository checks, protected-contract inspection, public no-op smoke tests, and Cloudflare deployment evidence collected during the current task. It does not replace authenticated staging certification.
