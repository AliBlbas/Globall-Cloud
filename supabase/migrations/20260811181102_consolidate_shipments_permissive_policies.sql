-- Consolidate overlapping PERMISSIVE policies on shipments into one policy per command
-- for the authenticated role. shipments_insert_guest (anon, customer_user_id is null)
-- is untouched since it's the only anon policy and has no overlap.

drop policy if exists shipments_user_rw_own on public.shipments;
drop policy if exists shipments_select_staff_all on public.shipments;
drop policy if exists shipments_insert_customer on public.shipments;
drop policy if exists shipments_insert_staff on public.shipments;
drop policy if exists shipments_update_staff_only on public.shipments;
drop policy if exists shipments_delete_staff_only on public.shipments;

create policy shipments_select
on public.shipments
for select
to authenticated
using (
  is_staff()
  or (customer_user_id = (select auth.uid()))
);

create policy shipments_insert
on public.shipments
for insert
to authenticated
with check (
  is_staff()
  or (customer_user_id is null)
  or (customer_user_id = (select auth.uid()))
);

create policy shipments_update
on public.shipments
for update
to authenticated
using (
  is_staff()
  or (customer_user_id = (select auth.uid()))
)
with check (
  is_staff()
  or (customer_user_id = (select auth.uid()))
);

create policy shipments_delete
on public.shipments
for delete
to authenticated
using (
  is_staff()
  or (customer_user_id = (select auth.uid()))
);;
