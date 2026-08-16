drop function if exists public.admin_list_customers_public();
drop function if exists public.admin_list_shipments_public();
drop function if exists public.admin_upsert_customer_public(uuid, text, text, text, text, text, text);
drop function if exists public.admin_delete_customer_public(uuid);
drop function if exists public.admin_upsert_shipment_public(jsonb);
drop function if exists public.admin_delete_shipment_public(text);

create function public.admin_list_customers_public()
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
    cd.email,
    cd.city,
    cd.delivery_location,
    cd.note,
    cd.created_at,
    coalesce(count(s.id), 0)::bigint as shipment_count
  from public.customer_directory cd
  left join public.shipments s
    on s.directory_customer_id = cd.id
  group by cd.id, cd.name, cd.phone, cd.email, cd.city, cd.delivery_location, cd.note, cd.created_at
  order by cd.created_at desc;
$$;

create function public.admin_list_shipments_public()
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

create function public.admin_upsert_customer_public(
  p_id uuid default null,
  p_name text default null,
  p_phone text default null,
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
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_delivery_location text := nullif(btrim(coalesce(p_delivery_location, '')), '');
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_id is not null then
    update public.customer_directory
       set name = coalesce(v_name, name),
           phone = coalesce(v_phone, phone),
           email = coalesce(v_email, email),
           city = coalesce(v_city, city),
           delivery_location = coalesce(v_delivery_location, delivery_location),
           note = coalesce(v_note, note)
     where id = p_id
     returning id into v_id;

    if v_id is not null then
      return v_id;
    end if;
  end if;

  select id into v_id
    from public.customer_directory
   where (v_phone is not null and phone = v_phone)
      or (v_email is not null and lower(email) = v_email)
   order by created_at desc
   limit 1;

  if v_id is not null then
    update public.customer_directory
       set name = coalesce(v_name, name),
           phone = coalesce(v_phone, phone),
           email = coalesce(v_email, email),
           city = coalesce(v_city, city),
           delivery_location = coalesce(v_delivery_location, delivery_location),
           note = coalesce(v_note, note)
     where id = v_id;
    return v_id;
  end if;

  insert into public.customer_directory (
    name, phone, email, city, delivery_location, note
  ) values (
    coalesce(v_name, 'Customer'), v_phone, v_email, v_city, v_delivery_location, v_note
  )
  returning id into v_id;

  return v_id;
end;
$$;

create function public.admin_delete_customer_public(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shipments
     set directory_customer_id = null
   where directory_customer_id = p_id;

  delete from public.customer_directory
   where id = p_id;

  return true;
end;
$$;

create function public.admin_upsert_shipment_public(p_payload jsonb)
returns public.shipments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := coalesce(nullif(btrim(p_payload->>'id'), ''), '');
  v_step_dates jsonb := coalesce(p_payload->'step_dates', '{}'::jsonb);
  v_step_photos jsonb := coalesce(p_payload->'step_photos', '{}'::jsonb);
  v_row public.shipments%rowtype;
begin
  if v_id = '' then
    raise exception 'shipment id is required';
  end if;

  insert into public.shipments (
    id,
    customer_name,
    customer_phone,
    customer_email,
    notes,
    origin_key,
    dest_key,
    type,
    weight_kg,
    volume_cbm,
    items_count,
    total_amount,
    paid_amount,
    current_step_index,
    step_dates,
    eta,
    customer_user_id,
    directory_customer_id,
    step_photos,
    batch_code,
    branch
  ) values (
    v_id,
    nullif(btrim(p_payload->>'customer_name'), ''),
    nullif(btrim(p_payload->>'customer_phone'), ''),
    nullif(btrim(p_payload->>'customer_email'), ''),
    nullif(btrim(p_payload->>'notes'), ''),
    nullif(btrim(p_payload->>'origin_key'), ''),
    nullif(btrim(p_payload->>'dest_key'), ''),
    coalesce(nullif(btrim(p_payload->>'type'), ''), 'land'),
    coalesce((p_payload->>'weight_kg')::numeric, 0),
    coalesce((p_payload->>'volume_cbm')::numeric, 0),
    case when nullif(btrim(p_payload->>'items_count'), '') is null then null else (p_payload->>'items_count')::int end,
    coalesce((p_payload->>'total_amount')::numeric, 0),
    coalesce((p_payload->>'paid_amount')::numeric, 0),
    coalesce((p_payload->>'current_step_index')::int, 0),
    v_step_dates,
    case when nullif(btrim(p_payload->>'eta'), '') is null then null else (p_payload->>'eta')::timestamptz end,
    case when nullif(btrim(p_payload->>'customer_user_id'), '') is null then null else (p_payload->>'customer_user_id')::uuid end,
    case when nullif(btrim(p_payload->>'directory_customer_id'), '') is null then null else (p_payload->>'directory_customer_id')::uuid end,
    v_step_photos,
    nullif(btrim(p_payload->>'batch_code'), ''),
    nullif(btrim(p_payload->>'branch'), '')
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

create function public.admin_delete_shipment_public(p_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.shipments where id = p_id;
  return true;
end;
$$;

grant execute on function public.admin_list_customers_public() to anon, authenticated;
grant execute on function public.admin_list_shipments_public() to anon, authenticated;
grant execute on function public.admin_upsert_customer_public(uuid, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_delete_customer_public(uuid) to anon, authenticated;
grant execute on function public.admin_upsert_shipment_public(jsonb) to anon, authenticated;
grant execute on function public.admin_delete_shipment_public(text) to anon, authenticated;
;
