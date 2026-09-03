create extension if not exists pgcrypto;

/* ---------- Customer identity ---------- */
alter table public.customer_directory
  add column if not exists whatsapp_group_name text,
  add column if not exists whatsapp_group_id text,
  add column if not exists purchase_first_name text,
  add column if not exists purchase_last_name text;

create unique index if not exists customer_directory_whatsapp_group_name_uq
on public.customer_directory(whatsapp_group_name)
where whatsapp_group_name is not null and btrim(whatsapp_group_name) <> '';

create or replace function public.normalize_customer_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare v_code text;
begin
  v_code := upper(trim(coalesce(new.gc_code,new.code,'')));
  if v_code = '' then raise exception 'GC customer code is required'; end if;
  if v_code !~ '^GC-[0-9]+$' then raise exception 'Customer code must match GC-<number>'; end if;
  new.gc_code := v_code;
  new.normalized_gc_code := v_code;
  new.purchase_first_name := replace(v_code,'GC-','Gc-');
  new.purchase_last_name := nullif(trim(new.name),'');
  if nullif(trim(new.whatsapp_group_name),'') is null then new.whatsapp_group_name := replace(v_code,'GC-','Gc-'); end if;
  return new;
end;
$$;

drop trigger if exists trg_customer_identity_contract on public.customer_directory;
create trigger trg_customer_identity_contract
before insert or update of gc_code,name,whatsapp_group_name
on public.customer_directory
for each row execute function public.normalize_customer_identity();

update public.customer_directory d
set whatsapp_group_name = coalesce(nullif(trim(d.whatsapp_group_name),''), replace(upper(trim(d.gc_code)),'GC-','Gc-')),
    purchase_first_name = replace(upper(trim(d.gc_code)),'GC-','Gc-'),
    purchase_last_name = nullif(trim(d.name),'')
where d.gc_code is not null;

/* ---------- Shopping purchase identity ---------- */
alter table public.shopping_orders
  add column if not exists customer_first_name text,
  add column if not exists customer_last_name text,
  add column if not exists customer_whatsapp text,
  add column if not exists customer_whatsapp_group text;

create or replace function public.sync_shopping_order_customer_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare d record;
begin
  if new.customer_id is not null then
    select gc_code,name,phone,phone2,whatsapp_phone,whatsapp_group_name into d from public.customer_directory where id=new.customer_id;
  elsif new.user_id is not null then
    select gc_code,name,phone,phone2,whatsapp_phone,whatsapp_group_name into d from public.customer_directory where auth_user_id=new.user_id and is_active=true order by updated_at desc nulls last,created_at desc limit 1;
  end if;
  if d.gc_code is not null then
    new.customer_first_name := replace(upper(trim(d.gc_code)),'GC-','Gc-');
    new.customer_last_name := nullif(trim(d.name),'');
    new.customer_whatsapp := coalesce(d.whatsapp_phone,d.phone,d.phone2);
    new.customer_whatsapp_group := d.whatsapp_group_name;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_shopping_order_customer_identity on public.shopping_orders;
create trigger trg_sync_shopping_order_customer_identity
before insert or update of customer_id,user_id
on public.shopping_orders
for each row execute function public.sync_shopping_order_customer_identity();

update public.shopping_orders so
set customer_first_name = replace(upper(trim(d.gc_code)),'GC-','Gc-'),
    customer_last_name = nullif(trim(d.name),''),
    customer_whatsapp = coalesce(d.whatsapp_phone,d.phone,d.phone2),
    customer_whatsapp_group = d.whatsapp_group_name
from public.customer_directory d
where so.customer_id=d.id;

/* ---------- Warehouse master data ---------- */
alter table public.warehouse_locations
  add column if not exists building_number text,
  add column if not exists purpose text,
  add column if not exists delivery_available boolean not null default false,
  add column if not exists pickup_open time,
  add column if not exists pickup_close time,
  add column if not exists timezone text not null default 'Asia/Baghdad';

