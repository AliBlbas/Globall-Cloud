-- Production hardening: reduce direct execution of privileged SECURITY DEFINER functions.
-- Policy helper functions (is_admin/is_super_admin) remain executable because
-- existing RLS policies rely on them; customer-scoped functions remain callable
-- by authenticated users because their bodies enforce auth.uid()/ownership.

revoke all on function public.guard_payment_session_update() from public, anon, authenticated;
grant execute on function public.guard_payment_session_update() to service_role;

revoke all on function public.queue_warehouse_whatsapp() from public, anon, authenticated;
grant execute on function public.queue_warehouse_whatsapp() to service_role;

revoke all on function public.create_customer_with_gc(text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_customer_with_gc(text,text,text,text,text,text,text,text) to service_role;

revoke all on function public.admin_update_shopping_status(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_update_shopping_status(uuid,text) to service_role;

revoke all on function public.super_admin_delete_customer(uuid) from public, anon, authenticated;
grant execute on function public.super_admin_delete_customer(uuid) to service_role;

revoke all on function public.super_admin_delete_customer(uuid,text) from public, anon, authenticated;
grant execute on function public.super_admin_delete_customer(uuid,text) to service_role;

revoke all on function public.super_admin_correct_customer(uuid,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.super_admin_correct_customer(uuid,text,text,text,text,text,text,text,text,text) to service_role;

revoke all on function public.super_admin_update_customer(uuid,text,text,text,text,text,text,text,boolean,text) from public, anon, authenticated;
grant execute on function public.super_admin_update_customer(uuid,text,text,text,text,text,text,text,boolean,text) to service_role;

revoke all on function public.super_admin_set_staff_role(uuid,text,text) from public, anon, authenticated;
grant execute on function public.super_admin_set_staff_role(uuid,text,text) to service_role;

revoke all on function public.super_admin_set_staff_status(uuid,boolean) from public, anon, authenticated;
grant execute on function public.super_admin_set_staff_status(uuid,boolean) to service_role;

alter function public.calculate_chargeable_weight(numeric,numeric,numeric,numeric) set search_path = public, pg_temp;
