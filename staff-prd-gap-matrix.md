# Globall Cloud Staff OS — PRD Gap Matrix

## Baseline

The current application remains a static HTML/CSS/vanilla JavaScript Cloudflare Pages site backed by Supabase Auth, Postgres, RLS, Storage, Realtime, and protected Edge Functions. The existing Staff OS now authenticates the owner successfully as `super_admin` with `branch = all`. The current protected API is `account-admin`; its actor check derives identity from the JWT and loads the matching `public.staff` row server-side.

## Current coverage and gaps

| PRD area | Existing coverage | Verified gap | Safe next implementation |
| --- | --- | --- | --- |
| Staff authentication and role gate | Working Staff OS login, protected account-admin API, owner role/branch visible; protected Staff CRUD now exists in Staff OS | Impersonation, bulk actions, restore, and old-vs-new audit snapshots are not yet implemented | Extend the protected account-admin contract incrementally; keep self-lockout protections and server-side audit logging |
| Staff CRUD and role boundaries | account-admin has create, update, archive/delete handlers for staff; Super Admin checks exist | Existing UI mostly delegates to a separate command center and still contains direct browser staff reads in legacy assets | Use the protected API from the existing Super Admin surface; preserve self-lockout protections and audit logging |
| Dashboard | Real shipment/customer/task/quote/notification/chat summary calls | Some panels are summary-only and several failures surfaced when service_role table grants were missing | Keep bounded API reads and add per-panel loading/error/retry states rather than masking failures |
| Finance | account-admin `finance` and `pricing` reads exist; server-side aggregation computes revenue, collected, outstanding, costs, profit | UI serializes currency maps as `{}`/JSON text and has no branch filter/export; service_role grants were incomplete and have been repaired for current tables | Render currency-aware metrics, branch filtering, and read-only export first; keep mutations behind existing protected actions |
| Warehouse receipts | account-admin receipt list/create path exists; multipart photo upload currently targets `warehouse-receipts` | PRD requests cargo-linked receipt table, multiple evidence photos, GPS, lightbox, edit/delete, camera capture, OCR, and audit trail | Extend the existing protected receipt API with validated metadata/photo operations; add OCR as a provider-gated adapter with a manual customer-match fallback |
| Cargo lifecycle | Existing shipment/tracking tables, status history/events, route legs, and public/private tracking functions | Staff OS has no timeline/map view; map provider configuration and realtime live updates are not yet proven | Add a read-only lifecycle timeline and map-ready coordinates using existing shipment event contracts; require provider key only for actual map tiles |
| Customer portal visibility | Customer portal and customer-self function exist; notifications tables exist | Receipt evidence and stage notifications are not yet visibly connected end-to-end | Add ownership-filtered receipt/photo timeline reads and notification records through existing protected contracts |
| Chat and notifications | account-admin chat list/send/read handlers and staff chat tables exist | Screenshot showed empty room state; two-user realtime/presence is not verified | Add room membership/onboarding visibility, unread/read state, reconnect handling, and explicitly test two synthetic sessions in staging |
| Audit trail | staff_activity_log table, server-side logActivity calls, and audit list exist | Direct module activity reads previously lacked service_role grants; full immutable evidence and old/new snapshots are not standardized | Keep audit writes server-side and add bounded, read-only audit presentation with actor/action/target metadata |
| Reports | Data hub and basic summaries exist | No Excel/PDF export surface in Staff OS | Add CSV/XLSX export without production writes; PDF only if explicitly requested |
| Responsive/RTL UX | Mobile shell and RTL layout render at phone width | Dense tables, forms, lightboxes, and error states need systematic width testing | Validate at 320/360/390/430/768 CSS px and add responsive table/form patterns per module |

## Security and deployment constraints

All write operations must remain behind JWT-authenticated Edge Functions. Browser clients must not receive service-role credentials or direct access to sensitive tables. New schema changes must be forward-only migrations, and changed static assets require a service-worker cache bump plus release-gate updates. Production verification may use reads and no-op validation only; real cargo, message, payment, finance, or destructive writes require synthetic staging identities and explicit cleanup. The staff role constraint now preserves legacy `dubai` while also allowing PRD roles `warehouse_china`, `warehouse_uae`, `warehouse_erbil`, `delivery`, and branch `uae`; this was applied as the forward-only migration `expand_staff_ultra_role_matrix_v2`. Google Vision OCR, WhatsApp delivery, Mapbox/Google Maps tiles, push notifications, voice notes, and offline synchronization remain provider- or browser-capability-dependent until their credentials and delivery contracts are supplied.

## Prioritized implementation order

1. Protected Staff CRUD and role/branch editing.
2. Warehouse receipt evidence with multi-photo metadata and audit trail.
3. Shipment lifecycle timeline and map-ready read model.
4. Customer-owned receipt/photo visibility and notifications.
5. Finance metrics with branch filters and export.
6. Chat/notification realtime UX and two-session validation.
7. Reporting, cleanup, and responsive regression coverage.

