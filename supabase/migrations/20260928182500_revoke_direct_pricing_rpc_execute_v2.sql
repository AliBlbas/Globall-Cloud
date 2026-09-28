-- Public pricing must go through the public-pricing Edge Function.
-- Keep the SECURITY DEFINER pricing RPC callable only by trusted server-side code.
revoke execute on function public.calculate_logistics_price(text,text,text,text,numeric,numeric,text) from anon, authenticated;
grant execute on function public.calculate_logistics_price(text,text,text,text,numeric,numeric,text) to service_role;
revoke execute on function public.validate_logistics_cargo(text,boolean,boolean,boolean,boolean) from anon, authenticated;
grant execute on function public.validate_logistics_cargo(text,boolean,boolean,boolean,boolean) to service_role;
