-- Global Cloud: Shopping / Buy-for-me foundation
-- Extends the existing logistics platform; no new Supabase project.

create table if not exists public.shopping_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  marketplace text not null check (marketplace in ('shein','amazon','aliexpress','1688','alibaba','other')),
  product_url text not null,
  product_title text,
  product_image_url text,
  product_price numeric(12,2),
  product_currency text default 'USD',
  delivery_price numeric(12,2) not null default 0,
  delivery_currency text default 'USD',
  exchange_rate numeric(18,6),
  service_fee_iqd bigint not null default 0,
  final_price_iqd bigint,
  status text not null default 'pending_quote' check (status in ('pending_quote','quoted','awaiting_payment','paid','purchased','warehouse','in_transit','delivered','cancelled')),
  tracking_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shopping_orders_customer_idx on public.shopping_orders(customer_id);
create index if not exists shopping_orders_marketplace_idx on public.shopping_orders(marketplace);
create index if not exists shopping_orders_status_idx on public.shopping_orders(status);

alter table public.shopping_orders enable row level security;

-- Customer isolation: only authenticated customers can read their own orders.
create policy "shopping_orders_customer_select"
on public.shopping_orders
for select to authenticated
using (customer_id = auth.uid());

create policy "shopping_orders_customer_insert"
on public.shopping_orders
for insert to authenticated
with check (customer_id = auth.uid());

-- Quote calculation helper. Delivery is intentionally separate from product price.
create or replace function public.calculate_shopping_total_iqd(
  p_product_price numeric,
  p_product_currency text,
  p_delivery_price numeric,
  p_delivery_currency text,
  p_usd_to_iqd numeric,
  p_service_fee_iqd bigint default 0
) returns bigint
language sql
immutable
as $$
  select round(
    ((case when upper(p_product_currency) = 'USD' then p_product_price
           else p_product_price * p_usd_to_iqd end)
     + (case when upper(p_delivery_currency) = 'USD' then p_delivery_price
             else p_delivery_price * p_usd_to_iqd end))
    * p_usd_to_iqd
    + p_service_fee_iqd
  )::bigint;
$$;
