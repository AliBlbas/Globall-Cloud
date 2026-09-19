-- Globall Cloud: avoid per-row auth.jwt evaluation in Staff OS policies.
-- The helper keeps the anonymous-session guard centralized and lets the query
-- planner initialize it once per statement instead of once per row.

begin;

create or replace function private.is_real_authenticated_session()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false;
$$;

revoke all on function private.is_real_authenticated_session() from public, anon, authenticated;
grant execute on function private.is_real_authenticated_session() to authenticated;

drop policy if exists staff_security_no_anonymous on public.staff;
create policy staff_security_no_anonymous
  on public.staff as restrictive
  for all to authenticated
  using ((select private.is_real_authenticated_session()))
  with check ((select private.is_real_authenticated_session()));

drop policy if exists staff_activity_log_security_no_anonymous on public.staff_activity_log;
create policy staff_activity_log_security_no_anonymous
  on public.staff_activity_log as restrictive
  for all to authenticated
  using ((select private.is_real_authenticated_session()))
  with check ((select private.is_real_authenticated_session()));

drop policy if exists staff_notifications_security_no_anonymous on public.staff_notifications;
create policy staff_notifications_security_no_anonymous
  on public.staff_notifications as restrictive
  for all to authenticated
  using ((select private.is_real_authenticated_session()))
  with check ((select private.is_real_authenticated_session()));

drop policy if exists staff_chat_rooms_security_no_anonymous on public.staff_chat_rooms;
create policy staff_chat_rooms_security_no_anonymous
  on public.staff_chat_rooms as restrictive
  for all to authenticated
  using ((select private.is_real_authenticated_session()))
  with check ((select private.is_real_authenticated_session()));

drop policy if exists staff_chat_members_security_no_anonymous on public.staff_chat_members;
create policy staff_chat_members_security_no_anonymous
  on public.staff_chat_members as restrictive
  for all to authenticated
  using ((select private.is_real_authenticated_session()))
  with check ((select private.is_real_authenticated_session()));

drop policy if exists staff_chat_messages_security_no_anonymous on public.staff_chat_messages;
create policy staff_chat_messages_security_no_anonymous
  on public.staff_chat_messages as restrictive
  for all to authenticated
  using ((select private.is_real_authenticated_session()))
  with check ((select private.is_real_authenticated_session()));

commit;
