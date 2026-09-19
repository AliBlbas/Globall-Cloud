-- One-time reconciliation of the existing customer identity contract.
-- Existing physical `code` values are preserved exactly. Numeric legacy codes are
-- mirrored into canonical gc_code; only rows missing both fields receive new codes.
-- The trigger bypass is transaction-local and the original protection function is
-- restored before the migration completes.

set local "gc_identity_migration.allow_backfill" = 'on';

create or replace function public.prevent_customer_directory_code_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.code is not null and old.code is distinct from new.code then
    raise exception 'customer_directory.code cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.protect_customer_identity_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user <> 'service_role'
     and current_setting('gc_identity_migration.allow_backfill', true) <> 'on'
     and (
       new.code is distinct from old.code
       or new.gc_code is distinct from old.gc_code
       or new.email is distinct from old.email
     ) then
    raise exception 'Customer identity fields are managed by Super Admin only';
  end if;
  return new;
end;
$$;

do $$
declare
  max_number bigint;
begin
  select coalesce(max((regexp_replace(upper(trim(code)), '^GC-', ''))::bigint), 0)
    into max_number
  from public.customer_directory
  where code ~* '^GC-[0-9]+$';

  update public.customer_directory
     set gc_code = upper(trim(code))
   where code ~* '^GC-[0-9]+$'
     and (gc_code is null or gc_code !~* '^GC-[0-9]+$' or lower(trim(gc_code)) <> lower(trim(code)));

  with missing as (
    select id,
           max_number + row_number() over (order by created_at, id) as next_number
      from public.customer_directory
     where nullif(trim(code), '') is null
       and nullif(trim(gc_code), '') is null
  )
  update public.customer_directory c
     set code = 'GC-' || missing.next_number::text,
         gc_code = 'GC-' || missing.next_number::text
    from missing
   where c.id = missing.id;
end $$;

do $$
declare
  max_number bigint;
begin
  select coalesce(max((regexp_replace(upper(trim(code)), '^GC-', ''))::bigint), 0)
    into max_number
  from public.customer_directory
  where code ~* '^GC-[0-9]+$';
  perform setval('public.customer_gc_number_seq', greatest(max_number, 0), true);
end $$;

-- Restore the production protection semantics after the one-time reconciliation.
create or replace function public.protect_customer_identity_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user <> 'service_role' and (
    new.code is distinct from old.code
    or new.gc_code is distinct from old.gc_code
    or new.email is distinct from old.email
  ) then
    raise exception 'Customer identity fields are managed by Super Admin only';
  end if;
  return new;
end;
$$;