create table if not exists public.warehouse_private_details (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null unique references public.warehouse_locations(id) on delete cascade,
  access_code text,
  contact_phone_2 text,
  contact_role_2 text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.warehouse_private_details enable row level security;
grant select on public.warehouse_private_details to authenticated;
drop policy if exists warehouse_private_staff_read on public.warehouse_private_details;
create policy warehouse_private_staff_read on public.warehouse_private_details for select to authenticated using (exists (select 1 from public.staff s where s.id=(select auth.uid()) and s.is_active=true));
revoke insert,update,delete,truncate,references,trigger on public.warehouse_private_details from anon,authenticated;

insert into public.warehouse_locations (code,country_code,city,name,address_line,building_number,postal_code,contact_phone,purpose,delivery_available,pickup_open,pickup_close,timezone,is_active)
values
('AE-DXB','AE','Dubai','GLOBAL CLOUD company','Dubai, Deira, Al Khabaisi, Street 6A.','Dubai-Deira-AlKhabaisi-6A street-Global cloud company','50819','+971 507206201','Main gateway warehouse',false,null,null,'Asia/Dubai',true),
('CN-FS-GENERAL','CN','Foshan','Global Cloud China Warehouse — General / Sea','佛山市南海区里水镇共同孔东村东街一巷 2号，启梦芯华创意园 A6仓.','',null,'15818124096','General goods / Sea cargo',false,null,null,'Asia/Shanghai',true),
('CN-FS-AIR','CN','Foshan','Global Cloud China Warehouse — Air','广东省佛山市南海区里水镇草场海南州工业区32号 B区 212号-2459.','',null,'18128741185','Air cargo',false,null,null,'Asia/Shanghai',true),
('IQ-EBL','IQ','Erbil','Global Cloud Erbil Office / Pickup','Erbil, Kurdistan Region, Iraq.','',null,null,'Customer pickup only',false,'09:00','17:00','Asia/Baghdad',true)
on conflict (code) do update set name=excluded.name,address_line=excluded.address_line,building_number=excluded.building_number,postal_code=excluded.postal_code,contact_phone=excluded.contact_phone,purpose=excluded.purpose,delivery_available=excluded.delivery_available,pickup_open=excluded.pickup_open,pickup_close=excluded.pickup_close,timezone=excluded.timezone,is_active=true,updated_at=now();

update public.warehouse_locations set is_active=false,purpose='Legacy warehouse code; use CN-FS-GENERAL or CN-FS-AIR' where code='CN-GZ';

insert into public.warehouse_private_details (warehouse_id,access_code,contact_phone_2,contact_role_2,internal_notes)
select id,'Hacos-Damon','19157444035','Sofia — Office','General / sea warehouse access details.' from public.warehouse_locations where code='CN-FS-GENERAL'
on conflict (warehouse_id) do update set access_code=excluded.access_code,contact_phone_2=excluded.contact_phone_2,contact_role_2=excluded.contact_role_2,updated_at=now();

/* ---------- Operational policy registry ---------- */
create table if not exists public.logistics_operational_policies (
  policy_key text primary key,
  title_ku text not null,
  title_en text not null,
  value_json jsonb not null default '{}'::jsonb,
  enforced boolean not null default true,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.logistics_operational_policies enable row level security;
grant select on public.logistics_operational_policies to anon,authenticated;
drop policy if exists logistics_operational_policies_public_read on public.logistics_operational_policies;
create policy logistics_operational_policies_public_read on public.logistics_operational_policies for select to anon,authenticated using (enforced=true);
revoke insert,update,delete,truncate,references,trigger on public.logistics_operational_policies from anon,authenticated;

insert into public.logistics_operational_policies(policy_key,title_ku,title_en,value_json,enforced)
values
('medical_device_prohibited','کەلوپەلی پزیشکی قەدەغەیە','Medical equipment is prohibited','{"prohibited":true,"reason":"Medical equipment is not accepted."}',true),
('msds_required_battery_liquid','MSDS بۆ پاتری و شلە پێویستە','MSDS required for batteries or liquids','{"required":true}',true),
('delivery_unavailable','خزمەتگوزاری Delivery نییە','Delivery service is unavailable','{"available":false,"pickup_only":true}',true),
('erbil_pickup_hours','کاتی وەرگرتن لە ئۆفیسی هەولێر','Erbil pickup office hours','{"open":"09:00","close":"17:00","timezone":"Asia/Baghdad","days":"business_days"}',true)
on conflict (policy_key) do update set title_ku=excluded.title_ku,title_en=excluded.title_en,value_json=excluded.value_json,enforced=excluded.enforced,updated_at=now();

insert into public.app_settings(key,value) values('minimum_charge_iqd',5000) on conflict (key) do update set value=excluded.value,updated_at=now();

/* ---------- Centralized cargo compliance ---------- */
create or replace function public.validate_logistics_cargo(
  p_product_type text default null,
  p_has_battery boolean default false,
  p_has_liquid boolean default false,
  p_msds_provided boolean default false,
  p_medical_device boolean default false
)
returns jsonb language plpgsql security definer set search_path=public,pg_catalog,pg_temp as $$
declare v_type text:=lower(trim(coalesce(p_product_type,''))); v_banned boolean:=false; v_msds boolean:=false;
begin
  v_banned:=coalesce(p_medical_device,false) or v_type~'(medical|medicine|medication|surgical|clinic|hospital|پزیشک|دەرمان|نەشتەرگەری)';
  v_msds:=coalesce(p_has_battery,false) or coalesce(p_has_liquid,false);
  if v_banned then return jsonb_build_object('allowed',false,'code','MEDICAL_EQUIPMENT_PROHIBITED','message_ku','ئامێر و کەلوپەلی پزیشکی بە هیچ شێوەیەک وەرناگیرێت.','message_en','Medical equipment is not accepted.'); end if;
  if v_msds and not coalesce(p_msds_provided,false) then return jsonb_build_object('allowed',false,'code','MSDS_REQUIRED','message_ku','بۆ کاڵای پاتری یان شلە، MSDS پێویستە.','message_en','MSDS is required for cargo containing batteries or liquids.'); end if;
  return jsonb_build_object('allowed',true,'code','OK','message_ku','کاڵاکە لە ڕووی یاساکانی وەرگرتنەوەدا ڕێگەپێدراوە.','message_en','Cargo passes the current acceptance rules.');
end;
$$;
revoke all on function public.validate_logistics_cargo(text,boolean,boolean,boolean,boolean) from public;
grant execute on function public.validate_logistics_cargo(text,boolean,boolean,boolean,boolean) to anon,authenticated,service_role;

/* ---------- Authoritative logistics pricing ---------- */
create or replace function public.calculate_logistics_price(
  p_origin_key text,
  p_destination_key text default 'Erbil',
  p_transport_mode text default 'air',
  p_product_type text default 'general',
  p_weight_kg numeric default null,
  p_volume_cbm numeric default null,
  p_rate_key text default null
)
returns jsonb language plpgsql security definer set search_path=public,pg_catalog,pg_temp as $$
declare
  v_origin text; v_dest text:='Erbil'; v_mode text:=lower(trim(coalesce(p_transport_mode,''))); v_type text:=lower(regexp_replace(trim(coalesce(p_product_type,'general')),'[ _/–—-]+','','g'));
  v_rate record; v_fx numeric; v_min_iqd numeric; v_usd numeric; v_iqd numeric;
begin
  v_origin:=case lower(trim(coalesce(p_origin_key,''))) when 'china' then 'China' when 'cn' then 'China' when 'foshan' then 'China' when 'guangzhou' then 'China' when 'dubai' then 'UAE' when 'uae' then 'UAE' when 'united arab emirates' then 'UAE' when 'unitedarabemirates' then 'UAE' when 'usa' then 'USA' when 'us' then 'USA' when 'america' then 'USA' else null end;
  if v_origin is null then raise exception 'Unsupported origin'; end if;
  if lower(trim(coalesce(p_destination_key,'erbil'))) not in ('erbil','hawler','hwr') then raise exception 'This pricing contract is currently for Erbil'; end if;
  if v_mode not in ('air','sea') then raise exception 'Pricing engine supports air and sea only'; end if;
  if p_weight_kg is not null and (p_weight_kg<0 or p_weight_kg>100000) then raise exception 'Invalid weight'; end if;
  if p_volume_cbm is not null and (p_volume_cbm<0 or p_volume_cbm>100000) then raise exception 'Invalid volume'; end if;
  if p_weight_kg is null and p_volume_cbm is null then raise exception 'Weight or volume is required'; end if;
  select value into v_min_iqd from public.app_settings where key='minimum_charge_iqd' limit 1;
  v_min_iqd:=coalesce(v_min_iqd,5000);
  select er.usd_to_iqd into v_fx from public.exchange_rates er where er.usd_to_iqd>0 order by er.created_at desc nulls last,er.effective_on desc nulls last limit 1;
  if v_fx is null then select value into v_fx from public.app_settings where key='usd_iqd_rate' limit 1; end if;
  if v_fx is null or v_fx<=0 then raise exception 'USD/IQD exchange rate is not configured'; end if;
  if p_weight_kg is not null and p_weight_kg>0 and p_weight_kg<1 then return jsonb_build_object('ok',true,'minimum_applied',true,'minimum_charge_iqd',round(v_min_iqd,0),'usd',round(v_min_iqd/v_fx,4),'iqd',round(v_min_iqd,0),'currency','IQD','exchange_rate',v_fx,'origin_key',v_origin,'destination_key',v_dest,'transport_mode',v_mode,'product_type',p_product_type); end if;
  if v_mode='sea' then
    if v_origin<>'China' then raise exception 'Sea rate is configured for China to Erbil only'; end if;
    if p_volume_cbm is null or p_volume_cbm<=0 then raise exception 'CBM volume is required for sea cargo'; end if;
    select * into v_rate from public.pricing_rates r where r.is_active=true and r.destination_key='Erbil' and r.origin_key='China' and r.transport_mode='sea' and (p_rate_key is null or r.rate_key=p_rate_key) and lower(r.unit) in ('cbm','meter','per cbm','per cbm ') order by r.effective_from desc,r.created_at desc limit 1;
  else
    if p_weight_kg is null or p_weight_kg<=0 then raise exception 'Weight is required for air cargo'; end if;
    select * into v_rate from public.pricing_rates r where r.is_active=true and r.destination_key='Erbil' and r.origin_key=v_origin and r.transport_mode='air' and (p_rate_key is null or r.rate_key=p_rate_key) and (
      p_rate_key is not null or
      case v_origin
        when 'China' then case when v_type in ('battery','patry','pattery') then lower(r.product_type) like '%battery%' when v_type in ('screen','display','monitor','shasha') then lower(r.product_type) like '%screen%' else lower(r.product_type) like '%general%' or lower(r.product_type) like '%normal%' or lower(r.product_type) like '%no battery%' end
        when 'USA' then lower(r.product_type) like '%general%'
        when 'UAE' then case when v_type in ('accessories','accessory') then lower(r.product_type) like '%accessories%' when v_type in ('android','androidphone') then lower(r.product_type) like '%android%' when v_type in ('camera','cam') then lower(r.product_type) like '%camera%' when v_type in ('iphone','iphone17','s25','s26','premiumphone') then lower(r.product_type) like '%iphone 17%' or lower(r.product_type) like '%s25%' when v_type in ('usediphone','used') then lower(r.product_type) like '%used iphone%' when v_type in ('laptop','labtop') then lower(r.product_type) like '%laptop%' when v_type in ('playstation','ps') then lower(r.product_type) like '%playstation%' when v_type in ('tablet','tab') then lower(r.product_type) like '%tablet%' else false end
        else false
      end
    ) order by r.effective_from desc,r.created_at desc limit 1;
  end if;
  if v_rate.id is null then raise exception 'No active rate configured for the requested route/category'; end if;
  if v_mode='sea' then v_usd:=v_rate.amount*p_volume_cbm; else v_usd:=v_rate.amount*p_weight_kg; end if;
  v_iqd:=round(v_usd*v_fx,0);
  return jsonb_build_object('ok',true,'minimum_applied',false,'rate_key',v_rate.rate_key,'product_type',v_rate.product_type,'unit',v_rate.unit,'rate_usd',v_rate.amount,'usd',round(v_usd,2),'iqd',v_iqd,'currency','IQD','exchange_rate',v_fx,'origin_key',v_origin,'destination_key',v_dest,'transport_mode',v_mode,'weight_kg',p_weight_kg,'volume_cbm',p_volume_cbm);
end;
$$;
revoke all on function public.calculate_logistics_price(text,text,text,text,numeric,numeric,text) from public;
grant execute on function public.calculate_logistics_price(text,text,text,text,numeric,numeric,text) to anon,authenticated,service_role;
