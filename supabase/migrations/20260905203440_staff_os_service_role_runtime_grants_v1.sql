-- Staff OS production API requires trusted server-side reads/writes only.
-- Keep browser roles unchanged; grant only the minimum service_role privileges
-- needed by the authenticated Edge Functions used by Staff OS.

grant select, insert, update on table public.shipments to service_role;
grant select, insert, update on table public.shipment_tracking_events to service_role;
grant select, insert, update on table public.staff to service_role;
grant select, insert, update on table public.staff_profiles to service_role;
grant select on table public.customers to service_role;
grant select on table public.pricing_rules to service_role;
grant select on table public.warehouse_locations to service_role;
grant select on table public.admin_action_requests to service_role;
grant select on table public.staff_permission_grants to service_role;
grant select on table public.staff_permissions to service_role;
grant select on table public.v_financial_summary to service_role;
