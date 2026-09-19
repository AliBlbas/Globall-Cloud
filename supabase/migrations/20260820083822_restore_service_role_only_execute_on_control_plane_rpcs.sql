-- The 2026-08-17 "harden_privileged_rpc_execute_surface" migration correctly restricted
-- record_payment_transaction and record_shipment_transition to service_role only (callable
-- only through the logistics-control-plane / payment edge functions, not directly by clients).
-- Two later migrations (qicard_fib_payment_sessions, logistics_notifications_contract_hardening)
-- redefined these same functions and, as a side effect of their own grant statements, re-opened
-- direct "authenticated" execute access. No frontend code calls these RPCs directly (verified),
-- so this restores the original, intended restriction with no functional impact.
revoke all on function public.record_payment_transaction(uuid,uuid,numeric,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.record_payment_transaction(uuid,uuid,numeric,text,text,text,text,text,text,jsonb) to service_role;

revoke all on function public.record_shipment_transition(uuid,text,text,integer,text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.record_shipment_transition(uuid,text,text,integer,text,text,jsonb,text) to service_role;
