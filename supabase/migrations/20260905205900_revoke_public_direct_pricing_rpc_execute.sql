-- Keep pricing/compliance RPCs server-only. Public clients use the public-pricing Edge Function.
REVOKE EXECUTE ON FUNCTION public.calculate_logistics_price(text,text,text,text,numeric,numeric,text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_logistics_cargo(text,boolean,boolean,boolean,boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_logistics_price(text,text,text,text,numeric,numeric,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_logistics_cargo(text,boolean,boolean,boolean,boolean) TO service_role;
