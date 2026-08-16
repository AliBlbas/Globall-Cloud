-- Restore the Data API privileges expected by the authenticated staff console.
-- RLS remains the authorization boundary; these grants only make the protected
-- relations callable by PostgREST for authenticated sessions.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouse_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_directory TO authenticated;
GRANT SELECT ON public.customer_directory_stats TO authenticated;

-- The staff console calls this RPC. It must remain staff-gated because it is
-- SECURITY DEFINER and therefore intentionally bypasses table RLS internally.
CREATE OR REPLACE FUNCTION public.admin_list_customers()
RETURNS TABLE(id uuid, email text, full_name text, phone text, created_at timestamptz, shipment_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT
    cd.id,
    cd.email,
    cd.name AS full_name,
    cd.phone,
    cd.created_at,
    coalesce(count(s.id), 0)::bigint AS shipment_count
  FROM public.customer_directory cd
  LEFT JOIN public.shipments s
    ON s.directory_customer_id = cd.id OR s.customer_user_id = cd.auth_user_id
  WHERE coalesce(cd.is_active, true) = true
    AND is_staff()
  GROUP BY cd.id, cd.email, cd.name, cd.phone, cd.created_at
  ORDER BY cd.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_customers() TO authenticated;

-- The bigint/bigserial tables need sequence privileges for staff inserts.
GRANT USAGE, SELECT ON SEQUENCE public.messages_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.warehouse_receipts_id_seq TO authenticated;;
