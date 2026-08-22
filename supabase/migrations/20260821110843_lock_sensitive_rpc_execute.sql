-- Keep privileged logistics and finance RPCs behind server-side Edge Functions.
-- Customer acceptance remains available to authenticated customers and is intentionally excluded.
revoke execute on function public.approve_quote_request(uuid, uuid, numeric, text, timestamptz, text) from authenticated;
revoke execute on function public.create_payment_session(uuid, uuid, text, numeric, text, text, jsonb) from authenticated;
revoke execute on function public.get_logistics_report(uuid, date, date) from authenticated;
revoke execute on function public.record_warehouse_movement(uuid, text, uuid, bigint, text, text, text, text, text, jsonb, text) from authenticated;
revoke execute on function public.register_shipment_document(uuid, text, text, text, text, text, text, bigint, text, boolean) from authenticated;
revoke execute on function public.upsert_shipment_route_leg(uuid, text, integer, text, text, text, text, text, text, timestamptz, timestamptz, timestamptz, timestamptz, text, jsonb) from authenticated;

grant execute on function public.approve_quote_request(uuid, uuid, numeric, text, timestamptz, text) to service_role;
grant execute on function public.create_payment_session(uuid, uuid, text, numeric, text, text, jsonb) to service_role;
grant execute on function public.get_logistics_report(uuid, date, date) to service_role;
grant execute on function public.record_warehouse_movement(uuid, text, uuid, bigint, text, text, text, text, text, jsonb, text) to service_role;
grant execute on function public.register_shipment_document(uuid, text, text, text, text, text, text, bigint, text, boolean) to service_role;
grant execute on function public.upsert_shipment_route_leg(uuid, text, integer, text, text, text, text, text, text, timestamptz, timestamptz, timestamptz, timestamptz, text, jsonb) to service_role;
