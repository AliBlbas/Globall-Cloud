create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.staff s
    where s.id = auth.uid()
      and s.is_active = true
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.staff s
    where s.id = auth.uid()
      and s.is_active = true
      and s.role in ('admin','super_admin')
  );
$$;

revoke all on function private.is_staff() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select private.is_staff();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select private.is_admin();
$$;

revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

create or replace function private.track_shipment(p_id text)
returns setof public.shipments
language sql
stable
security definer
set search_path = public, pg_temp
set statement_timeout = '2000ms'
as $$
  select
    s.id,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or private.is_staff()) then s.customer_name else null end as customer_name,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or private.is_staff()) then s.customer_phone else null end as customer_phone,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or private.is_staff()) then s.customer_email else null end as customer_email,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or private.is_staff()) then s.notes else null end as notes,
    s.origin_key,
    s.dest_key,
    s.type,
    s.weight_kg,
    s.volume_cbm,
    s.items_count,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or private.is_staff()) then s.total_amount else null end as total_amount,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or private.is_staff()) then s.paid_amount else null end as paid_amount,
    s.current_step_index,
    s.step_dates,
    s.eta,
    s.created_at,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or private.is_staff()) then s.customer_user_id else null end as customer_user_id,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or private.is_staff()) then s.directory_customer_id else null end as directory_customer_id,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or private.is_staff()) then s.step_photos else null end as step_photos,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or private.is_staff()) then s.batch_code else null end as batch_code,
    case when auth.uid() is not null and private.is_staff() then s.branch else null end as branch
  from public.shipments s
  where length(trim(coalesce(p_id, ''))) between 1 and 128
    and s.id = trim(p_id);
$$;

revoke all on function private.track_shipment(text) from public, anon, authenticated;
grant execute on function private.track_shipment(text) to anon;

create or replace function public.track_shipment(p_id text)
returns setof public.shipments
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select * from private.track_shipment(p_id);
$$;

revoke all on function public.track_shipment(text) from public, authenticated;
grant execute on function public.track_shipment(text) to anon;

-- app_settings is now accessed by the unauthenticated public-config Edge Function
-- with the service role; direct browser/database access is no longer needed.
revoke select on table public.app_settings from anon, authenticated;
;
