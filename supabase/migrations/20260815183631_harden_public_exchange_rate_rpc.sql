create or replace function public.get_public_usd_iqd_rate()
returns numeric
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select s.value
  from public.app_settings as s
  where s.key = 'usd_iqd_rate'
  limit 1;
$$;

revoke all on function public.get_public_usd_iqd_rate() from public;
grant execute on function public.get_public_usd_iqd_rate() to anon, authenticated;;
