-- 1) Restore write privileges for authenticated staff on core operational tables.
grant insert, update, delete on table public.shipments to authenticated;
grant insert, update, delete on table public.warehouse_receipts to authenticated;
grant insert, update, delete on table public.customer_directory to authenticated;
grant insert, update, delete on table public.messages to authenticated;
grant select on table public.customer_directory_stats to authenticated;

-- 2) Make the legacy customer list compatible with the live customer directory.
create or replace function public.admin_list_customers()
returns table(
  id uuid,
  email text,
  full_name text,
  phone text,
  created_at timestamptz,
  shipment_count bigint
)
language sql
security definer
set search_path to 'public'
as $$
  select
    cd.id,
    cd.email,
    cd.name as full_name,
    cd.phone,
    cd.created_at,
    coalesce(count(s.id), 0)::bigint as shipment_count
  from public.customer_directory cd
  left join public.shipments s
    on s.directory_customer_id = cd.id or s.customer_user_id = cd.auth_user_id
  where coalesce(cd.is_active, true) = true
  group by cd.id, cd.email, cd.name, cd.phone, cd.created_at
  order by cd.created_at desc;
$$;
;
