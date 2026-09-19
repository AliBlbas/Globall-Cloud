drop function if exists public.track_shipment(text);
create or replace function public.track_shipment(p_id text)
returns table (
  id text,
  origin_key text,
  dest_key text,
  type text,
  weight_kg numeric,
  volume_cbm numeric,
  items_count integer,
  current_step_index integer,
  step_dates jsonb,
  eta timestamptz,
  created_at timestamptz,
  step_photos jsonb,
  batch_code text,
  branch text
)
language sql
stable
set search_path = public
as $$
  select
    s.id,
    s.origin_key,
    s.dest_key,
    s.type,
    s.weight_kg,
    s.volume_cbm,
    s.items_count,
    s.current_step_index,
    s.step_dates,
    s.eta,
    s.created_at,
    s.step_photos,
    s.batch_code,
    s.branch
  from public.shipments s
  where s.id = p_id;
$$;

grant execute on function public.track_shipment(text) to anon, authenticated;

create or replace function public.find_directory_customer_by_phone(p_phone text)
returns uuid
language sql
stable
set search_path = public
as $$
  select c.id
  from public.customer_directory c
  where p_phone is not null
    and p_phone <> ''
    and (c.phone = p_phone or c.phone2 = p_phone)
    and (
      public.is_staff()
      or c.auth_user_id = auth.uid()
    )
  limit 1;
$$;

revoke execute on function public.find_directory_customer_by_phone(text) from anon;
grant execute on function public.find_directory_customer_by_phone(text) to authenticated;
;
