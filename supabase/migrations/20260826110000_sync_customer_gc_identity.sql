-- Canonical GC customer identity for label, receipt, and customer-portal workflows.
-- Existing customer identity fields are protected by production triggers, so this
-- migration does not rewrite existing rows. It synchronizes identity fields for
-- future inserts and adds a uniqueness constraint for canonical codes.

create sequence if not exists public.customer_gc_number_seq;

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

create or replace function public.assign_customer_gc_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_code text;
begin
  if nullif(trim(new.code), '') is null and nullif(trim(new.gc_code), '') is null then
    requested_code := 'GC-' || nextval('public.customer_gc_number_seq')::text;
  elsif nullif(trim(new.code), '') is not null then
    requested_code := upper(trim(new.code));
  else
    requested_code := upper(trim(new.gc_code));
  end if;

  if requested_code !~ '^GC-[A-Z0-9-]{2,30}$' then
    raise exception 'Customer code must match GC-* format';
  end if;

  if new.code is not null and new.gc_code is not null and upper(trim(new.code)) <> upper(trim(new.gc_code)) then
    raise exception 'Customer code and GC code must match';
  end if;

  new.code := requested_code;
  new.gc_code := requested_code;
  return new;
end;
$$;

drop trigger if exists customer_directory_gc_identity_trg on public.customer_directory;
create trigger customer_directory_gc_identity_trg
before insert on public.customer_directory
for each row execute function public.assign_customer_gc_identity();

create unique index if not exists customer_directory_code_ci_uidx
  on public.customer_directory (lower(trim(code)))
  where code ~* '^GC-[A-Z0-9-]{2,30}$';

comment on function public.assign_customer_gc_identity() is
  'Allocates and synchronizes the GC-* customer identity for new customer records without rewriting protected existing identities.';
