-- Correction: my earlier "add_missing_fk_indexes_active_tables" migration
-- created these without checking for an existing index under a different
-- name first. Both already existed. Dropping my duplicates.
drop index if exists public.idx_staff_activity_log_staff_id;
drop index if exists public.idx_warehouse_receipts_created_by;;
