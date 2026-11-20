-- Keep browser-created customer sessions and staff sessions non-anonymous.
-- SECURITY DEFINER is retained because product reservations and order rows are
-- intentionally protected from direct client writes by RLS.
CREATE OR REPLACE FUNCTION public.shop_place_order(
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_notes text DEFAULT NULL::text
)
RETURNS TABLE(order_id uuid, order_number text, total_usd numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, private, pg_temp
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(12,2) := 0;
  v_product public.shop_products%rowtype;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_line numeric(12,2);
BEGIN
  IF NOT private.is_real_authenticated_session() OR v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF coalesce(length(trim(p_customer_name)),0) < 2 THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF coalesce(length(trim(p_customer_phone)),0) < 6 THEN
    RAISE EXCEPTION 'Customer phone is required';
  END IF;
  IF coalesce(length(trim(p_delivery_address)),0) < 8 THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Cart must be an array';
  END IF;
  IF jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Cart is empty or too large';
  END IF;

  -- Reject duplicate product IDs so separate cart lines cannot over-reserve stock.
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT (value->>'product_id')::uuid AS product_id
      FROM jsonb_array_elements(p_items)
      GROUP BY (value->>'product_id')::uuid
      HAVING count(*) > 1
    ) duplicate_products
  ) THEN
    RAISE EXCEPTION 'Duplicate products must be combined into one cart line';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'Invalid cart item';
    END IF;

    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 99 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT * INTO v_product
    FROM public.shop_products
    WHERE id = v_product_id AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product is unavailable';
    END IF;
    IF v_product.inventory_count - v_product.reserved_count < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_product.name;
    END IF;

    v_line := round(v_product.price_usd * v_quantity, 2);
    v_subtotal := v_subtotal + v_line;
  END LOOP;

  INSERT INTO public.shop_orders (
    customer_user_id, customer_name, customer_phone, delivery_address,
    notes, subtotal_usd, total_usd
  )
  VALUES (
    v_user, trim(p_customer_name), trim(p_customer_phone), trim(p_delivery_address),
    nullif(trim(p_notes),''), v_subtotal, v_subtotal
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    SELECT * INTO v_product
    FROM public.shop_products
    WHERE id = v_product_id AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product is unavailable';
    END IF;

    v_line := round(v_product.price_usd * v_quantity, 2);

    INSERT INTO public.shop_order_items (
      order_id, product_id, sku, product_name, image_url,
      unit_price_usd, quantity, line_total_usd
    )
    VALUES (
      v_order_id, v_product.id, v_product.sku, v_product.name, v_product.image_url,
      v_product.price_usd, v_quantity, v_line
    );

    UPDATE public.shop_products
    SET reserved_count = reserved_count + v_quantity,
        updated_at = now()
    WHERE id = v_product.id;
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_order_number, v_subtotal;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.shop_place_order(jsonb, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shop_place_order(jsonb, text, text, text, text)
  TO authenticated;

-- A browser-callable Staff status wrapper was not used by Staff OS and could
-- not complete writes under the existing read-only shop table policies.
DROP FUNCTION IF EXISTS public.gc_staff_update_shop_order_status(uuid, text);

REVOKE EXECUTE ON FUNCTION public.shop_update_order_status(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shop_update_order_status(uuid, text)
  TO service_role;
