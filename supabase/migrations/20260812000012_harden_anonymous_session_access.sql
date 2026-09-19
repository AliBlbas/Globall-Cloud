begin;

create policy "block_anonymous_customer_directory"
on public.customer_directory as restrictive
for all
to authenticated
using (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false)
with check (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false);

create policy "block_anonymous_shipments"
on public.shipments as restrictive
for all
to authenticated
using (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false)
with check (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false);

create policy "block_anonymous_staff"
on public.staff as restrictive
for all
to authenticated
using (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false)
with check (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false);

create policy "block_anonymous_staff_activity_log"
on public.staff_activity_log as restrictive
for all
to authenticated
using (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false)
with check (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false);

create policy "block_anonymous_warehouse_receipts"
on public.warehouse_receipts as restrictive
for all
to authenticated
using (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false)
with check (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false);

commit;;
