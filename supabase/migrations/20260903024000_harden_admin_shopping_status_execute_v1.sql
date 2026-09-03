-- The shopping status mutator performs privileged state transitions.
-- No frontend caller uses the RPC directly; keep it unavailable to authenticated clients.

revoke all on function public.admin_update_shopping_status(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_update_shopping_status(uuid,text) to service_role;
