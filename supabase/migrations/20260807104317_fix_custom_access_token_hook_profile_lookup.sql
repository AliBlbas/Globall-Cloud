create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  claims jsonb;
  is_admin boolean;
begin
  select p.is_admin
  into is_admin
  from public.profiles p
  where p.user_id = (event->>'user_id')::pg_catalog.uuid;

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
$function$;;
