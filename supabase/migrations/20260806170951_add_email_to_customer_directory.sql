alter table public.customer_directory
add column if not exists email text;

create index if not exists customer_directory_email_idx
on public.customer_directory using btree (lower(email));

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
    cd.email,
    cd.city,
    cd.delivery_location,
    cd.note,
    cd.created_at,
    coalesce((select count(*) from public.shipments s where s.directory_customer_id = cd.id), 0)::bigint as shipment_count
  from public.customer_directory cd
  order by cd.created_at desc;
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
    insert into public.customer_directory (name, phone, email, city, delivery_location, note)
    values (p_name, p_phone, p_email, p_city, p_delivery_location, p_note)
    returning id into v_id;
  else
    update public.customer_directory
    set name = coalesce(nullif(p_name, ''), name),
        phone = coalesce(nullif(p_phone, ''), phone),
        email = coalesce(nullif(p_email, ''), email),
        city = coalesce(nullif(p_city, ''), city),
        delivery_location = coalesce(nullif(p_delivery_location, ''), delivery_location),
        note = coalesce(nullif(p_note, ''), note)
    where id = v_id;
  end if;

  return v_id;
end;
$$;
;
