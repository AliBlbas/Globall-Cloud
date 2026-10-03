-- Customer self-registration and customer-facing shipping configuration.
-- Existing production tables remain canonical: customer_directory, shipments, quote_requests.

create sequence if not exists public.customer_gc_number_seq;
do $$
declare
  v_max bigint;
begin
  select coalesce(max((regexp_match(upper(trim(coalesce(gc_code, code))), '^GC-([0-9]+)$'))[1]::bigint), 0)
    into v_max
  from public.customer_directory;
  if v_max > 0 then
    perform setval('public.customer_gc_number_seq', v_max, true);
  end if;
end $$;

create table if not exists public.customer_shipping_rates (
  id text primary key,
  origin text not null,
  mode text not null check (mode in ('air','sea','land')),
  category text not null,
  unit text not null check (unit in ('kg','cbm','item')),
  rate numeric(12,2) not null check (rate >= 0),
  currency text not null default 'USD',
  transit_time text not null,
  notes text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  updated_at timestamptz not null default now()
);

insert into public.customer_shipping_rates (id,origin,mode,category,unit,rate,currency,transit_time,notes,sort_order)
values
 ('china-air-normal','China','air','Normal cargo','kg',9,'USD','7–10 days',null,10),
 ('china-air-screen','China','air','Screen / LCD','kg',12,'USD','7–10 days',null,11),
 ('china-air-battery','China','air','Battery cargo','kg',14,'USD','7–10 days',null,12),
 ('china-sea-cbm','China','sea','Sea cargo','cbm',300,'USD','60 days',null,20),
 ('usa-air','USA','air','Air cargo','kg',13,'USD','10–15 days',null,30),
 ('dubai-air-used-phone','Dubai','air','Used iPhone / Android','item',15,'USD','3–7 days',null,40),
 ('dubai-air-new-phone','Dubai','air','iPhone 17 / S25–S26','item',22,'USD','3–7 days',null,41),
 ('dubai-air-laptop','Dubai','air','Laptop','item',10.5,'USD','3–7 days',null,42),
 ('dubai-air-accessory','Dubai','air','Accessories','item',8.25,'USD','3–7 days',null,43),
 ('dubai-land-clothes','Dubai','land','Clothes / Shein','kg',1.5,'USD','14–25 days','Discount rate 1.25 USD/kg above 100kg',50),
 ('dubai-land-cosmetic','Dubai','land','Cosmetics / electronics','kg',4,'USD','14–25 days',null,51),
 ('dubai-land-perfume','Dubai','land','Perfume / iHerb','kg',12,'USD','14–25 days',null,52)
on conflict (id) do update set
 origin=excluded.origin, mode=excluded.mode, category=excluded.category, unit=excluded.unit,
 rate=excluded.rate, currency=excluded.currency, transit_time=excluded.transit_time,
 notes=excluded.notes, sort_order=excluded.sort_order, is_active=true, updated_at=now();

alter table public.customer_shipping_rates enable row level security;
drop policy if exists customer_shipping_rates_public_read on public.customer_shipping_rates;
create policy customer_shipping_rates_public_read on public.customer_shipping_rates
  for select to anon, authenticated using (is_active = true);

create table if not exists public.customer_delivery_options (
  id text primary key,
  label text not null,
  description text not null,
  payment_note text not null,
  is_active boolean not null default true,
  sort_order integer not null default 100
);
insert into public.customer_delivery_options (id,label,description,payment_note,sort_order)
values
 ('office','Globall Cloud office pickup','New Erbil, behind Gasha Institute','Free office pickup',10),
 ('taxi-erbil','Taxi داخل هەولێر','Taxi delivers inside Erbil','Taxi price is decided and paid by customer',20),
 ('hyper-post','Hyper Post to other cities','Sulaymaniyah, Duhok and other cities','Customer pays Hyper Post delivery cost',30)
on conflict (id) do update set label=excluded.label,description=excluded.description,payment_note=excluded.payment_note,is_active=true,sort_order=excluded.sort_order;
alter table public.customer_delivery_options enable row level security;
drop policy if exists customer_delivery_options_public_read on public.customer_delivery_options;
create policy customer_delivery_options_public_read on public.customer_delivery_options
  for select to anon, authenticated using (is_active = true);

create or replace function public.register_customer_with_gc(
  p_auth_user_id uuid,
  p_name text,
  p_email text,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_gc text;
  v_id uuid;
begin
  if p_auth_user_id is null then raise exception 'Auth user is required'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Customer name is required'; end if;
  if nullif(trim(p_email),'') is null then raise exception 'Customer email is required'; end if;
  perform pg_advisory_xact_lock(89127364);
  v_gc := 'GC-' || nextval('public.customer_gc_number_seq')::text;
  insert into public.customer_directory (
    code,gc_code,normalized_gc_code,name,email,phone,auth_user_id,
    preferred_language,preferred_contact_channel,customer_status,is_active,
    total_shipments,total_spend,created_at,updated_at
  ) values (
    v_gc,v_gc,v_gc,trim(p_name),lower(trim(p_email)),nullif(trim(p_phone),''),p_auth_user_id,
    'ckb','email','active',true,0,0,now(),now()
  ) returning id into v_id;
  return jsonb_build_object('id',v_id,'gc_code',v_gc,'name',trim(p_name));
exception when unique_violation then
  raise exception 'Customer email or GC code already exists';
end;
$$;
revoke all on function public.register_customer_with_gc(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.register_customer_with_gc(uuid,text,text,text) to service_role;
