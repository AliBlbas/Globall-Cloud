-- Global Cloud Shopping production extension.
-- Safe to replay on the existing logistics schema: no legacy table is dropped.

create table if not exists public.shopping_platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  is_active boolean not null default true,
  base_currency text not null default 'USD',
  created_at timestamptz not null default now()
);
insert into public.shopping_platforms(name,slug) values ('SHEIN','shein'),('Amazon','amazon'),('1688 / Alibaba','1688') on conflict(slug) do nothing;

create table if not exists public.shopping_orders (
  id uuid primary key default gen_random_uuid(), customer_id uuid, marketplace text not null,
  product_url text not null, product_title text, product_image_url text,
  product_price numeric(12,2), product_currency text not null default 'USD',
  delivery_price numeric(12,2) not null default 0, delivery_currency text not null default 'USD',
  exchange_rate numeric(18,6), service_fee_iqd bigint not null default 0, final_price_iqd bigint,
  status text not null default 'pending_payment', tracking_number text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.shopping_orders add column if not exists user_id uuid;
alter table public.shopping_orders add column if not exists platform_id uuid;
alter table public.shopping_orders add column if not exists exchange_rate_used numeric;
alter table public.shopping_orders add column if not exists service_margin_percent numeric;
alter table public.shopping_orders add column if not exists subtotal_usd numeric;
alter table public.shopping_orders add column if not exists total_usd numeric;
alter table public.shopping_orders add column if not exists payment_session_id uuid;
alter table public.shopping_orders add column if not exists shipment_id text;
alter table public.shopping_orders add column if not exists idempotency_key text;
alter table public.shopping_orders drop constraint if exists shopping_orders_status_check;
alter table public.shopping_orders add constraint shopping_orders_status_check check(status=any(array['pending_payment','paid','ordered_from_platform','arrived_at_origin_warehouse','shipped_to_erbil','delivered','cancelled']));
create unique index if not exists shopping_orders_idempotency_key_uq on public.shopping_orders(idempotency_key) where idempotency_key is not null;
create index if not exists shopping_orders_user_idx on public.shopping_orders(user_id);
create index if not exists shopping_orders_status_idx on public.shopping_orders(status);

create table if not exists public.shopping_order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.shopping_orders(id) on delete cascade,
  product_url text not null, product_title text, product_image_url text,
  product_price_usd numeric not null, product_shipping_usd numeric not null default 0,
  quantity integer not null default 1, variant_info jsonb, created_at timestamptz not null default now()
);

alter table public.shipments add column if not exists source text default 'logistics';
alter table public.shipments add column if not exists source_order_id uuid references public.shopping_orders(id);

alter table public.shopping_platforms enable row level security;
alter table public.shopping_orders enable row level security;
alter table public.shopping_order_items enable row level security;

drop policy if exists shopping_platforms_public_select on public.shopping_platforms;
create policy shopping_platforms_public_select on public.shopping_platforms for select using(true);
drop policy if exists shopping_orders_customer_select on public.shopping_orders;
drop policy if exists users_can_view_own_orders on public.shopping_orders;
drop policy if exists shopping_orders_select_own_or_admin on public.shopping_orders;
create policy shopping_orders_select_own_or_admin on public.shopping_orders for select to authenticated using(auth.uid()=coalesce(user_id,customer_id) or public.is_admin());
drop policy if exists shopping_orders_customer_insert on public.shopping_orders;
drop policy if exists users_can_create_own_orders on public.shopping_orders;
drop policy if exists shopping_orders_insert_own on public.shopping_orders;
drop policy if exists shopping_orders_update_admin on public.shopping_orders;
create policy shopping_orders_update_admin on public.shopping_orders for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists shopping_order_items_select_own_or_admin on public.shopping_order_items;
create policy shopping_order_items_select_own_or_admin on public.shopping_order_items for select to authenticated using(exists(select 1 from public.shopping_orders o where o.id=shopping_order_items.order_id and (auth.uid()=coalesce(o.user_id,o.customer_id) or public.is_admin())));

insert into public.app_settings(key,value) values('shopping_margin_percent',15) on conflict(key) do nothing;

create or replace function public.get_shopping_margin_percent() returns numeric language sql stable security definer set search_path=public,pg_temp as $$ select coalesce((select value from public.app_settings where key='shopping_margin_percent' limit 1),15)::numeric; $$;
revoke all on function public.get_shopping_margin_percent() from public;
grant execute on function public.get_shopping_margin_percent() to authenticated;

