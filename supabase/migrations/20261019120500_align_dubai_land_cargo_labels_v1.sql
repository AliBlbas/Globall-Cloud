-- Align the public catalog labels with Globall Cloud's published Dubai land rate card.
-- Prices, routes, units, and rate keys remain unchanged to preserve existing references.
update public.pricing_rates
set product_type = 'Shein / Clothing'
where rate_key = 'dubai_erbil_land_shoes_clothes'
  and lower(origin_key) = 'dubai'
  and lower(destination_key) = 'erbil'
  and lower(transport_mode) = 'land'
  and amount = 1.50
  and currency = 'USD';

update public.pricing_rates
set product_type = 'AirPods & Perfume'
where rate_key = 'dubai_erbil_land_iherb_perfume'
  and lower(origin_key) = 'dubai'
  and lower(destination_key) = 'erbil'
  and lower(transport_mode) = 'land'
  and amount = 12.00
  and currency = 'USD';