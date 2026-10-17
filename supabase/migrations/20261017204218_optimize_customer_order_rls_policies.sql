-- Preserve customer/staff access rules while evaluating auth.uid() once per statement.
-- This avoids per-row auth helper evaluation in the three read policies flagged by Supabase performance advisors.
BEGIN;

ALTER POLICY gc_customer_shipments_select
ON public.shipments
USING (
  customer_user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.customer_directory AS cd
    WHERE cd.id = shipments.directory_customer_id
      AND cd.auth_user_id = (SELECT auth.uid())
      AND cd.is_active IS TRUE
  )
);

ALTER POLICY shop_orders_customer_read
ON public.shop_orders
USING (
  customer_user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.staff AS s
    WHERE s.id = (SELECT auth.uid())
      AND s.is_active IS TRUE
  )
);

ALTER POLICY shop_order_items_customer_read
ON public.shop_order_items
USING (
  EXISTS (
    SELECT 1
    FROM public.shop_orders AS o
    WHERE o.id = shop_order_items.order_id
      AND (
        o.customer_user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.staff AS s
          WHERE s.id = (SELECT auth.uid())
            AND s.is_active IS TRUE
        )
      )
  )
);

COMMIT;
