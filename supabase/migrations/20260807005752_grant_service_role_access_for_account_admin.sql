grant select, insert, update, delete on table public.customer_directory to service_role;
grant select, insert, update, delete on table public.shipments to service_role;
grant select, insert, update, delete on table public.staff to service_role;
grant select, insert, update, delete on table public.messages to service_role;
grant select, insert, update, delete on table public.staff_activity_log to service_role;
grant select, insert, update, delete on table public.warehouse_receipts to service_role;
grant select on table public.customer_directory_stats to service_role;
grant select on table public.customer_directory_accounts to service_role;
;
