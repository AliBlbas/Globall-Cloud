CREATE OR REPLACE FUNCTION public.gc_staff_update_shop_order_status(
  p_order_id uuid,
  p_status text
)
RETURNS public.shop_orders
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $function$
DECLARE
  v_staff public.staff%rowtype;
  v_order public.shop_orders%rowtype;
  v_item record;
BEGIN
  IF NOT private.is_real_authenticated_session() THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_staff
  FROM public.staff
  WHERE id = (SELECT auth.uid())
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff access required' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('pending','confirmed','packed','in_transit','delivered','cancelled') THEN
    RAISE EXCEPTION 'Invalid order status';
  END IF;

  SELECT * INTO v_order
  FROM public.shop_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status = 'cancelled' AND p_status <> 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled order cannot be reopened';
  END IF;

  IF p_status = 'cancelled' AND v_order.status <> 'cancelled' THEN
    FOR v_item IN
      SELECT product_id, quantity
      FROM public.shop_order_items
      WHERE order_id = p_order_id
    LOOP
      UPDATE public.shop_products
      SET reserved_count = greatest(0, reserved_count - v_item.quantity),
          updated_at = now()
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  UPDATE public.shop_orders
  SET status = p_status, updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$function$;

REVOKE ALL ON FUNCTION public.gc_staff_update_shop_order_status(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gc_staff_update_shop_order_status(uuid, text)
  TO authenticated;
