-- Public RPCs for the static admin dashboard.
-- These functions intentionally keep the browser integration simple.
-- Security should later move to real Supabase Auth + staff checks.

create or replace function public.admin_list_customers_public()
returns table (
  id uuid,
  name text,
  phone text,
  email text,
  city text,
  delivery_location text,
  note text,
  created_at timestamptz,
  shipment_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    cd.id,
    cd.name,
    cd.phone,
    null::text as email,
    cd.city,
    cd.delivery_location,
    cd.note,
    cd.created_at,
    coalesce((select count(*) from public.shipments s where s.directory_customer_id = cd.id), 0)::bigint as shipment_count
  from public.customer_directory cd
  order by cd.created_at desc;
$$;

create or replace function public.admin_list_shipments_public()
returns table (
  id text,
  customer_name text,
  customer_phone text,
  customer_email text,
  notes text,
  origin_key text,
  dest_key text,
  type text,
  weight_kg numeric,
  volume_cbm numeric,
  items_count integer,
  total_amount numeric,
  paid_amount numeric,
  current_step_index integer,
  step_dates jsonb,
  eta timestamptz,
  created_at timestamptz,
  customer_user_id uuid,
  directory_customer_id uuid,
  step_photos jsonb,
  batch_code text,
  branch text
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.customer_name,
    s.customer_phone,
    s.customer_email,
    s.notes,
    s.origin_key,
    s.dest_key,
    s.type,
    s.weight_kg,
    s.volume_cbm,
    s.items_count,
    s.total_amount,
    s.paid_amount,
    s.current_step_index,
    s.step_dates,
    s.eta,
    s.created_at,
    s.customer_user_id,
    s.directory_customer_id,
    s.step_photos,
    s.batch_code,
    s.branch
  from public.shipments s
  order by s.created_at desc;
$$;

create or replace function public.admin_upsert_customer_public(
  p_name text,
  p_phone text,
  p_email text default null,
  p_city text default null,
  p_delivery_location text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.customer_directory
  where phone = p_phone
     or (p_email is not null and p_email <> '' and lower(coalesce(email, '')) = lower(p_email))
  order by created_at desc
  limit 1;

  if v_id is null then
    insert into public.customer_directory (name, phone, city, delivery_location, note)
    values (p_name, p_phone, p_city, p_delivery_location, p_note)
    returning id into v_id;
  else
    update public.customer_directory
    set name = coalesce(nullif(p_name, ''), name),
        phone = coalesce(nullif(p_phone, ''), phone),
        city = coalesce(nullif(p_city, ''), city),
        delivery_location = coalesce(nullif(p_delivery_location, ''), delivery_location),
        note = coalesce(nullif(p_note, ''), note)
    where id = v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.admin_upsert_shipment_public(p_payload jsonb)
returns public.shipments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.shipments;
  v_id text := coalesce(nullif(p_payload->>'id', ''), 'GC' || floor(random() * 100000000)::text);
begin
  insert into public.shipments (
    id, customer_name, customer_phone, customer_email, notes,
    origin_key, dest_key, type, weight_kg, volume_cbm, items_count,
    total_amount, paid_amount, current_step_index, step_dates, eta,
    customer_user_id, directory_customer_id, step_photos, batch_code, branch
  ) values (
    v_id,
    nullif(p_payload->>'customer_name', ''),
    nullif(p_payload->>'customer_phone', ''),
    nullif(p_payload->>'customer_email', ''),
    nullif(p_payload->>'notes', ''),
    nullif(p_payload->>'origin_key', ''),
    nullif(p_payload->>'dest_key', ''),
    coalesce(nullif(p_payload->>'type', ''), 'land'),
    coalesce((nullif(p_payload->>'weight_kg', ''))::numeric, 0),
    coalesce((nullif(p_payload->>'volume_cbm', ''))::numeric, 0),
    nullif(p_payload->>'items_count', '')::int,
    coalesce((nullif(p_payload->>'total_amount', ''))::numeric, 0),
    coalesce((nullif(p_payload->>'paid_amount', ''))::numeric, 0),
    coalesce((nullif(p_payload->>'current_step_index', ''))::int, 0),
    coalesce(p_payload->'step_dates', '{}'::jsonb),
    case when nullif(p_payload->>'eta', '') is null then null else (p_payload->>'eta')::timestamptz end,
    case when nullif(p_payload->>'customer_user_id', '') is null then null else (p_payload->>'customer_user_id')::uuid end,
    case when nullif(p_payload->>'directory_customer_id', '') is null then null else (p_payload->>'directory_customer_id')::uuid end,
    coalesce(p_payload->'step_photos', '{}'::jsonb),
    nullif(p_payload->>'batch_code', ''),
    nullif(p_payload->>'branch', '')
  )
  on conflict (id) do update set
    customer_name = excluded.customer_name,
    customer_phone = excluded.customer_phone,
    customer_email = excluded.customer_email,
    notes = excluded.notes,
    origin_key = excluded.origin_key,
    dest_key = excluded.dest_key,
    type = excluded.type,
    weight_kg = excluded.weight_kg,
    volume_cbm = excluded.volume_cbm,
    items_count = excluded.items_count,
    total_amount = excluded.total_amount,
    paid_amount = excluded.paid_amount,
    current_step_index = excluded.current_step_index,
    step_dates = excluded.step_dates,
    eta = excluded.eta,
    customer_user_id = excluded.customer_user_id,
    directory_customer_id = excluded.directory_customer_id,
    step_photos = excluded.step_photos,
    batch_code = excluded.batch_code,
    branch = excluded.branch
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_delete_shipment_public(p_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.shipments where id = p_id;
$$;

create or replace function public.admin_delete_customer_public(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shipments set directory_customer_id = null where directory_customer_id = p_id;
  delete from public.customer_directory where id = p_id;
end;
$$;
;
