BEGIN;

-- Preserve the existing SELECT semantics while separating the warehouse
-- operator write policy from SELECT so it no longer overlaps the read policy.
DROP POLICY IF EXISTS gc_warehouse_addresses_operator_write ON public.gc_warehouse_addresses;
DROP POLICY IF EXISTS gc_warehouse_addresses_operator_insert ON public.gc_warehouse_addresses;
DROP POLICY IF EXISTS gc_warehouse_addresses_operator_update ON public.gc_warehouse_addresses;
DROP POLICY IF EXISTS gc_warehouse_addresses_operator_delete ON public.gc_warehouse_addresses;

CREATE POLICY gc_warehouse_addresses_operator_insert
  ON public.gc_warehouse_addresses
  FOR INSERT TO authenticated
  WITH CHECK (is_warehouse_operator());

CREATE POLICY gc_warehouse_addresses_operator_update
  ON public.gc_warehouse_addresses
  FOR UPDATE TO authenticated
  USING (is_warehouse_operator())
  WITH CHECK (is_warehouse_operator());

CREATE POLICY gc_warehouse_addresses_operator_delete
  ON public.gc_warehouse_addresses
  FOR DELETE TO authenticated
  USING (is_warehouse_operator());

-- The two former permissive UPDATE policies granted the union of these
-- predicates. Consolidate them without broadening customer or staff access.
DROP POLICY IF EXISTS quote_requests_customer_update_pending ON public.quote_requests;
DROP POLICY IF EXISTS quote_requests_staff_update ON public.quote_requests;
DROP POLICY IF EXISTS quote_requests_customer_or_staff_update ON public.quote_requests;

CREATE POLICY quote_requests_customer_or_staff_update
  ON public.quote_requests
  FOR UPDATE TO authenticated
  USING (
    is_staff()
    OR (
      customer_user_id = (SELECT auth.uid())
      AND status = 'pending'
      AND quoted_amount IS NULL
      AND quoted_by IS NULL
      AND accepted_at IS NULL
      AND accepted_by IS NULL
    )
  )
  WITH CHECK (
    is_staff()
    OR (
      customer_user_id = (SELECT auth.uid())
      AND status = 'pending'
      AND quoted_amount IS NULL
      AND quoted_by IS NULL
      AND accepted_at IS NULL
      AND accepted_by IS NULL
    )
  );

-- Split the staff ALL policy into explicit write policies and combine its
-- SELECT predicate with the existing owner-scoped customer SELECT predicate.
DROP POLICY IF EXISTS shipment_cargo_items_customer_read_own ON public.shipment_cargo_items;
DROP POLICY IF EXISTS shipment_cargo_items_staff_access ON public.shipment_cargo_items;
DROP POLICY IF EXISTS shipment_cargo_items_customer_staff_read ON public.shipment_cargo_items;
DROP POLICY IF EXISTS shipment_cargo_items_staff_insert ON public.shipment_cargo_items;
DROP POLICY IF EXISTS shipment_cargo_items_staff_update ON public.shipment_cargo_items;
DROP POLICY IF EXISTS shipment_cargo_items_staff_delete ON public.shipment_cargo_items;

CREATE POLICY shipment_cargo_items_customer_staff_read
  ON public.shipment_cargo_items
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_real_authenticated_session())
    AND (
      EXISTS (
        SELECT 1
        FROM public.shipments AS s
        WHERE s.id = shipment_cargo_items.shipment_id
          AND (
            s.customer_user_id = (SELECT auth.uid())
            OR EXISTS (
              SELECT 1
              FROM public.customer_directory AS cd
              WHERE cd.id = s.directory_customer_id
                AND cd.auth_user_id = (SELECT auth.uid())
                AND cd.is_active = true
            )
          )
      )
      OR (
        is_staff()
        AND (SELECT private.is_real_authenticated_session())
      )
    )
  );

CREATE POLICY shipment_cargo_items_staff_insert
  ON public.shipment_cargo_items
  FOR INSERT TO authenticated
  WITH CHECK (
    is_staff()
    AND (SELECT private.is_real_authenticated_session())
  );

CREATE POLICY shipment_cargo_items_staff_update
  ON public.shipment_cargo_items
  FOR UPDATE TO authenticated
  USING (
    is_staff()
    AND (SELECT private.is_real_authenticated_session())
  )
  WITH CHECK (
    is_staff()
    AND (SELECT private.is_real_authenticated_session())
  );

CREATE POLICY shipment_cargo_items_staff_delete
  ON public.shipment_cargo_items
  FOR DELETE TO authenticated
  USING (
    is_staff()
    AND (SELECT private.is_real_authenticated_session())
  );

-- This ALL policy was PERMISSIVE with USING(false) and WITH CHECK(false).
-- With RLS enabled and no write policy, PostgreSQL already denies client writes.
DROP POLICY IF EXISTS staff_workflow_events_no_client_write ON public.staff_workflow_events;

COMMIT;
