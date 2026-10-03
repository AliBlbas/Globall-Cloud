begin;

-- The user-selected service policy is Erbil office pickup only (09:00–17:00).
update public.customer_delivery_options set is_active=(id='office') where is_active is distinct from (id='office');

-- Dubai Air is charged per item, matching the customer-facing rate card.
-- Keep the legacy compatibility columns aligned for older readers.
update public.pricing_rates
set unit='item',
    price_usd=amount,
    transport_type='Air',
    updated_at=now(),
    notes=coalesce(nullif(notes,''),'Dubai Air is charged per item.')
where coalesce(is_active,true)=true
  and lower(coalesce(origin_key,'')) in ('dubai','uae')
  and lower(coalesce(destination_key,''))='erbil'
  and lower(coalesce(transport_mode,''))='air';

-- Store the Shein >100kg discount as a real selectable staff-managed price row.
do $$
begin
  if exists (select 1 from public.pricing_rates where rate_key='dubai_erbil_land_shein_over_100kg' limit 1) then
    update public.pricing_rates
    set origin='Dubai', destination='Erbil', transport_type='Land', item_category='Shein >100kg',
        price_usd=1.25, origin_key='dubai', destination_key='erbil', transport_mode='land',
        product_type='Shein >100kg', unit='kg', amount=1.25, currency='USD', is_active=true,
        notes='Shein discount rate applies only when the shipment weight exceeds 100 kg.', updated_at=now()
    where rate_key='dubai_erbil_land_shein_over_100kg';
  else
    insert into public.pricing_rates (
      origin,destination,transport_type,item_category,price_usd,estimated_days,
      rate_key,origin_key,destination_key,transport_mode,product_type,unit,amount,currency,
      effective_from,is_active,notes
    ) values (
      'Dubai','Erbil','Land','Shein >100kg',1.25,null,
      'dubai_erbil_land_shein_over_100kg','dubai','erbil','land','Shein >100kg','kg',1.25,'USD',
      current_date,true,'Shein discount rate applies only when the shipment weight exceeds 100 kg.'
    );
  end if;
end $$;

