create or replace function public.get_shein_quote(p_product_price_usd numeric, p_shipping_usd numeric default 0, p_quantity integer default 1)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_rate numeric;
  v_margin numeric;
  v_total_usd numeric;
  v_total_iqd numeric;
  v_margin_iqd numeric;
  v_final numeric;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if p_product_price_usd is null or p_product_price_usd <= 0 then raise exception 'Product price must be greater than zero'; end if;
  if coalesce(p_shipping_usd,0) < 0 then raise exception 'Shipping cannot be negative'; end if;
  if coalesce(p_quantity,1) < 1 or p_quantity > 100 then raise exception 'Quantity must be between 1 and 100'; end if;

  select er.usd_to_iqd into v_rate
  from public.exchange_rates er
  where er.usd_to_iqd is not null and er.usd_to_iqd > 0
  order by er.created_at desc nulls last, er.effective_on desc nulls last
  limit 1;
  if v_rate is null then
    select value into v_rate from public.app_settings where key='usd_iqd_rate' limit 1;
  end if;
  if v_rate is null or v_rate <= 0 then raise exception 'USD/IQD exchange rate is not configured'; end if;

  v_margin := public.get_shopping_margin_percent();
  v_total_usd := (p_product_price_usd + coalesce(p_shipping_usd,0)) * p_quantity;
  v_total_iqd := v_total_usd * v_rate;
  v_margin_iqd := v_total_iqd * v_margin / 100;
  v_final := ceil((v_total_iqd + v_margin_iqd) / 250) * 250;

  return jsonb_build_object(
    'product_price_usd', p_product_price_usd,
    'shipping_usd', coalesce(p_shipping_usd,0),
    'quantity', p_quantity,
    'total_usd', round(v_total_usd,2),
    'exchange_rate', v_rate,
    'total_iqd', round(v_total_iqd,0),
    'margin_percent', v_margin,
    'margin_iqd', round(v_margin_iqd,0),
    'final_price_iqd', v_final
  );
end;
$$;

revoke all on function public.get_shein_quote(numeric,numeric,integer) from public, anon;
grant execute on function public.get_shein_quote(numeric,numeric,integer) to authenticated, service_role;
