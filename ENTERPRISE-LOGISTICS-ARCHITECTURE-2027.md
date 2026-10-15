# Globall Cloud Enterprise Logistics Architecture — 2027

## Purpose

Evolve Globall Cloud from its current logistics platform into a coherent enterprise logistics operating system for China, the United States, Dubai/UAE, and Erbil/Iraq. This document separates capabilities already present in the repository/database from proposed work; a menu item or schema object alone is not proof that an end-to-end workflow is production-ready.

## Deployment and preservation rules

- Production release path documented by the project is GitHub `main` → Cloudflare Pages → the production Supabase project.
- Do not merge the historical `Product` branch directly into production without reviewing its divergence from `main`.
- This architecture increment is based on `main` in `feature/enterprise-logistics-2027`. It has not been deployed to Cloudflare and its new migration has not been applied to either Supabase project.
- Keep all current customer, shipment, shopping-platform/order, finance, and staff data. Use forward-only migrations; avoid dropping/renaming established tables as part of a UI redesign.
- Browser code must never contain Supabase service-role keys, payment credentials, webhook secrets, or notification provider secrets.

## Current authoritative data model

Use current tables and RPCs as canonical sources instead of creating parallel generic tables merely to match a conceptual diagram.

| Business concept | Current canonical records / boundary |
|---|---|
| Identity | Supabase `auth.users`, linked to `public.customers`, `public.customer_directory`, and `public.staff` as appropriate |
| Customer accounts / CRM | `customers`, `customer_directory`, customer notification preferences and customer chat threads/messages |
| Staff and driver identity | `staff`; driver/delivery personnel use the existing `driver` / `delivery` roles |
| Shipments | `shipments` is the shipment state source of truth |
| Status timeline | `shipment_status_history`, `shipment_tracking_events`, and `shipment_events` |
| Package traceability | `shipment_packages`, `warehouse_receipts`, `warehouse_movements` |
| Warehouse locations / directories | `gc_warehouse_addresses`, `warehouse_locations`, `warehouse_private_details`, and receipt/movement ledgers |
| Consolidation / cargo manifests | `consolidation_batches`, `consolidation_items`, `shipment_manifests` |
| Route planning / customs | `shipment_route_legs`, `shipment_customs_cases`, `logistics_exceptions` |
| Delivery / proof | `delivery_assignments`, `delivery_proofs`; a GPS update alone must not complete a shipment |
| Invoices / financial ledger | `shipment_invoices`, `shipment_financial_ledger`, `finance_transactions`, `ledger_cash_entries`, `company_costs`, `company_cost_entries` |
| Payment gateway | `payment_sessions`, `payment_transactions`, `payment_webhook_events`, reconciliation records; browser redirects do not settle invoices |
| Documents | `shipment_documents` metadata plus private document storage and the authenticated `document-access` boundary |
| Notifications | `notification_outbox`, `customer_notifications`, `staff_notifications`, `notification_delivery_events`, and provider-specific outboxes |
| Audit / staff activity | `audit_logs`, `staff_activity_log`, and operational event ledgers |
| Reports | Existing authenticated control-plane reporting/RPC boundary; avoid storing duplicate report snapshots unless a defined business need requires them |

The conceptual names `users`, `warehouses`, `drivers`, `invoices`, `payments`, `notifications`, `documents`, `activity_logs`, and `reports` should not automatically become duplicate physical tables. Map the UI to the above sources or create a migration only when a distinct data model is necessary.

## Architecture layers

1. **Public website:** homepage, service modes, country/route information, tracking gateway, pricing/request form, warehouse information, contact, careers, and company pages.
2. **Customer portal / mobile-first PWA:** private shipment history, timeline, balances/invoices, payment status, document downloads, shipment request/quote, chat/tickets, and notification preferences.
3. **Staff workspace / control tower:** KPI summaries sourced from real database queries, shipment queues, delayed/exception alerts, customer lookup, finance summaries, and activity history.
4. **Operations control plane:** authorized state transitions, customs cases, route legs, package traceability, exceptions, and notification outbox.
5. **Warehouse workflows:** receiving scan, physical measurements/photos, shelf/bin location where used, manifest/consolidation, transfer, dispatch, and chain-of-custody history.
6. **Driver/delivery workflows:** assigned jobs, check-in/out, vehicle assignment, location events, customer hand-off, and controlled proof of delivery.
7. **Finance:** invoice balances, posted payments, outstanding balances, shipment/service revenue, cost allocation, payroll, cash flow, and accounting exports.
8. **Fleet and HR:** vehicle registry, maintenance/fuel, attendance, leave, payroll period and payroll entries. The additive schema foundation is introduced in `20261015190000_enterprise_fleet_hr_foundation.sql`.
9. **Analytics and AI:** aggregate trusted operational data first; prediction or OCR features remain labelled experimental until measurable accuracy, access controls, data-retention and human-review paths exist.
10. **Security / Super Admin:** role and branch scope, MFA, least privilege, server-side secret handling, session controls, auditability, and a documented recovery/release procedure.

