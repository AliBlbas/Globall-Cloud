-- The staging schema is server-only. Keep RLS enabled as a defence-in-depth
-- boundary; service_role bypasses RLS for the controlled import worker.

begin;

alter table private.excel_import_batches enable row level security;
alter table private.excel_import_rows enable row level security;

commit;
