-- Match production exactly: the public shopping-status wrapper is INVOKER
-- and is callable only by the server role. The private implementation is
-- separately locked to the server role by the preceding hardening migration.

create or replace function public.admin_update_shopping_status(p_order_id uuid,p_new_status text)
returns jsonb
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.admin_update_shopping_status_impl(p_order_id,p_new_status);
$$;

revoke all on function public.admin_update_shopping_status(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_update_shopping_status(uuid,text) to service_role;
