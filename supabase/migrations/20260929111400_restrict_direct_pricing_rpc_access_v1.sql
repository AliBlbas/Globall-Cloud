begin;

-- The public quote flow calls this function through the rate-limited
-- public-pricing Edge Function using service_role. Do not expose this
-- SECURITY DEFINER calculator directly to browser/anonymous database clients.
revoke all on function public.calculate_logistics_price(
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  text
) from public, anon, authenticated;

grant execute on function public.calculate_logistics_price(
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  text
) to service_role;

commit;
