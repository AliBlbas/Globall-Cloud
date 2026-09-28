begin;

-- Fix the deployed pricing RPC: the live database has no effective_on column.
-- Keep the function compatible with the current exchange_rates/pricing_rates schema.
create or replace function public.calculate_logistics_price(
  p_origin_key text,
  p_destination_key text default 'Erbil',
  p_transport_mode text default 'air',
  p_product_type text default 'general',
  p_weight_kg numeric default null,
  p_volume_cbm numeric default null,
  p_rate_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog,pg_temp
as $$
declare
  v_origin text;
  v_dest text := 'Erbil';
  v_mode text := lower(trim(coalesce(p_transport_mode,'')));
  v_type text := lower(regexp_replace(trim(coalesce(p_product_type,'general')),'[ _/–—-]+','','g'));
  v_rate record;
  v_fx numeric;
  v_min_iqd numeric;
  v_usd numeric;
  v_iqd numeric;
begin
  v_origin := case lower(trim(coalesce(p_origin_key,'')))
    when 'china' then 'China' when 'cn' then 'China' when 'foshan' then 'China' when 'guangzhou' then 'China'
    when 'dubai' then 'UAE' when 'uae' then 'UAE' when 'united arab emirates' then 'UAE' when 'unitedarabemirates' then 'UAE'
    when 'usa' then 'USA' when 'us' then 'USA' when 'america' then 'USA' else null end;
  if v_origin is null then raise exception 'Unsupported origin'; end if;
  if lower(trim(coalesce(p_destination_key,'erbil'))) not in ('erbil','hawler','hwr') then raise exception 'This pricing contract is currently for Erbil'; end if;
  if v_mode not in ('air','sea','land') then raise exception 'Unsupported transport mode'; end if;
  if p_weight_kg is not null and (p_weight_kg<0 or p_weight_kg>100000) then raise exception 'Invalid weight'; end if;
  if p_volume_cbm is not null and (p_volume_cbm<0 or p_volume_cbm>100000) then raise exception 'Invalid volume'; end if;
  if p_weight_kg is null and p_volume_cbm is null then raise exception 'Weight or volume is required'; end if;

  select value into v_min_iqd from public.app_settings where key='minimum_charge_iqd' limit 1;
  v_min_iqd := coalesce(v_min_iqd,5000);
  select er.usd_to_iqd into v_fx
  from public.exchange_rates er
  where er.usd_to_iqd > 0
    and coalesce(er.is_active,true)=true
    and coalesce(er.base_currency,'USD')='USD'
    and coalesce(er.quote_currency,'IQD')='IQD'
    and (er.effective_from is null or er.effective_from <= current_date)
    and (er.effective_to is null or er.effective_to >= current_date)
  order by er.effective_from desc nulls last, er.updated_at desc nulls last, er.created_at desc nulls last
  limit 1;
  if v_fx is null then select value into v_fx from public.app_settings where key='usd_iqd_rate' limit 1; end if;
  if v_fx is null or v_fx<=0 then raise exception 'USD/IQD exchange rate is not configured'; end if;

  if v_mode='sea' then
    if v_origin<>'China' then raise exception 'Sea rate is configured for China to Erbil only'; end if;
    if p_volume_cbm is null or p_volume_cbm<=0 then raise exception 'CBM volume is required for sea cargo'; end if;
    select * into v_rate from public.pricing_rates r
    where r.is_active=true and lower(r.origin_key)='china' and lower(r.destination_key)='erbil' and lower(r.transport_mode)='sea'
      and (p_rate_key is null or r.rate_key=p_rate_key)
      and (lower(coalesce(r.unit,'')) in ('cbm','meter','per cbm') or lower(coalesce(r.product_type,'')) like '%container%')
    order by r.effective_from desc nulls last,r.created_at desc nulls last limit 1;
  else
    if p_weight_kg is null or p_weight_kg<=0 then raise exception 'Weight is required for air or land cargo'; end if;
    select * into v_rate from public.pricing_rates r
    where r.is_active=true and lower(r.destination_key)='erbil' and (lower(r.origin_key)=lower(v_origin) or (v_origin='UAE' and lower(r.origin_key) in ('uae','dubai')) or (v_origin='USA' and lower(r.origin_key) in ('usa','us'))) and lower(r.transport_mode)=v_mode
      and (p_rate_key is null or r.rate_key=p_rate_key)
      and (
        p_rate_key is not null or
        case v_origin
          when 'China' then case when v_type in ('battery','patry','pattery') then lower(r.product_type) like '%battery%'
            when v_type in ('screen','display','monitor','shasha') then lower(r.product_type) like '%screen%'
            else lower(r.product_type) like '%general%' or lower(r.product_type) like '%normal%' or lower(r.product_type) like '%no battery%' end
          when 'USA' then lower(r.product_type) like '%general%'
          when 'UAE' then case when v_mode='land' then true
            when v_type in ('accessories','accessory') then lower(r.product_type) like '%accessories%'
            when v_type in ('android','androidphone') then lower(r.product_type) like '%android%'
            when v_type in ('camera','cam') then lower(r.product_type) like '%camera%'
            when v_type in ('iphone','iphone17','s25','s26','premiumphone') then lower(r.product_type) like '%iphone 17%' or lower(r.product_type) like '%s25%'
            when v_type in ('usediphone','used') then lower(r.product_type) like '%used iphone%'
            when v_type in ('laptop','labtop') then lower(r.product_type) like '%laptop%'
            when v_type in ('playstation','ps') then lower(r.product_type) like '%playstation%'
            when v_type in ('tablet','tab') then lower(r.product_type) like '%tablet%'
            else false end
          else false
        end
      )
    order by case when v_mode='land' and v_type='general' then r.amount end asc nulls last, r.effective_from desc nulls last,r.created_at desc nulls last limit 1;
  end if;
  if v_rate.id is null then raise exception 'No active rate configured for the requested route/category'; end if;

  if v_mode='sea' then v_usd:=v_rate.amount*p_volume_cbm; else v_usd:=v_rate.amount*p_weight_kg; end if;
  if v_usd < (v_min_iqd/v_fx) then
    v_iqd:=round(v_min_iqd,0);
    v_usd:=round(v_min_iqd/v_fx,4);
  else
    v_iqd:=round(v_usd*v_fx,0);
  end if;
  return jsonb_build_object('ok',true,'minimum_applied',v_iqd=round(v_min_iqd,0),'rate_key',v_rate.rate_key,'product_type',v_rate.product_type,'unit',case when v_mode='sea' then 'cbm' else coalesce(v_rate.unit,'kg') end,'rate_usd',v_rate.amount,'usd',round(v_usd,2),'iqd',v_iqd,'currency','IQD','exchange_rate',v_fx,'origin_key',v_origin,'destination_key',v_dest,'transport_mode',v_mode,'weight_kg',p_weight_kg,'volume_cbm',p_volume_cbm);
end;
$$;
revoke all on function public.calculate_logistics_price(text,text,text,text,numeric,numeric,text) from public;
grant execute on function public.calculate_logistics_price(text,text,text,text,numeric,numeric,text) to anon,authenticated,service_role;

-- Seed the currently approved public catalog. Updates only the existing canonical rows.
update public.pricing_rates set amount=case
  when origin_key='china' and transport_mode='air' and product_type='General Cargo (No Battery/Screen)' then 9
  when origin_key='china' and transport_mode='air' and product_type='Screen/Display' then 12
  when origin_key='china' and transport_mode='air' and product_type='Battery' then 14
  when origin_key='china' and transport_mode='sea' then 300, unit='cbm'
  when origin_key='usa' and transport_mode='air' then 13
  when origin_key='dubai' and transport_mode='air' and product_type='Accessories' then 8.25
  when origin_key='dubai' and transport_mode='air' and product_type='Camera' then 11
  when origin_key='dubai' and transport_mode='air' and product_type='Tablet' then 8.5
  when origin_key='dubai' and transport_mode='air' and product_type='Used iPhone' then 15
  when origin_key='dubai' and transport_mode='air' and product_type='Android Phone' then 15
  when origin_key='dubai' and transport_mode='air' and product_type='iPhone 17 & Samsung S25/S26' then 22
  when origin_key='dubai' and transport_mode='air' and product_type='PlayStation' then 9.5
  when origin_key='dubai' and transport_mode='air' and product_type='Laptop' then 10.5
  when origin_key='dubai' and transport_mode='land' and product_type='Shoes & Clothes' then 1.5
  when origin_key='dubai' and transport_mode='land' and product_type='Cosmetics & Electronics' then 4
  when origin_key='dubai' and transport_mode='land' and product_type='iHerb & Perfume' then 12
  else amount end,
  unit=case when origin_key='china' and transport_mode='sea' then 'cbm' else unit end,
  updated_at=now()
where is_active=true;

commit;
