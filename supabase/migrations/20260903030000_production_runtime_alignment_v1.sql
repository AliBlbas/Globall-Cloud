-- Globall Cloud production runtime alignment.
-- Captures the final runtime contract for tracking, shopping, customer stats,
-- and anonymous-session isolation so future db pushes do not drift.

create or replace view public.customer_directory_stats
with (security_invoker = true)
as
select
  d.id as directory_customer_id,
  count(s.id) as shipment_count,
  coalesce(sum(s.total_amount), 0) as total_amount,
  coalesce(sum(s.paid_amount), 0) as paid_amount,
  coalesce(sum(greatest(coalesce(s.total_amount, 0) - coalesce(s.paid_amount, 0), 0)), 0) as outstanding,
  max(s.created_at) as last_shipment_at
from public.customer_directory d
left join public.shipments s on s.directory_customer_id = d.id
group by d.id;

grant select on public.customer_directory_stats to authenticated, service_role;
revoke all on public.customer_directory_stats from anon;

create or replace function public.create_shein_order(
  p_product_url text,
  p_product_price_usd numeric,
  p_product_shipping_usd numeric default 0,
  p_quantity integer default 1,
  p_variant_info jsonb default null,
  p_idempotency_key text default null
)
returns jsonb
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.create_shein_order_impl(
    p_product_url,p_product_price_usd,p_product_shipping_usd,
    p_quantity,p_variant_info,p_idempotency_key
  );
$$;
revoke all on function public.create_shein_order(text,numeric,numeric,integer,jsonb,text) from public, anon;
grant execute on function public.create_shein_order(text,numeric,numeric,integer,jsonb,text) to authenticated;

create or replace function private.create_shein_order_impl(
  p_product_url text,
  p_product_price_usd numeric,
  p_product_shipping_usd numeric default 0,
  p_quantity integer default 1,
  p_variant_info jsonb default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_customer_gc text;
  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
  v_platform_id uuid;
  v_order_id uuid;
  v_shipment_uuid uuid;
  v_tracking_id text;
  v_invoice_id uuid;
  v_quote jsonb;
  v_final_iqd numeric;
  v_total_usd numeric;
  v_total_iqd numeric;
  v_service_fee_iqd bigint;
  v_rate numeric;
  v_margin numeric;
  v_invoice_number text;
  v_existing public.shopping_orders%rowtype;
  v_key text := nullif(trim(coalesce(p_idempotency_key,'')), '');
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  if p_product_url is null or p_product_url !~* '^https://([a-z0-9-]+\.)?shein\.com([/:?#].*)?$' then raise exception 'Invalid SHEIN URL'; end if;
  if p_product_price_usd is null or p_product_price_usd <= 0 then raise exception 'Product price must be greater than zero'; end if;
  if coalesce(p_product_shipping_usd, 0) < 0 then raise exception 'Shipping cannot be negative'; end if;
  if coalesce(p_quantity, 1) < 1 or p_quantity > 100 then raise exception 'Quantity must be between 1 and 100'; end if;

  if v_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || v_key, 0));
    select * into v_existing
    from public.shopping_orders
    where user_id = v_user_id and idempotency_key = v_key
    limit 1;
    if found then
      select si.id into v_invoice_id
      from public.shipment_invoices si
      where si.shipment_id = v_existing.shipment_id
      order by si.created_at desc
      limit 1;
      return jsonb_build_object('order_id',v_existing.id,'invoice_id',v_invoice_id,'final_price_iqd',v_existing.final_price_iqd,'shipment_id',v_existing.shipment_id,'status',v_existing.status,'idempotent',true);
    end if;
  end if;

  select sp.id into v_platform_id from public.shopping_platforms sp where sp.slug='shein' and sp.is_active=true limit 1;
  if v_platform_id is null then raise exception 'SHEIN platform is not active'; end if;

  select d.id,d.gc_code,d.name,d.phone,d.email
    into v_customer_id,v_customer_gc,v_customer_name,v_customer_phone,v_customer_email
  from public.customer_directory d
  where d.auth_user_id=v_user_id and d.is_active=true
  order by d.updated_at desc nulls last,d.created_at desc
  limit 1;

  if v_customer_email is null then
    select u.email into v_customer_email from auth.users u where u.id=v_user_id;
  end if;

  v_quote := private.get_shein_quote_impl(p_product_price_usd,p_product_shipping_usd,p_quantity);
  v_final_iqd := (v_quote->>'final_price_iqd')::numeric;
  v_total_usd := (v_quote->>'total_usd')::numeric;
  v_rate := (v_quote->>'exchange_rate')::numeric;
  v_margin := (v_quote->>'margin_percent')::numeric;
  v_total_iqd := round(v_total_usd*v_rate,0);
  v_service_fee_iqd := greatest(0,round(v_final_iqd-v_total_iqd))::bigint;

  v_shipment_uuid := gen_random_uuid();
  v_tracking_id := 'GC-SHOP-' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  insert into public.shipments(
    id,tracking_id,route,type,status,transport_mode,origin_warehouse,destination_warehouse,
    customer_gc_code,customer_user_id,customer_name,customer_phone,customer_email,
    directory_customer_id,cargo_description,carton_count,notes,origin_key,dest_key,
    items_count,total_amount,paid_amount,current_step_index,step_dates,step_photos,
    operational_status,branch,priority,service_level,currency,tracking_updated_at,state_version
  ) values (
    v_shipment_uuid,v_tracking_id,'SHEIN → Erbil','shopping','pending','air','SHEIN','Erbil',
    v_customer_gc,v_user_id,v_customer_name,v_customer_phone,v_customer_email,
    v_customer_id,'SHEIN Buy-for-Me order',p_quantity,
    'Shopping order awaiting payment and platform purchase.','shein','erbil',p_quantity,v_final_iqd,0,0,
    jsonb_build_object('placed',now()),'[]'::jsonb,'pending','all','normal','standard','IQD',now(),1
  );

  insert into public.shopping_orders(
    user_id,customer_id,platform_id,marketplace,product_url,product_price,product_currency,
    delivery_price,delivery_currency,exchange_rate,exchange_rate_used,service_margin_percent,
    service_fee_iqd,subtotal_usd,total_usd,final_price_iqd,shipment_id,status,idempotency_key
  ) values (
    v_user_id,v_customer_id,v_platform_id,'shein',p_product_url,p_product_price_usd,'USD',
    coalesce(p_product_shipping_usd,0),'USD',v_rate,v_rate,v_margin,v_service_fee_iqd,
    p_product_price_usd*p_quantity,v_total_usd,v_final_iqd,v_tracking_id,'pending_payment',v_key
  ) returning id into v_order_id;

  update public.shipments set external_reference=v_order_id::text, notes='Shopping order '||v_order_id::text||' — awaiting payment / platform purchase' where id=v_shipment_uuid;

  insert into public.shopping_order_items(order_id,product_url,product_title,product_price_usd,product_shipping_usd,quantity,variant_info)
  values(v_order_id,p_product_url,'SHEIN item',p_product_price_usd,coalesce(p_product_shipping_usd,0),p_quantity,p_variant_info);

  v_invoice_number := 'GC-SHOP-'||upper(substr(replace(v_order_id::text,'-',''),1,12));
  insert into public.shipment_invoices(invoice_number,shipment_id,customer_user_id,line_items,subtotal,discount,tax,total,paid_total,currency,status,issued_at)
  values(
    v_invoice_number,v_tracking_id,v_user_id,
    jsonb_build_array(
      jsonb_build_object('type','product_and_shipping','description','SHEIN product + delivery','amount_iqd',v_total_iqd),
      jsonb_build_object('type','service_fee','description','Globall Cloud service fee','amount_iqd',v_service_fee_iqd)
    ),
    v_final_iqd,0,0,v_final_iqd,0,'IQD','issued',now()
  ) returning id into v_invoice_id;

  return jsonb_build_object('order_id',v_order_id,'invoice_id',v_invoice_id,'final_price_iqd',v_final_iqd,'service_fee_iqd',v_service_fee_iqd,'total_iqd',v_total_iqd,'shipment_id',v_tracking_id,'tracking_id',v_tracking_id,'status','pending_payment','idempotent',false);
