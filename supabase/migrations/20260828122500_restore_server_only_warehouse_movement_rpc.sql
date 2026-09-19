-- The warehouse receiving Edge Function uses service_role for this privileged RPC.
-- Do not expose direct movement writes to authenticated clients.
revoke execute on function public.record_warehouse_movement(uuid, text, uuid, bigint, text, text, text, text, text, jsonb, text)
  from public, anon, authenticated;

grant execute on function public.record_warehouse_movement(uuid, text, uuid, bigint, text, text, text, text, text, jsonb, text)
  to service_role;
