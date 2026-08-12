-- Globall Cloud production hardening applied on 2026-08-12.
-- Keep this migration in Git in sync with the production Supabase project.

-- Anonymous Supabase Auth users use the authenticated Postgres role. These
-- restrictive policies prevent anonymous sessions from inheriting staff/customer
-- access through permissive authenticated policies.
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

-- Public tracking is intentionally anonymous, but signed-in users should not
-- be able to invoke the privileged SECURITY DEFINER RPC. Authenticated users
-- should use ownership-scoped table/RLS access instead.
revoke execute on function public.track_shipment(text) from authenticated;
revoke execute on function public.track_shipment(text) from public;
grant execute on function public.track_shipment(text) to anon;
