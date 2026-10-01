begin;

-- Allocate the next GC code atomically from the database, never from client state.
create or replace function public.generate_gc_customer_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_next integer;
begin
  perform pg_advisory_xact_lock(8321001);
  select greatest(coalesce(max(nullif(regexp_replace(coalesce(gc_code, code), '[^0-9]', '', 'g'), '')::integer), 99), 99) + 1
    into v_next
    from public.customer_directory;
  return 'GC-' || v_next::text;
end;
$$;
revoke all on function public.generate_gc_customer_code() from public, anon, authenticated;
grant execute on function public.generate_gc_customer_code() to service_role;

insert into public.gc_warehouse_addresses(id,country,city,label,address,contact,pickup_hours,sort_order)
values
 ('dubai','UAE','Dubai','Dubai','Dubai - Deira, Al Khabaisi, Street 6A. Zip 50819','Use your GC code when labeling cargo',null,20),
 ('china-air','China','Foshan','China Air','广东省佛山市南海区里水镇草场海南州工业区32号 B区 212号-2459','Use your GC code when labeling cargo',null,10),
 ('china-sea','China','Foshan','China Sea','佛山市南海区里水镇共同孔东村东街一巷 2号 (Entry: Hacos-Damon)','Use your GC code when labeling cargo',null,11),
 ('usa','United States','—','USA','USA warehouse address will be published after owner confirmation','Address pending owner confirmation',null,30)
on conflict (id) do update set country=excluded.country,city=excluded.city,label=excluded.label,address=excluded.address,contact=excluded.contact,sort_order=excluded.sort_order,is_active=true,updated_at=now();

insert into public.gc_rate_cards(id,origin,mode,cargo_type,price,unit,currency,note)
values
 ('cn-air-normal','China','air','normal',9,'kg','USD','7–10 days'),
 ('cn-air-screen','China','air','screen',12,'kg','USD','7–10 days'),
 ('cn-air-battery','China','air','battery',14,'kg','USD','7–10 days'),
 ('cn-sea-cbm','China','sea','standard',300,'cbm','USD','60 days'),
 ('us-air-standard','USA','air','standard',13,'kg','USD','10–15 days'),
 ('ae-air-used-phone','Dubai','air','used_phone',15,'item','USD','Used iPhone/Android'),
 ('ae-air-new-flagship','Dubai','air','new_flagship',22,'item','USD','iPhone 17 / S25–26'),
 ('ae-air-laptop','Dubai','air','laptop',10.5,'item','USD','Laptop'),
 ('ae-air-accessories','Dubai','air','accessories',8.25,'item','USD','Accessories'),
 ('ae-land-clothes','Dubai','land','clothes',1.5,'kg','USD','Shein/clothes'),
 ('ae-land-clothes-100','Dubai','land','clothes_100_plus',1.25,'kg','USD','Discount above 100kg'),
 ('ae-land-cosmetic-electronics','Dubai','land','cosmetic_electronics',4,'kg','USD','Cosmetic/electronics'),
 ('ae-land-perfume-iherb','Dubai','land','perfume_iherb',12,'kg','USD','Perfume/iHerb')
on conflict (id) do update set price=excluded.price,unit=excluded.unit,currency=excluded.currency,note=excluded.note,is_active=true,updated_at=now();

create table if not exists public.gc_delivery_options (id text primary key, label text not null, description text not null, customer_pays boolean not null default true, is_active boolean not null default true, sort_order integer not null default 0);
insert into public.gc_delivery_options(id,label,description,customer_pays,sort_order) values
 ('office','Office pickup','New Erbil, behind Gasha Institute — free pickup',false,10),
 ('taxi-erbil','Taxi Erbil','Price decided by taxi; customer pays',true,20),
 ('hyper-post','Hyper Post','For Sulaymaniyah, Duhok and other cities; customer pays',true,30)
on conflict (id) do update set label=excluded.label,description=excluded.description,customer_pays=excluded.customer_pays,is_active=true,sort_order=excluded.sort_order;
alter table public.gc_delivery_options enable row level security;
drop policy if exists gc_delivery_options_read on public.gc_delivery_options;
create policy gc_delivery_options_read on public.gc_delivery_options for select to authenticated using (is_active = true or public.is_staff());
grant select on public.gc_delivery_options to authenticated;

create table if not exists public.gc_policies (id text primary key, title text not null, body text not null, is_active boolean not null default true, sort_order integer not null default 0);
insert into public.gc_policies(id,title,body,sort_order) values
 ('returns','Returns','Return is available only while the shipment is still in the origin warehouse in China or Dubai.',10),
 ('delivery-fees','Delivery fees','There is no free delivery. All delivery costs are paid by the customer except office pickup.',20),
 ('minimum','Minimum charge','Shipments under 1kg have a minimum charge of 5000 IQD.',30)
on conflict (id) do update set title=excluded.title,body=excluded.body,is_active=true,sort_order=excluded.sort_order;
alter table public.gc_policies enable row level security;
drop policy if exists gc_policies_read on public.gc_policies;
create policy gc_policies_read on public.gc_policies for select to authenticated using (is_active = true or public.is_staff());
grant select on public.gc_policies to authenticated;

commit;