-- Main canonical calculator. Unit is read from pricing_rates, so every client uses the same basis.
create or replace function public.calculate_logistics_price(
  p_origin_key text,
  p_destination_key text,
  p_transport_mode text,
  p_product_type text,
  p_weight_kg numeric,
  p_volume_cbm numeric,
  p_rate_key text,
  p_items_count integer
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
  v_units numeric;
  v_unit text;
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
  if p_items_count is not null and (p_items_count<0 or p_items_count>1000000) then raise exception 'Invalid item count'; end if;

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
    where coalesce(r.is_active,true)=true
      and lower(r.origin_key)='china' and lower(r.destination_key)='erbil' and lower(r.transport_mode)='sea'
      and (r.effective_from is null or r.effective_from<=current_date) and (r.effective_to is null or r.effective_to>=current_date)
      and (p_rate_key is null or r.rate_key=p_rate_key)
      and (lower(coalesce(r.unit,'')) in ('cbm','meter','per cbm') or lower(coalesce(r.product_type,'')) like '%container%')
    order by r.effective_from desc nulls last,r.created_at desc nulls last limit 1;
  else
    if v_origin='UAE' and v_mode='air' then
      if p_items_count is null or p_items_count<=0 then raise exception 'Positive item count is required for Dubai Air'; end if;
    elsif p_weight_kg is null or p_weight_kg<=0 then
      raise exception 'Positive weight is required for air or land cargo';
    end if;
    select * into v_rate from public.pricing_rates r
    where coalesce(r.is_active,true)=true
      and lower(r.destination_key)='erbil'
      and (lower(r.origin_key)=lower(v_origin) or (v_origin='UAE' and lower(r.origin_key) in ('uae','dubai')) or (v_origin='USA' and lower(r.origin_key) in ('usa','us')))
      and lower(r.transport_mode)=v_mode
      and (r.effective_from is null or r.effective_from<=current_date) and (r.effective_to is null or r.effective_to>=current_date)
      and (p_rate_key is null or r.rate_key=p_rate_key)
      and (
        p_rate_key is not null or
        case v_origin
          when 'China' then case when v_type in ('battery','patry','pattery') then lower(r.product_type) like '%battery%'
            when v_type in ('screen','display','monitor','shasha','screendisplay') or v_type like 'screen%' then lower(r.product_type) like '%screen%'
            else lower(r.product_type) like '%general%' or lower(r.product_type) like '%normal%' or lower(r.product_type) like '%no battery%' end
          when 'USA' then lower(r.product_type) like '%general%'
          when 'UAE' then case
            when v_mode='land' and (v_type like '%shein%' or v_type like '%clothes%' or v_type like '%shoes%') and p_weight_kg>100 then lower(r.product_type) like '%shein%100%'
            when v_mode='land' and (v_type like '%shein%' or v_type like '%clothes%' or v_type like '%shoes%') then lower(r.product_type) like '%shoes%' or lower(r.product_type) like '%clothes%'
            when v_mode='land' and (v_type like '%cosmetic%' or v_type like '%electronic%') then lower(r.product_type) like '%cosmetic%' or lower(r.product_type) like '%electronic%'
            when v_mode='land' and (v_type like '%perfume%' or v_type like '%iherb%') then lower(r.product_type) like '%perfume%' or lower(r.product_type) like '%iherb%'
            when v_mode='air' and v_type in ('accessories','accessory') then lower(r.product_type) like '%accessories%'
            when v_mode='air' and v_type in ('android','androidphone') then lower(r.product_type) like '%android%'
            when v_mode='air' and v_type in ('camera','cam') then lower(r.product_type) like '%camera%'
            when v_mode='air' and (v_type like '%iphone%' or v_type like '%s25%' or v_type like '%s26%') then lower(r.product_type) like '%iphone 17%' or lower(r.product_type) like '%s25%' or lower(r.product_type) like '%s26%'
            when v_mode='air' and v_type in ('usediphone','used') then lower(r.product_type) like '%used iphone%'
            when v_mode='air' and v_type in ('laptop','labtop') then lower(r.product_type) like '%laptop%'
            when v_mode='air' and v_type in ('playstation','ps') then lower(r.product_type) like '%playstation%'
            when v_mode='air' and v_type in ('tablet','tab') then lower(r.product_type) like '%tablet%'
            else false end
          else false
        end
      )
    order by r.effective_from desc nulls last,r.created_at desc nulls last limit 1;
  end if;
  if v_rate.id is null then raise exception 'No active rate configured for the requested route/category'; end if;
  if v_rate.rate_key='dubai_erbil_land_shein_over_100kg' and (v_origin<>'UAE' or v_mode<>'land' or p_weight_kg is null or p_weight_kg<=100) then
    raise exception 'Shein discount rate requires Dubai Land cargo above 100 kg';
  end if;

  v_unit:=lower(coalesce(v_rate.unit,case when v_mode='sea' then 'cbm' else 'kg' end));
  if v_mode='sea' then v_units:=p_volume_cbm;
  elsif v_unit in ('item','items','piece','pieces','unit','units') then
    if p_items_count is null or p_items_count<=0 then raise exception 'Positive item count is required'; end if;
    v_units:=p_items_count;
  else
    v_units:=p_weight_kg;
  end if;
  v_usd:=v_rate.amount*v_units;
  if v_usd < (v_min_iqd/v_fx) then
    v_iqd:=round(v_min_iqd,0);
    v_usd:=round(v_min_iqd/v_fx,4);
  else
    v_iqd:=round(v_usd*v_fx,0);
  end if;
  return jsonb_build_object(
    'ok',true,'minimum_applied',v_iqd=round(v_min_iqd,0),'rate_key',v_rate.rate_key,
    'product_type',v_rate.product_type,'unit',v_unit,'rate_usd',v_rate.amount,
    'billable_units',v_units,'items_count',case when v_unit in ('item','items','piece','pieces','unit','units') then p_items_count else null end,
    'usd',round(v_usd,2),'iqd',v_iqd,'currency','IQD','exchange_rate',v_fx,
    'origin_key',v_origin,'destination_key',v_dest,'transport_mode',v_mode,
    'weight_kg',p_weight_kg,'volume_cbm',p_volume_cbm,
    'transit_min_days',v_rate.transit_min_days,'transit_max_days',v_rate.transit_max_days
  );
end;
$$;

-- Keep existing 7-argument callers working, while new callers pass p_items_count explicitly.
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
language sql
security definer
set search_path=public,pg_catalog,pg_temp
as $$
  select public.calculate_logistics_price($1,$2,$3,$4,$5,$6,$7,null::integer);
$$;

revoke all on function public.calculate_logistics_price(text,text,text,text,numeric,numeric,text,integer) from public,anon,authenticated;
revoke all on function public.calculate_logistics_price(text,text,text,text,numeric,numeric,text) from public,anon,authenticated;
grant execute on function public.calculate_logistics_price(text,text,text,text,numeric,numeric,text,integer) to service_role;
grant execute on function public.calculate_logistics_price(text,text,text,text,numeric,numeric,text) to service_role;

commit;
