-- Globall Cloud digital customer system contract.
-- Existing production migrations already provide immutable GC identity fields and generator.
-- This migration adds the remaining warehouse, pricing, and shipment metadata contract.
alter table public.shipments
  add column if not exists cargo_type text,
  add column if not exists cargo_cost numeric(14,2),
  add column if not exists cargo_currency text not null default 'USD',
  add column if not exists warehouse_location text;

create table if not exists public.gc_warehouse_addresses (
  id text primary key,
  country text not null,
  city text not null,
  label text not null,
  address text not null,
  contact text,
  pickup_hours text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.gc_warehouse_addresses(id,country,city,label,address,contact,pickup_hours,sort_order)
values
 ('china','China','Yiwu','China warehouse','GC China warehouse address — confirm the exact street/unit with staff before publishing.','Contact staff for receiving instructions',null,10),
 ('dubai','UAE','Dubai','Dubai warehouse','GC Dubai warehouse address — confirm the exact street/unit with staff before publishing.','Contact staff for receiving instructions',null,20),
 ('usa','United States','New York','USA warehouse','GC USA warehouse address — confirm the exact street/unit with staff before publishing.','Contact staff for receiving instructions',null,30),
 ('erbil','Iraq','Erbil','Erbil pickup office','Erbil office — customer pickup only','09:00–17:00', '09:00–17:00',40)
on conflict (id) do update set country=excluded.country,city=excluded.city,label=excluded.label,address=excluded.address,contact=excluded.contact,pickup_hours=excluded.pickup_hours,sort_order=excluded.sort_order,is_active=true,updated_at=now();

alter table public.gc_warehouse_addresses enable row level security;
drop policy if exists gc_warehouse_addresses_read on public.gc_warehouse_addresses;
create policy gc_warehouse_addresses_read on public.gc_warehouse_addresses for select to authenticated using (is_active = true or public.is_staff());
drop policy if exists gc_warehouse_addresses_staff_write on public.gc_warehouse_addresses;
create policy gc_warehouse_addresses_staff_write on public.gc_warehouse_addresses for all to authenticated using (public.is_staff()) with check (public.is_staff());
grant select on public.gc_warehouse_addresses to authenticated;
grant insert, update, delete on public.gc_warehouse_addresses to authenticated;

create table if not exists public.gc_rate_cards (
  id text primary key,
  origin text not null,
  mode text not null,
  cargo_type text not null default 'standard',
  price numeric(14,2) not null,
  unit text not null,
  currency text not null default 'USD',
  note text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.gc_rate_cards(id,origin,mode,cargo_type,price,unit,note)
values
 ('cn-air-standard','China','air','standard',9,'kg','China air standard'),
 ('cn-air-screen','China','air','screen',12,'kg','China air screen'),
 ('cn-air-battery','China','air','battery',14,'kg','China air battery'),
 ('cn-sea','China','sea','standard',300,'cbm','China sea'),
 ('us-air','USA','air','standard',13,'kg','USA air'),
 ('ae-air-min','Dubai','air','standard',8.25,'kg','Dubai air starting rate'),
 ('ae-air-max','Dubai','air','priority',22,'kg','Dubai air upper rate'),
 ('ae-land','Dubai','land','standard',1.50,'kg','Dubai land'),
 ('ae-land-shein-100','Dubai','land','shein_100_plus',1.25,'kg','Shein over 100kg')
on conflict (id) do update set price=excluded.price,unit=excluded.unit,note=excluded.note,is_active=true,updated_at=now();
alter table public.gc_rate_cards enable row level security;
drop policy if exists gc_rate_cards_read on public.gc_rate_cards;
create policy gc_rate_cards_read on public.gc_rate_cards for select to authenticated using (is_active = true or public.is_staff());
grant select on public.gc_rate_cards to authenticated;

commit;