## Shipment lifecycle

Use machine-readable statuses with monotonically advancing steps and a durable event history:

`created → received_origin_warehouse → warehouse_scanned → consolidated/manifested → export_customs → international_transit → iraq_customs → erbil_warehouse → out_for_delivery → delivered`

Real routes may skip a stage only through an explicit authorized transition rule (for example, a shipment not requiring consolidation), not by clients editing the current status directly. Exceptions such as customs hold, damaged, returned, or delayed should be represented as explicit exception/status events without erasing the prior timeline. Each transition should preserve actor, timestamp, idempotency key, source, and a minimal metadata payload.

## New additive Fleet / HR schema scope

The proposed migration introduces:

- `fleet_vehicles`: vehicle code, plate, type, branch, capacity, odometer, fuel type, status.
- `fleet_vehicle_events`: append-only trip/location/inspection/status event ledger; no public access.
- `fleet_maintenance_records` and `fleet_fuel_logs`: separately reportable maintenance and fuel costs.
- `delivery_assignments.vehicle_id`: nullable foreign key to attach a vehicle without changing historical assignments.
- `hr_attendance_records`: per-staff shift timestamps; the RPC `gc_record_attendance('check_in'|'check_out')` uses database time and Asia/Baghdad work dates.
- `hr_leave_requests`: employee-owned pending requests and management-recorded decisions.
- `hr_payroll_periods` and `hr_payroll_entries`: protected period/entry records with database-calculated net pay.

The migration applies Row Level Security and least-privilege role checks. Attendance has no direct self-service table-write policy; the server-time RPC is the intended employee clock-in/out boundary. Payroll is restricted to administrators for writes; finance/accounting can read it. The frontend, API/UI workflows, test coverage, and release path must be completed before this schema is used operationally.

## Implementation and acceptance gates

### Gate A — Existing core remains healthy
- Confirm customer/staff auth is linked to the correct record and not just matching email.
- Exercise shipment creation, every allowed transition, warehouse intake/transfer, delivery assignment, proof of delivery, invoice balance, payment reconciliation, private document access, and notification delivery.
- Verify branch/deployment parity and that production points to the expected commit.

### Gate B — Fleet / HR foundation
- Apply the migration to an isolated staging database only after review.
- Test RLS as anonymous, customer, driver, operations, finance, and admin roles.
- Verify concurrent attendance check-ins, check-out rules, branch scoping, currency checks, immutable vehicle events, and no direct payroll write for finance-only users.
- Add audited Edge Functions/UI for fleet maintenance/fuel and HR workflows before exposing these modules to staff.

### Gate C — Operations UX
- Connect Control Tower counts/charts to live, permission-scoped queries; never use fabricated demo KPIs in production.
- Ensure forms provide validation, loading/error/empty states, idempotency and retry feedback.
- Mobile test: Safari/iOS safe areas, fixed bottom navigation, touch targets, long tables, scanning input, keyboard overflow, and offline/reconnect behavior.

### Gate D — Finance / notifications / integrations
- Run sandbox payment and reconciliation tests for each enabled provider.
- Run notification outbox delivery/retry/idempotency tests; absent credentials must report configuration failure, never fake success.
- Protect webhooks with provider signature/HMAC validation, idempotency, and server-side status re-query.

### Gate E — Analytics / AI
- Approve the data source and permission model for each metric.
- Record baseline forecast/OCR performance and expose confidence/“needs human review” states.
- Never allow an AI prediction to autonomously settle a payment, clear customs, or mark a delivery complete.

## Current release status

This branch contains a proposed additive SQL schema and this architecture document only. It does **not** claim that the Fleet/HR screens or workflows are complete, that the migration has been applied, or that the production website has changed. Production readiness requires CI, staging database/RLS tests, Edge Function and UI implementation, and explicit deployment verification.
