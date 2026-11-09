# Supabase query/index audit

## Scope

This audit compares the Supabase Edge Function query patterns in `supabase/functions/` with the live production indexes in the `Globall Cloud` Supabase project (`ahslifnthiwfkmaswjno`). The focus is on customer portal, warehouse receiving, staff directory, driver, and notification paths.

## Highest-impact paths

| Query path | Query shape | Index added |
|---|---|---|
| Warehouse candidate resolution | `shipments.directory_customer_id = ? ORDER BY created_at DESC LIMIT 30` | `shipments_directory_customer_created_idx` |
| Warehouse candidate resolution fallback | `shipments.customer_gc_code = ? ORDER BY created_at DESC LIMIT 30` | `shipments_customer_gc_created_idx` |
| Staff directory | `shipments.assigned_staff_id = ? ORDER BY created_at DESC LIMIT 100` | `shipments_assigned_staff_created_idx` |
| Driver active assignments | `delivery_assignments.assigned_staff_id = ? AND status IN (...) ORDER BY created_at DESC` | `delivery_assignments_driver_created_idx` |
| Customer notification feed | `customer_notifications.customer_user_id = ? ORDER BY created_at DESC LIMIT 30` | `customer_notifications_customer_created_idx` |
| Customer document feed | `shipment_documents.customer_user_id = ? ORDER BY created_at DESC LIMIT 30` | `shipment_documents_customer_created_idx` |
| Customer invoice feed | `shipment_invoices.customer_user_id = ? ORDER BY created_at DESC LIMIT 50` | `shipment_invoices_customer_created_idx` |
| Customer finance history | `finance_transactions.gc_code = ? AND type IN (...) ORDER BY created_at DESC` | `finance_transactions_gc_created_idx` |

## Existing indexes intentionally reused

The live database already has suitable indexes for public tracking events (`shipment_id, occurred_at DESC` with `is_public = true`), warehouse receipt history (`directory_customer_id, received_at DESC`), receipt cartons (`receipt_id, carton_index`), notification outbox claiming (`status, next_attempt_at, created_at`), shipment invoices/payments by shipment, and staff notification inboxes. No duplicate replacements were added for those paths.

## Safety choices

The migration uses narrow B-tree indexes and partial predicates for nullable foreign/lookup keys or active delivery statuses. It does not add JSONB/GiST indexes without a demonstrated containment/spatial query, and it does not add covering indexes that would increase write and vacuum cost. `IF NOT EXISTS` makes the migration idempotent.

## Validation plan

1. Apply the migration to the production project through Supabase migration tooling.
2. Confirm all eight index names in `pg_indexes`.
3. Run the repository contract, public-release, and production validators.
4. After traffic accumulates, compare query latency and index usage through Supabase logs and `pg_stat_user_indexes`; do not keep indexes that remain unused after representative traffic.

## External references

- [Supabase Database Indexes](https://supabase.com/docs/guides/database/postgres/indexes)
- [PostgreSQL multicolumn indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html)
- [PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
