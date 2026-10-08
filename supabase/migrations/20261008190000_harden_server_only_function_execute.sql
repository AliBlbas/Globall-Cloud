-- Globall Cloud: harden server-only SECURITY DEFINER execution surface
-- Public trigger helpers and retired shopping RPCs are not part of the browser API.
-- Keep EXECUTE restricted to the server-side service_role boundary.
revoke execute on function public.emit_shipment_realtime_notifications() from public, anon, authenticated;
revoke execute on function public.emit_warehouse_realtime_notification() from public, anon, authenticated;
revoke execute on function public.shop_place_order(jsonb, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.shop_update_order_status(uuid, text) from public, anon, authenticated;

grant execute on function public.emit_shipment_realtime_notifications() to service_role;
grant execute on function public.emit_warehouse_realtime_notification() to service_role;
grant execute on function public.shop_place_order(jsonb, text, text, text, text) to service_role;
grant execute on function public.shop_update_order_status(uuid, text) to service_role;