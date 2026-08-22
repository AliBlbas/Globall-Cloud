-- Effective-dated logistics pricing catalog. Historical rows remain intact when managers publish a new rate.
create table if not exists public.pricing_rates (
  id uuid primary key default gen_random_uuid(),
  rate_key text not null,
  origin_key text not null,
  destination_key text not null,
  transport_mode text not null check (transport_mode in ('air','sea','land')),
  product_type text not null,
  unit text not null check (unit in ('kg','cbm')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency in ('USD','IQD','AED','CNY')),
  transit_min_days integer check (transit_min_days is null or transit_min_days >= 0),
  transit_max_days integer check (transit_max_days is null or transit_max_days >= transit_min_days),
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.staff(id) on delete set null,
  updated_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(rate_key, effective_from)
);
create index if not exists pricing_rates_lookup_idx on public.pricing_rates(origin_key,destination_key,transport_mode,product_type,is_active,effective_from desc);
alter table public.pricing_rates enable row level security;
drop policy if exists pricing_rates_authenticated_select on public.pricing_rates;
create policy pricing_rates_authenticated_select on public.pricing_rates for select to authenticated using (true);
drop policy if exists pricing_rates_finance_insert on public.pricing_rates;
create policy pricing_rates_finance_insert on public.pricing_rates for insert to authenticated with check (exists(select 1 from public.staff s where s.id=(select auth.uid()) and s.is_active=true and s.role in ('admin','super_admin','accountant')));
drop policy if exists pricing_rates_finance_update on public.pricing_rates;
create policy pricing_rates_finance_update on public.pricing_rates for update to authenticated using (exists(select 1 from public.staff s where s.id=(select auth.uid()) and s.is_active=true and s.role in ('admin','super_admin','accountant'))) with check (exists(select 1 from public.staff s where s.id=(select auth.uid()) and s.is_active=true and s.role in ('admin','super_admin','accountant')));

create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  quote_currency text not null,
  rate numeric(18,6) not null check (rate > 0),
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  source_note text,
  created_by uuid references public.staff(id) on delete set null,
  updated_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(base_currency,quote_currency,effective_from)
);
create index if not exists exchange_rates_lookup_idx on public.exchange_rates(base_currency,quote_currency,is_active,effective_from desc);
alter table public.exchange_rates enable row level security;
drop policy if exists exchange_rates_authenticated_select on public.exchange_rates;
create policy exchange_rates_authenticated_select on public.exchange_rates for select to authenticated using (true);
drop policy if exists exchange_rates_finance_insert on public.exchange_rates;
create policy exchange_rates_finance_insert on public.exchange_rates for insert to authenticated with check (exists(select 1 from public.staff s where s.id=(select auth.uid()) and s.is_active=true and s.role in ('admin','super_admin','accountant')));
drop policy if exists exchange_rates_finance_update on public.exchange_rates;
create policy exchange_rates_finance_update on public.exchange_rates for update to authenticated using (exists(select 1 from public.staff s where s.id=(select auth.uid()) and s.is_active=true and s.role in ('admin','super_admin','accountant'))) with check (exists(select 1 from public.staff s where s.id=(select auth.uid()) and s.is_active=true and s.role in ('admin','super_admin','accountant')));

insert into public.pricing_rates(rate_key,origin_key,destination_key,transport_mode,product_type,unit,amount,currency,transit_min_days,transit_max_days,notes)
values
('sea_cn_iq_cbm','China','Erbil','sea','Container / CBM','cbm',300,'USD',60,60,'کۆنتینەر؛ 60 ڕۆژ'),
('air_cn_iq_general','China','Erbil','air','General goods / no battery / no screen','kg',9,'USD',7,10,'کالای ئاسایی؛ بێ پاتری و بێ شاشە'),
('air_cn_iq_screen','China','Erbil','air','Screen','kg',12,'USD',7,10,'شاشە'),
('air_cn_iq_battery','China','Erbil','air','Battery','kg',14,'USD',7,10,'پاتری'),
('air_us_iq_general','USA','Erbil','air','General goods','kg',13,'USD',10,15,'گواستنەوەی ئاسمانی ئەمریکا'),
('air_ae_iq_accessories','UAE','Erbil','air','Accessories','kg',8.25,'USD',null,null,null),
('air_ae_iq_camera','UAE','Erbil','air','Camera','kg',11,'USD',null,null,null),
('air_ae_iq_tablet','UAE','Erbil','air','Tablet','kg',8.5,'USD',null,null,null),
('air_ae_iq_used_iphone','UAE','Erbil','air','Used iPhone','kg',15,'USD',null,null,null),
('air_ae_iq_android','UAE','Erbil','air','Android phone','kg',15,'USD',null,null,null),
('air_ae_iq_iphone17_s25_s26','UAE','Erbil','air','iPhone 17 / Samsung S25-S26','kg',22,'USD',null,null,null),
('air_ae_iq_playstation','UAE','Erbil','air','PlayStation','kg',9.5,'USD',null,null,null),
('air_ae_iq_laptop','UAE','Erbil','air','Laptop','kg',10.5,'USD',null,null,null),
('land_ae_iq_clothing','UAE','Erbil','land','Shein / clothing','kg',1.5,'USD',null,null,null),
('land_ae_iq_cosmetics_electronics','UAE','Erbil','land','Cosmetics / electronics','kg',4,'USD',null,null,null),
('land_ae_iq_airfryer_perfume','UAE','Erbil','land','Air fryer / perfume','kg',12,'USD',null,null,null)
on conflict(rate_key,effective_from) do nothing;
insert into public.exchange_rates(base_currency,quote_currency,rate,source_note)
values ('USD','IQD',1540,'100 USD = 154,000 IQD; manager-supplied current rate')
on conflict(base_currency,quote_currency,effective_from) do nothing;
