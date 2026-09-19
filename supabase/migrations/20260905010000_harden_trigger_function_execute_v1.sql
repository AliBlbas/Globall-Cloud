-- Keep trigger-only business-rule functions out of the exposed Postgres RPC surface.
-- These functions are invoked by database triggers and are not client APIs.
revoke all on function public.enforce_logistics_quote_rules() from public, anon, authenticated;
revoke all on function public.enforce_logistics_receipt_rules() from public, anon, authenticated;
revoke all on function public.enforce_single_active_exchange_rate() from public, anon, authenticated;
revoke all on function public.normalize_customer_identity() from public, anon, authenticated;
revoke all on function public.sync_shopping_order_customer_identity() from public, anon, authenticated;

grant execute on function public.enforce_logistics_quote_rules() to service_role;
grant execute on function public.enforce_logistics_receipt_rules() to service_role;
grant execute on function public.enforce_single_active_exchange_rate() to service_role;
grant execute on function public.normalize_customer_identity() to service_role;
grant execute on function public.sync_shopping_order_customer_identity() to service_role;
