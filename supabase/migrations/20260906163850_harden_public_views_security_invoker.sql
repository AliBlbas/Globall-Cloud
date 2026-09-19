alter view public.customer_management_profiles set (security_invoker = true);
alter view public.v_financial_summary set (security_invoker = true);
revoke all on table public.customer_management_profiles from anon, authenticated;
revoke all on table public.v_financial_summary from anon, authenticated;
