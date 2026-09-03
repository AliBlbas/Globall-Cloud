-- Final hardening: shopping status mutations are server-only.
-- The public wrapper is SECURITY INVOKER; only service_role should reach it,
-- and the private SECURITY DEFINER implementation is not directly callable
-- by authenticated clients either.

revoke all on function public.admin_update_shopping_status(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_update_shopping_status(uuid,text) to service_role;

revoke all on function private.admin_update_shopping_status_impl(uuid,text) from public, anon, authenticated;
grant execute on function private.admin_update_shopping_status_impl(uuid,text) to service_role;
