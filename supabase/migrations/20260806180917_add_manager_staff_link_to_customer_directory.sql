begin;

alter table public.customer_directory
  add column if not exists manager_staff_id uuid references public.staff(id) on delete set null;

create index if not exists customer_directory_manager_staff_id_idx
  on public.customer_directory using btree (manager_staff_id);

drop view if exists public.customer_directory_accounts;
create view public.customer_directory_accounts as
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
  coalesce(sum(coalesce(s.total_amount, 0)), 0) as total_amount,
  coalesce(sum(greatest(coalesce(s.total_amount, 0) - coalesce(s.paid_amount, 0), 0)), 0) as outstanding_amount,
  max(s.created_at) as last_shipment_at
from public.customer_directory cd
left join public.shipments s on s.directory_customer_id = cd.id
group by cd.id;

grant select on public.customer_directory_accounts to authenticated;

commit;;
