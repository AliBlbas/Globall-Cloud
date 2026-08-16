grant execute on function public.track_shipment(text) to anon, authenticated;

grant select on table public.app_settings to anon, authenticated;

comment on function public.track_shipment(text) is 'Public-safe shipment tracking RPC; authenticated customers and staff may execute it, with private fields redacted by the security-definer implementation.';
comment on table public.app_settings is 'Application configuration. Public SELECT is restricted by RLS to explicitly public keys such as usd_iqd_rate.';;
