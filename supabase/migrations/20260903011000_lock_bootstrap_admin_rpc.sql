-- First-admin bootstrap is an operator/setup action, not a customer/staff API.
revoke all on function public.bootstrap_first_admin() from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin() to service_role;
