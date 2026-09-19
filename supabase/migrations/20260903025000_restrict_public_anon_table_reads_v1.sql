-- Defense in depth: these business tables are staff/owner-only and do not need
-- direct anonymous SELECT privileges. Public configuration is intentionally kept
-- separately readable through the hardened public-config path.

revoke select on table public."Globall Cloud" from anon;
revoke select on table public.consolidation_batches from anon;
revoke select on table public.consolidation_items from anon;
revoke select on table public.customer_directory from anon;
revoke select on table public.shipment_customs_cases from anon;
revoke select on table public.shipment_packages from anon;
revoke select on table public.shipment_route_legs from anon;
revoke select on table public.staff_tasks from anon;