create or replace function public.get_shein_quote(p_product_price_usd numeric,p_shipping_usd numeric default 0,p_quantity integer default 1) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_rate numeric; v_margin numeric; v_total_usd numeric; v_total_iqd numeric; v_margin_iqd numeric; v_final numeric;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 if p_product_price_usd is null or p_product_price_usd<=0 then raise exception 'Product price must be greater than zero'; end if;
 if coalesce(p_shipping_usd,0)<0 then raise exception 'Shipping cannot be negative'; end if;
 if coalesce(p_quantity,1)<1 or p_quantity>100 then raise exception 'Quantity must be between 1 and 100'; end if;
 select rate into v_rate from public.exchange_rates where upper(base_currency)='USD' and upper(quote_currency)='IQD' and is_active=true order by created_at desc limit 1;
 if v_rate is null then select value into v_rate from public.app_settings where key='usd_iqd_rate' limit 1; end if;
 if v_rate is null or v_rate<=0 then raise exception 'USD/IQD exchange rate is not configured'; end if;
 v_margin:=public.get_shopping_margin_percent(); v_total_usd:=(p_product_price_usd+coalesce(p_shipping_usd,0))*p_quantity; v_total_iqd:=v_total_usd*v_rate; v_margin_iqd:=v_total_iqd*v_margin/100; v_final:=ceil((v_total_iqd+v_margin_iqd)/250)*250;
 return jsonb_build_object('product_price_usd',p_product_price_usd,'shipping_usd',coalesce(p_shipping_usd,0),'quantity',p_quantity,'total_usd',round(v_total_usd,2),'exchange_rate',v_rate,'total_iqd',round(v_total_iqd,0),'margin_percent',v_margin,'margin_iqd',round(v_margin_iqd,0),'final_price_iqd',v_final);
end;$$;
revoke all on function public.get_shein_quote(numeric,numeric,integer) from public;
grant execute on function public.get_shein_quote(numeric,numeric,integer) to authenticated;

create or replace function public.is_valid_transition(old_status text,new_status text) returns boolean language sql immutable set search_path=pg_catalog,public,pg_temp as $$ select case when old_status='pending_payment' and new_status='paid' then true when old_status='paid' and new_status='ordered_from_platform' then true when old_status='ordered_from_platform' and new_status='arrived_at_origin_warehouse' then true when old_status='arrived_at_origin_warehouse' and new_status='shipped_to_erbil' then true when old_status='shipped_to_erbil' and new_status='delivered' then true when new_status='cancelled' then true else false end; $$;

create or replace function public.enforce_status_flow() returns trigger language plpgsql set search_path=public,pg_catalog,pg_temp as $$ begin if old.status is not null and old.status<>new.status and not public.is_valid_transition(old.status,new.status) then raise exception 'Invalid status transition: % -> %',old.status,new.status; end if; new.updated_at=now(); return new; end; $$;
revoke all on function public.enforce_status_flow() from public,anon,authenticated;
drop trigger if exists trg_status_flow on public.shopping_orders;
create trigger trg_status_flow before update on public.shopping_orders for each row execute function public.enforce_status_flow();