end;
$$;
revoke all on function private.create_shein_order_impl(text,numeric,numeric,integer,jsonb,text) from public,anon;
grant execute on function private.create_shein_order_impl(text,numeric,numeric,integer,jsonb,text) to authenticated,service_role;

create or replace function private.admin_update_shopping_status_impl(p_order_id uuid,p_new_status text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare
  v_order public.shopping_orders%rowtype;
  v_shipment public.shipments%rowtype;
  v_staff public.staff%rowtype;
  v_status text:=lower(trim(p_new_status));
begin
  if not private.is_admin() then raise exception 'Not admin'; end if;
  if p_order_id is null then raise exception 'Order id is required'; end if;
  if v_status not in ('pending_payment','paid','ordered_from_platform','arrived_at_origin_warehouse','shipped_to_erbil','delivered','cancelled') then raise exception 'Unsupported status'; end if;
  select * into v_order from public.shopping_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if not public.is_valid_transition(v_order.status,v_status) then raise exception 'Invalid transition % -> %',v_order.status,v_status; end if;
  select * into v_shipment from public.shipments s where s.id::text=v_order.shipment_id or s.tracking_id=v_order.shipment_id order by case when s.id::text=v_order.shipment_id then 0 else 1 end limit 1 for update;
  if not found then raise exception 'Shipment not found'; end if;
  select * into v_staff from public.staff where id=auth.uid() limit 1;
  update public.shipments set
    status=case when v_status='pending_payment' then 'pending' else v_status end,
    operational_status=case when v_status in ('pending_payment','paid','ordered_from_platform') then 'pending' when v_status in ('arrived_at_origin_warehouse','shipped_to_erbil') then 'in_transit' when v_status='delivered' then 'delivered' when v_status='cancelled' then 'cancelled' else operational_status end,
    current_step_index=case when v_status in ('pending_payment','paid') then 0 when v_status='ordered_from_platform' then 1 when v_status='arrived_at_origin_warehouse' then 2 when v_status='shipped_to_erbil' then 3 when v_status='delivered' then 5 else current_step_index end,
    current_location_label=case when v_status in ('pending_payment','paid') then 'Awaiting purchase' when v_status='ordered_from_platform' then 'SHEIN / Origin Warehouse' when v_status='arrived_at_origin_warehouse' then 'Origin warehouse' when v_status='shipped_to_erbil' then 'In transit to Erbil' when v_status='delivered' then 'Erbil — Delivered' when v_status='cancelled' then 'Cancelled' else current_location_label end,
    tracking_updated_at=now(),updated_at=now()
  where id=v_shipment.id;
  if v_status='shipped_to_erbil' then
    update public.shipments set origin_hub='SHEIN / Origin Warehouse',destination_hub='Erbil' where id=v_shipment.id;
    update public.shopping_orders set tracking_number=v_shipment.tracking_id where id=p_order_id;
  end if;
  update public.shopping_orders set status=v_status,updated_at=now() where id=p_order_id;
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details)
  values(auth.uid(),coalesce(v_staff.full_name,v_staff.email,'Staff'),'update_shopping_order_status',p_order_id::text,jsonb_build_object('from',v_order.status,'to',v_status,'shipment_uuid',v_shipment.id::text,'tracking_id',v_shipment.tracking_id)::text);
  return jsonb_build_object('order_id',p_order_id,'new_status',v_status,'shipment_id',v_shipment.id::text,'tracking_id',v_shipment.tracking_id);
