-- Fix public-track 500s caused by the public wrapper invoking private schema
-- as SECURITY INVOKER. The wrapper exposes only a boolean and never exposes
-- the private rate-limit table.
create or replace function public.consume_public_message_rate_limit(
  p_key_hash text,
  p_window_seconds integer default 600,
  p_max_requests integer default 5
)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select private.consume_public_message_rate_limit(
    p_key_hash,
    p_window_seconds,
    p_max_requests
  );
$function$;

revoke all on function public.consume_public_message_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_public_message_rate_limit(text, integer, integer)
  to service_role;

comment on function public.consume_public_message_rate_limit(text, integer, integer)
is 'Trusted server-side rate-limit wrapper for public-track and public-message; returns only an allow/deny boolean.';
