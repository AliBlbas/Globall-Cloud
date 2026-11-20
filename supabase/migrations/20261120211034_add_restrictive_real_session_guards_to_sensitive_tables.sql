begin;

create policy gc_block_anonymous
on public.admin_action_requests
as restrictive
for all
to authenticated
using (private.is_real_authenticated_session())
with check (private.is_real_authenticated_session());

create policy gc_block_anonymous
on public.audit_logs
as restrictive
for all
to authenticated
using (private.is_real_authenticated_session())
with check (private.is_real_authenticated_session());

create policy gc_block_anonymous
on public.chat_messages
as restrictive
for all
to authenticated
using (private.is_real_authenticated_session())
with check (private.is_real_authenticated_session());

create policy gc_block_anonymous
on public.company_costs
as restrictive
for all
to authenticated
using (private.is_real_authenticated_session())
with check (private.is_real_authenticated_session());

create policy gc_block_anonymous
on public.customer_directory
as restrictive
for all
to authenticated
using (private.is_real_authenticated_session())
with check (private.is_real_authenticated_session());

commit;
