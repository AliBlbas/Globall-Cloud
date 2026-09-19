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
  v_origin text; v_dest text:='Erbil'; v_mode text:=lower(trim(coalesce(p_transport_mode,''))); v_type text:=lower(trim(coalesce(p_product_type,'general')));
  v_rate_key text; v_rate record; v_fx numeric; v_min_iqd numeric; v_usd numeric; v_iqd numeric;
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
  if p_weight_kg is not null and p_weight_kg>0 and p_weight_kg<1 then
    return jsonb_build_object('ok',true,'minimum_applied',true,'minimum_charge_iqd',round(v_min_iqd,0),'usd',round(v_min_iqd/v_fx,4),'iqd',round(v_min_iqd,0),'currency','IQD','exchange_rate',v_fx,'origin_key',v_origin,'destination_key',v_dest,'transport_mode',v_mode,'product_type',p_product_type);
  end if;
  if p_rate_key is not null and btrim(p_rate_key)<>'' then
    v_rate_key:=btrim(p_rate_key);
  elsif v_mode='sea' then
    if v_origin<>'China' then raise exception 'Sea rate is configured for China to Erbil only'; end if;
    v_rate_key:='sea_cn_iq_cbm';
  elsif v_origin='China' then
    if v_type in ('screen','display','monitor','shasha','شاشە') then v_rate_key:='air_cn_iq_screen';
    elsif v_type in ('battery','patry','pattery','patery','پاتری') then v_rate_key:='air_cn_iq_battery';
    else v_rate_key:='air_cn_iq_general'; end if;
  elsif v_origin='USA' then
    v_rate_key:='air_us_iq_general';
  elsif v_origin='UAE' then
    if v_type in ('accessories','accessory','akssoarat') then v_rate_key:='air_ae_iq_accessories';
    elsif v_type in ('tablet','tab') then v_rate_key:='air_ae_iq_tablet';
    elsif v_type in ('playstation','ps','ps5','ps5ps') then v_rate_key:='air_ae_iq_playstation';
    elsif v_type in ('laptop','labtop') then v_rate_key:='air_ae_iq_laptop';
    elsif v_type in ('camera','cam') then v_rate_key:='air_ae_iq_camera';
    elsif v_type in ('used iphone','usediphone','used') then v_rate_key:='air_ae_iq_used_iphone';
    elsif v_type in ('android','androidphone','android phone') then v_rate_key:='air_ae_iq_android';
    elsif v_type in ('iphone','iphone17','s25','s26','premiumphone') then v_rate_key:='air_ae_iq_iphone17_s25_s26';
    else v_rate_key:='air_ae_iq_accessories'; end if;
  end if;
  select * into v_rate from public.pricing_rates where is_active=true and rate_key=v_rate_key limit 1;
  if v_rate.id is null then raise exception 'No active rate configured for rate key %',v_rate_key; end if;
  if v_mode='sea' then
    if p_volume_cbm is null or p_volume_cbm<=0 then raise exception 'CBM volume is required for sea cargo'; end if;
    v_usd:=v_rate.amount*p_volume_cbm;
  else
    if p_weight_kg is null or p_weight_kg<=0 then raise exception 'Weight is required for air cargo'; end if;
    v_usd:=v_rate.amount*p_weight_kg;
  end if;
  v_iqd:=round(v_usd*v_fx,0);
  return jsonb_build_object('ok',true,'minimum_applied',false,'rate_key',v_rate.rate_key,'product_type',v_rate.product_type,'unit',v_rate.unit,'rate_usd',v_rate.amount,'usd',round(v_usd,2),'iqd',v_iqd,'currency','IQD','exchange_rate',v_fx,'origin_key',v_origin,'destination_key',v_dest,'transport_mode',v_mode,'weight_kg',p_weight_kg,'volume_cbm',p_volume_cbm);
end;
$$;
revoke all on function public.calculate_logistics_price(text,text,text,text,numeric,numeric,text) from public;
grant execute on function public.calculate_logistics_price(text,text,text,text,numeric,numeric,text) to anon,authenticated,service_role;