end;
$$;
revoke all on function private.admin_update_shopping_status_impl(uuid,text) from public,anon;
grant execute on function private.admin_update_shopping_status_impl(uuid,text) to authenticated,service_role;

create or replace function public.admin_update_shopping_status(p_order_id uuid,p_new_status text)
returns jsonb language sql security invoker set search_path=public,private,pg_temp as $$ select private.admin_update_shopping_status_impl(p_order_id,p_new_status); $$;
revoke all on function public.admin_update_shopping_status(uuid,text) from public,anon;
grant execute on function public.admin_update_shopping_status(uuid,text) to authenticated;

-- Anonymous Supabase sessions are not allowed direct access to business tables.
do $$
declare r record;
begin
  for r in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity=true and exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname and 'authenticated'=any(p.roles)) loop
    if not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=r.relname and p.policyname='gc_block_anonymous') then
      execute format('create policy gc_block_anonymous on public.%I as restrictive for all to authenticated using ((select private.is_real_authenticated_session())) with check ((select private.is_real_authenticated_session()))',r.relname);
    end if;
  end loop;
end $$;

-- Legacy tables: only server APIs write; direct authenticated reads are kept only
-- where the application already relies on scoped shipment/receipt reads.
alter table public.customers enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.settings enable row level security;
alter table public.shipments enable row level security;
alter table public.warehouse_receipts enable row level security;
revoke all on table public.customers,public.exchange_rates,public.finance_transactions,public.pricing_rules,public.settings from anon,authenticated;
revoke all on table public.shipments,public.warehouse_receipts from anon;
grant select on table public.shipments,public.warehouse_receipts to authenticated;
revoke insert,update,delete,truncate,references,trigger on table public.shipments,public.warehouse_receipts from authenticated;

do $$
declare r record;
begin
  for r in select * from (values ('customers'::text),('exchange_rates'::text),('finance_transactions'::text),('pricing_rules'::text),('settings'::text)) t(table_name) loop
    execute format('drop policy if exists gc_server_only on public.%I',r.table_name);
    execute format('create policy gc_server_only on public.%I as restrictive for all to anon,authenticated using (false) with check (false)',r.table_name);
  end loop;
end $$;

drop policy if exists shipments_legacy_staff_select on public.shipments;
drop policy if exists shipments_legacy_customer_select on public.shipments;
drop policy if exists shipments_legacy_select on public.shipments;
create policy shipments_legacy_select on public.shipments as permissive for select to authenticated using (
  (select private.is_active_staff((select auth.uid())))
  or customer_user_id=(select auth.uid())
  or exists (select 1 from public.customer_directory d where d.id=shipments.directory_customer_id and d.auth_user_id=(select auth.uid()) and d.is_active=true)
);

drop policy if exists warehouse_receipts_legacy_staff_select on public.warehouse_receipts;
drop policy if exists warehouse_receipts_legacy_customer_select on public.warehouse_receipts;
drop policy if exists warehouse_receipts_legacy_select on public.warehouse_receipts;
create policy warehouse_receipts_legacy_select on public.warehouse_receipts as permissive for select to authenticated using (
  (select private.is_active_staff((select auth.uid())))
  or exists (select 1 from public.customer_directory d where d.id=warehouse_receipts.directory_customer_id and d.auth_user_id=(select auth.uid()) and d.is_active=true)
);
