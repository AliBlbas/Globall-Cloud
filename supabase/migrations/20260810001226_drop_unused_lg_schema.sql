-- CASCADE is safe here: the only dependents are policies on lg_shipments
-- (itself being dropped) that reference lg_routes. Nothing outside this
-- unused table group depends on any of these six tables.
drop table if exists public.lg_tracking_events cascade;
drop table if exists public.lg_routes cascade;
drop table if exists public.lg_shipments cascade;
drop table if exists public.lg_orders cascade;
drop table if exists public.lg_inventory_items cascade;
drop table if exists public.lg_warehouse_stock cascade;;
