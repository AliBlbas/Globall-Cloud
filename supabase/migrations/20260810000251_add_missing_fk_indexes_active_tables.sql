-- Missing indexes on foreign keys, for the tables that actually hold data
-- today (staff_activity_log, warehouse_receipts). Purely additive/safe.
-- The lg_* tables are currently empty (0 rows) and not yet wired into the
-- app, so indexing them is skipped until that schema is actually in use.
create index if not exists idx_staff_activity_log_staff_id on public.staff_activity_log(staff_id);
create index if not exists idx_warehouse_receipts_created_by on public.warehouse_receipts(created_by);;
