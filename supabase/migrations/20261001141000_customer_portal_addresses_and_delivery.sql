-- Customer portal logistics directory. Existing customer_directory, shipments and quote_requests remain the source of truth.
insert into public.gc_warehouse_addresses (id,country,city,label,address,contact,pickup_hours,sort_order,is_active,updated_at)
values
  ('china-air','China','Foshan','China Air warehouse','广东省佛山市南海区里水镇草场海南州工业区32号 B区 212号-2459','Entry: Globall Cloud / tasasul',null,11,true,now()),
  ('china-sea','China','Foshan','China Sea warehouse','佛山市南海区里水镇共同孔东村东街一巷 2号','Entry: Hacos-Damon',null,12,true,now()),
  ('dubai','UAE','Dubai','Dubai warehouse','Dubai - Deira, Al Khabaisi, Street 6A. Zip 50819','Globall Cloud receiving desk',null,20,true,now()),
  ('usa','United States','USA','USA warehouse','USA warehouse address will be published after owner confirmation.','Contact Globall Cloud before ordering',null,30,true,now()),
  ('erbil','Iraq','Erbil','Erbil pickup office','New Erbil, behind Gasha Institute — free office pickup only','Office pickup; customer pays third-party delivery','09:00–17:00',40,true,now())
on conflict (id) do update set
  country=excluded.country, city=excluded.city, label=excluded.label, address=excluded.address,
  contact=excluded.contact, pickup_hours=excluded.pickup_hours, sort_order=excluded.sort_order,
  is_active=excluded.is_active, updated_at=now();

comment on table public.gc_warehouse_addresses is 'Customer-facing warehouse directory. USA address remains an explicit owner-confirmation placeholder until supplied.';
