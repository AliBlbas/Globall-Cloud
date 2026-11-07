-- Allow authenticated customers and staff to call the already-authenticated,
-- SECURITY DEFINER commerce RPCs from the browser client.
-- Anonymous callers remain blocked; each function performs its own auth/role checks.
revoke all on function public.shop_place_order(jsonb, text, text, text, text) from public;
revoke all on function public.shop_update_order_status(uuid, text) from public;
grant execute on function public.shop_place_order(jsonb, text, text, text, text) to authenticated;
grant execute on function public.shop_update_order_status(uuid, text) to authenticated;
