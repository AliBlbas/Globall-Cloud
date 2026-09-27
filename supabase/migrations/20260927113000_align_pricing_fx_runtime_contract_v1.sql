begin;

-- Runtime compatibility: the staff production API uses the canonical pricing
-- contract while older production rows use the legacy catalog names.
alter table public.pricing_rates
  add column if not exists rate_key text,
  add column if not exists origin_key text,
  add column if not exists destination_key text,
  add column if not exists transport_mode text,
  add column if not exists product_type text,
  add column if not exists unit text default 'kg',
  add column if not exists amount numeric(14,2) default 0,
  add column if not exists currency text default 'USD',
  add column if not exists transit_min_days integer,
  add column if not exists transit_max_days integer,
  add column if not exists effective_from date default current_date,
  add column if not exists effective_to date,
  add column if not exists is_active boolean default true,
  add column if not exists notes text,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid,
  add column if not exists created_at timestamptz default now();

update public.pricing_rates
set rate_key=coalesce(nullif(rate_key,''), lower(regexp_replace(coalesce(origin,'origin')||'_'||coalesce(destination,'destination')||'_'||coalesce(transport_type,'air')||'_'||coalesce(item_category,'general'),'[^a-zA-Z0-9]+','_','g'))),
    origin_key=coalesce(nullif(origin_key,''), lower(coalesce(origin,'unknown'))),
    destination_key=coalesce(nullif(destination_key,''), lower(coalesce(destination,'erbil'))),
    transport_mode=coalesce(nullif(transport_mode,''), lower(coalesce(transport_type,'air'))),
    product_type=coalesce(nullif(product_type,''), coalesce(item_category,'General goods')),
    unit=coalesce(nullif(unit,''),'kg'),
    amount=coalesce(amount,price_usd,0),
    currency=coalesce(nullif(currency,''),'USD'),
    effective_from=coalesce(effective_from, current_date),
    is_active=coalesce(is_active,true),
    created_at=coalesce(created_at,updated_at,now())
where rate_key is null or origin_key is null or destination_key is null or transport_mode is null or product_type is null;

alter table public.exchange_rates
  add column if not exists base_currency text default 'USD',
  add column if not exists quote_currency text default 'IQD',
  add column if not exists rate numeric(18,6),
  add column if not exists effective_from date default current_date,
  add column if not exists effective_to date,
  add column if not exists is_active boolean default true,
  add column if not exists source_note text,
  add column if not exists updated_at timestamptz default now();

update public.exchange_rates
set base_currency=coalesce(nullif(base_currency,''),'USD'),
    quote_currency=coalesce(nullif(quote_currency,''),'IQD'),
    rate=coalesce(rate,usd_to_iqd),
    effective_from=coalesce(effective_from, (created_at::date), current_date),
    is_active=coalesce(is_active,true),
    source_note=coalesce(nullif(source_note,''),source,'legacy'),
    updated_at=coalesce(updated_at,created_at,now())
where rate is null or base_currency is null or quote_currency is null;

create index if not exists pricing_rates_runtime_lookup_idx
  on public.pricing_rates(origin_key,destination_key,transport_mode,product_type,is_active,effective_from desc);
create index if not exists exchange_rates_runtime_lookup_idx
  on public.exchange_rates(base_currency,quote_currency,is_active,effective_from desc);

commit;