create or replace function public.create_shein_order(p_product_url text,p_product_price_usd numeric,p_product_shipping_usd numeric default 0,p_quantity integer default 1,p_variant_info jsonb default null,p_idempotency_key text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user_id uuid:=auth.uid(); v_platform_id uuid; v_order_id uuid; v_shipment_id text; v_invoice_id uuid; v_quote jsonb; v_final_iqd numeric; v_total_usd numeric; v_rate numeric; v_margin numeric; v_invoice_number text; v_existing public.shopping_orders%rowtype; v_email text;
begin
 if v_user_id is null then raise exception 'Not authenticated'; end if;
 if p_product_url is null or p_product_url !~* '^https://([a-z0-9-]+\\.)?shein\\.com([/:?#].*)?$' then raise exception 'Invalid SHEIN URL'; end if;
 if p_product_price_usd is null or p_product_price_usd<=0 then raise exception 'Product price must be greater than zero'; end if;
 if coalesce(p_product_shipping_usd,0)<0 then raise exception 'Shipping cannot be negative'; end if;
 if coalesce(p_quantity,1)<1 or p_quantity>100 then raise exception 'Quantity must be between 1 and 100'; end if;
 if p_idempotency_key is not null then select * into v_existing from public.shopping_orders where idempotency_key=p_idempotency_key and user_id=v_user_id limit 1; if found then select si.id into v_invoice_id from public.shipment_invoices si where si.shipment_id=v_existing.shipment_id order by si.created_at desc limit 1; return jsonb_build_object('order_id',v_existing.id,'invoice_id',v_invoice_id,'final_price_iqd',v_existing.final_price_iqd,'shipment_id',v_existing.shipment_id,'status',v_existing.status,'idempotent',true); end if; end if;
 select id into v_platform_id from public.shopping_platforms where slug='shein' and is_active=true limit 1; if v_platform_id is null then raise exception 'SHEIN platform is not active'; end if;
 v_quote:=public.get_shein_quote(p_product_price_usd,p_product_shipping_usd,p_quantity); v_final_iqd:=(v_quote->>'final_price_iqd')::numeric; v_total_usd:=(v_quote->>'total_usd')::numeric; v_rate:=(v_quote->>'exchange_rate')::numeric; v_margin:=(v_quote->>'margin_percent')::numeric;
 select email into v_email from auth.users where id=v_user_id; v_shipment_id:='GC-SHOP-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
 insert into public.shipments(id,customer_email,customer_user_id,type,origin_key,dest_key,items_count,total_amount,paid_amount,transport_mode,operational_status,service_level,declared_value,declared_currency,source,notes) values(v_shipment_id,v_email,v_user_id,'shopping','shein','erbil',p_quantity,v_final_iqd,0,'air','pending','standard',v_total_usd,'USD','shopping','Shopping order — awaiting payment / platform purchase');
 insert into public.shopping_orders(user_id,customer_id,platform_id,marketplace,product_url,product_price,product_currency,delivery_price,delivery_currency,exchange_rate,exchange_rate_used,service_margin_percent,subtotal_usd,total_usd,final_price_iqd,shipment_id,status,idempotency_key) values(v_user_id,v_user_id,v_platform_id,'shein',p_product_url,p_product_price_usd,'USD',coalesce(p_product_shipping_usd,0),'USD',v_rate,v_rate,v_margin,p_product_price_usd*p_quantity,v_total_usd,v_final_iqd,v_shipment_id,'pending_payment',p_idempotency_key) returning id into v_order_id;
 update public.shipments set source_order_id=v_order_id where id=v_shipment_id;
 insert into public.shopping_order_items(order_id,product_url,product_price_usd,product_shipping_usd,quantity,variant_info) values(v_order_id,p_product_url,p_product_price_usd,coalesce(p_product_shipping_usd,0),p_quantity,p_variant_info);
 v_invoice_number:='GC-SHOP-'||upper(substr(replace(v_order_id::text,'-',''),1,12));
 insert into public.shipment_invoices(invoice_number,shipment_id,customer_user_id,line_items,subtotal,discount,tax,total,paid_total,currency,status,issued_at) values(v_invoice_number,v_shipment_id,v_user_id,jsonb_build_array(jsonb_build_object('type','shopping','marketplace','SHEIN','product_url',p_product_url,'subtotal_iqd',v_final_iqd)),v_final_iqd,0,0,v_final_iqd,0,'IQD','issued',now()) returning id into v_invoice_id;
 return jsonb_build_object('order_id',v_order_id,'invoice_id',v_invoice_id,'final_price_iqd',v_final_iqd,'shipment_id',v_shipment_id,'status','pending_payment','idempotent',false);
end;$$;
revoke all on function public.create_shein_order(text,numeric,numeric,integer,jsonb,text) from public;
grant execute on function public.create_shein_order(text,numeric,numeric,integer,jsonb,text) to authenticated;

create or replace function public.sync_shopping_payment_session() returns trigger language plpgsql set search_path=public,pg_catalog,pg_temp as $$ declare v_order_id uuid; begin select so.id into v_order_id from public.shipment_invoices si join public.shopping_orders so on so.shipment_id=si.shipment_id where si.id=new.invoice_id order by so.created_at desc limit 1; if v_order_id is not null then update public.shopping_orders set payment_session_id=new.id,status=case when new.status='succeeded' and status='pending_payment' then 'paid' else status end,updated_at=now() where id=v_order_id; end if; return new; end; $$;
revoke all on function public.sync_shopping_payment_session() from public,anon,authenticated;
drop trigger if exists trg_sync_shopping_payment_session on public.payment_sessions;
create trigger trg_sync_shopping_payment_session after insert or update of status,invoice_id on public.payment_sessions for each row execute function public.sync_shopping_payment_session();

create or replace function public.admin_update_shopping_status(p_order_id uuid,p_new_status text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare v_order public.shopping_orders%rowtype; v_shipment_id text; begin if not public.is_admin() then raise exception 'Not admin'; end if; select * into v_order from public.shopping_orders where id=p_order_id for update; if not found then raise exception 'Order not found'; end if; if not public.is_valid_transition(v_order.status,p_new_status) then raise exception 'Invalid transition % -> %',v_order.status,p_new_status; end if; v_shipment_id:=v_order.shipment_id; if p_new_status='ordered_from_platform' then update public.shipments set operational_status='pending',notes='Purchased from SHEIN; awaiting origin warehouse receipt' where id=v_shipment_id; elsif p_new_status='arrived_at_origin_warehouse' then update public.shipments set operational_status='in_transit',current_location_label='Origin warehouse' where id=v_shipment_id; elsif p_new_status='shipped_to_erbil' then update public.shipments set operational_status='in_transit',current_location_label='In transit to Erbil',origin_hub='SHEIN / Origin Warehouse',destination_hub='Erbil' where id=v_shipment_id; update public.shopping_orders set tracking_number=v_shipment_id where id=p_order_id; elsif p_new_status='delivered' then update public.shipments set operational_status='delivered',current_location_label='Erbil — Delivered' where id=v_shipment_id; end if; update public.shopping_orders set status=p_new_status,updated_at=now() where id=p_order_id; return jsonb_build_object('order_id',p_order_id,'new_status',p_new_status,'shipment_id',v_shipment_id); end; $$;
revoke all on function public.admin_update_shopping_status(uuid,text) from public;
grant execute on function public.admin_update_shopping_status(uuid,text) to authenticated;
