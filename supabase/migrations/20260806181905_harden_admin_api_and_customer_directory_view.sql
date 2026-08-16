-- Recreate the customer directory summary view so it obeys RLS of the underlying tables.
create or replace view public.customer_directory_accounts
with (security_invoker = true)
as
select
  cd.id,
  cd.code,
  cd.name,
  cd.phone,
  cd.phone2,
  cd.email,
  cd.city,
  cd.delivery_location,
  cd.note,
  cd.auth_user_id,
  cd.manager_staff_id,
  cd.is_active,
  cd.created_at,
  cd.updated_at,
  count(s.id) as shipment_count,
  coalesce(sum(coalesce(s.total_amount, 0::numeric)), 0::numeric) as total_amount,
  coalesce(sum(greatest(coalesce(s.total_amount, 0::numeric) - coalesce(s.paid_amount, 0::numeric), 0::numeric)), 0::numeric) as outstanding_amount,
  max(s.created_at) as last_shipment_at
from public.customer_directory cd
left join public.shipments s
  on s.directory_customer_id = cd.id
group by cd.id;

-- Remove direct RPC access for admin account management. These are now edge-function only.
revoke execute on function public.admin_delete_customer(uuid) from anon, authenticated, public;
revoke execute on function public.admin_delete_customer_public(uuid) from anon, authenticated, public;
revoke execute on function public.admin_delete_shipment_public(text) from anon, authenticated, public;
revoke execute on function public.admin_list_customers() from anon, authenticated, public;
revoke execute on function public.admin_list_customers_public() from anon, authenticated, public;
revoke execute on function public.admin_list_shipments_public() from anon, authenticated, public;
revoke execute on function public.admin_upsert_customer_public(text, text, text, text, text, text) from anon, authenticated, public;
revoke execute on function public.admin_upsert_customer_public(uuid, text, text, text, text, text, text) from anon, authenticated, public;
revoke execute on function public.admin_upsert_shipment_public(jsonb) from anon, authenticated, public;
;
