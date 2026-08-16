create or replace function public.function_name()
returns void
language plpgsql
set search_path = ''
as $function$
begin
  -- Write your function logic here
end;
$function$;

create or replace function public.test_fn()
returns void
language plpgsql
set search_path = ''
as $function$
begin
  -- function logic here
end;
$function$;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  claims jsonb;
  is_admin boolean;
begin
  select public.profiles.is_admin into is_admin
  from public.profiles
  where user_id = (event->>'user_id')::pg_catalog.uuid;

  if is_admin then
    claims := event->'claims';

    if pg_catalog.jsonb_typeof(claims->'user_metadata') is null then
      claims := pg_catalog.jsonb_set(claims, '{user_metadata}', '{}'::jsonb);
    end if;

    claims := pg_catalog.jsonb_set(claims, '{user_metadata, admin}', 'true'::jsonb);
    event := pg_catalog.jsonb_set(event, '{claims}', claims);
  end if;

  return event;
end;
$function$;

create or replace function public.hook_mfa_verification_attempt(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  last_failed_at timestamptz;
begin
  if event->'valid' is true then
    return pg_catalog.jsonb_build_object('decision', 'continue');
  end if;

  select last_failed_at into last_failed_at
  from public.mfa_failed_verification_attempts
  where
    user_id = (event->'user_id')::pg_catalog.uuid
    and factor_id = (event->>'factor_id');

  if last_failed_at is not null and pg_catalog.now() - last_failed_at < interval '2 seconds' then
    return pg_catalog.jsonb_build_object(
      'error', pg_catalog.jsonb_build_object(
        'http_code', 429,
        'message', 'Please wait a moment before trying again.'
      )
    );
  end if;

  insert into public.mfa_failed_verification_attempts (user_id, factor_id, last_refreshed_at)
  values (
    (event->'user_id')::pg_catalog.uuid,
    (event->>'factor_id'),
    pg_catalog.now()
  )
  on conflict (user_id, factor_id)
  do update set last_refreshed_at = pg_catalog.now();

  return pg_catalog.jsonb_build_object('decision', 'continue');
end;
$function$;;
