-- Globall Cloud: staff and Staff OS chat Security Advisor hardening.
-- Forward-only migration. It intentionally replaces every policy on the six
-- affected tables so no older permissive policy can remain active alongside the
-- target contract.
--
-- Design goals:
--   * no PUBLIC/anon table privileges;
--   * authenticated policies explicitly deny anonymous Auth sessions;
--   * staff/admin access remains compatible with Staff OS and legacy admin pages;
--   * chat messages remain member-scoped and sender-owned for writes;
--   * trusted account-admin/service-role APIs keep full table access;
--   * existing Supabase Realtime publication membership is retained.

begin;

-- The staff directory intentionally exposes only self/admin rows. This private
-- definer helper lets chat membership RLS validate another member's active
-- status without weakening staff-directory visibility or causing policy loops.
create or replace function private.is_active_staff(p_staff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.staff s
    where s.id = p_staff_id
      and s.is_active = true
  );
$$;

revoke all on function private.is_active_staff(uuid) from public, anon, authenticated;
grant execute on function private.is_active_staff(uuid) to authenticated;

-- These tables are created by earlier migrations. Failing here if a dependency
-- is missing is safer than silently deploying a partial security contract.
alter table public.staff enable row level security;
alter table public.staff_activity_log enable row level security;
alter table public.staff_notifications enable row level security;
alter table public.staff_chat_rooms enable row level security;
alter table public.staff_chat_members enable row level security;
alter table public.staff_chat_messages enable row level security;

-- Remove all policies currently attached to only these six tables. This is
-- deliberately scoped and makes the migration idempotent across environments
-- where the earlier policy names differ.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'staff',
        'staff_activity_log',
        'staff_notifications',
        'staff_chat_rooms',
        'staff_chat_members',
        'staff_chat_messages'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      p.policyname,
      p.schemaname,
      p.tablename
    );
  end loop;
end
$$;

-- Anonymous clients and the PUBLIC role receive no direct table privileges.
-- service_role is explicitly restored below because it is the trusted server
-- path used by account-admin and notification triggers.
revoke all on table public.staff from public, anon, authenticated;
revoke all on table public.staff_activity_log from public, anon, authenticated;
revoke all on table public.staff_notifications from public, anon, authenticated;
revoke all on table public.staff_chat_rooms from public, anon, authenticated;
revoke all on table public.staff_chat_members from public, anon, authenticated;
revoke all on table public.staff_chat_messages from public, anon, authenticated;

-- Staff directory: self-read remains available for the login gate and profile
-- rendering; only admin/super_admin may mutate staff rows directly.
grant select, insert, update, delete on table public.staff to authenticated;
grant all on table public.staff to service_role;

-- Activity log: staff can read the operational log and append an entry for
-- themselves. Identity/created_at values cannot be supplied by the browser.
grant select on table public.staff_activity_log to authenticated;
grant insert (staff_id, staff_name, action, target_id, details)
  on table public.staff_activity_log to authenticated;
grant all on table public.staff_activity_log to service_role;

-- Notification inbox: clients can read their own notifications and update only
-- read_at. Inserts remain trigger/service-role controlled.
grant select on table public.staff_notifications to authenticated;
grant update (read_at) on table public.staff_notifications to authenticated;
grant all on table public.staff_notifications to service_role;

-- Chat metadata and messages: authenticated clients may use only the operations
-- required by the direct RLS contract. The account-admin Edge Function uses the
-- trusted service_role path for its aggregate reads and writes.
grant select on table public.staff_chat_rooms to authenticated;
grant select on table public.staff_chat_members to authenticated;
grant update (last_read_at) on table public.staff_chat_members to authenticated;
grant select on table public.staff_chat_messages to authenticated;
grant insert (room_id, sender_id, body, client_message_id)
  on table public.staff_chat_messages to authenticated;
grant update (body, edited_at) on table public.staff_chat_messages to authenticated;

grant all on table public.staff_chat_rooms to service_role;
grant all on table public.staff_chat_members to service_role;
grant all on table public.staff_chat_messages to service_role;

-- The activity-log identity sequence is required for direct authenticated
-- inserts that omit id. No other sequence privilege is exposed.
revoke all on sequence public.staff_activity_log_id_seq from public, anon, authenticated;
grant usage, select on sequence public.staff_activity_log_id_seq to authenticated;
grant all on sequence public.staff_activity_log_id_seq to service_role;

-- One restrictive policy per table rejects both unauthenticated requests and
-- anonymous Auth sessions that are represented by the authenticated database
-- role. The second condition follows the project-wide Supabase JWT convention.
create policy staff_security_no_anonymous
  on public.staff as restrictive
  for all to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  )
  with check (
    (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  );

create policy staff_activity_log_security_no_anonymous
  on public.staff_activity_log as restrictive
  for all to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  )
  with check (
    (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  );

create policy staff_notifications_security_no_anonymous
  on public.staff_notifications as restrictive
  for all to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  )
  with check (
    (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  );

create policy staff_chat_rooms_security_no_anonymous
  on public.staff_chat_rooms as restrictive
  for all to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  )
  with check (
    (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  );

create policy staff_chat_members_security_no_anonymous
  on public.staff_chat_members as restrictive
  for all to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  )
  with check (
    (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  );

create policy staff_chat_messages_security_no_anonymous
  on public.staff_chat_messages as restrictive
  for all to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  )
  with check (
    (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  );

-- Staff directory access.
create policy staff_access_select
  on public.staff for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_admin())
  );

create policy staff_access_insert_admin
  on public.staff for insert to authenticated
  with check ((select public.is_admin()));

create policy staff_access_update_admin
  on public.staff for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy staff_access_delete_admin
  on public.staff for delete to authenticated
  using ((select public.is_admin()));

-- Activity log access. Direct browser inserts must identify the current active
-- staff member; account-admin/service_role can continue to write on behalf of
-- an actor for server-side audit events.
create policy staff_activity_log_access_select
  on public.staff_activity_log for select to authenticated
  using ((select public.is_staff()));

create policy staff_activity_log_access_insert
  on public.staff_activity_log for insert to authenticated
  with check (
    staff_id = (select auth.uid())
    and (select public.is_staff())
  );

-- Notification inbox access is limited to the current active staff member.
create policy staff_notifications_access_select_own
  on public.staff_notifications for select to authenticated
  using (
    staff_id = (select auth.uid())
    and (select public.is_staff())
  );

create policy staff_notifications_access_update_own
  on public.staff_notifications for update to authenticated
  using (
    staff_id = (select auth.uid())
    and (select public.is_staff())
  )
  with check (
    staff_id = (select auth.uid())
    and (select public.is_staff())
  );

-- Room and membership metadata is intentionally visible to active staff so
-- Staff OS can render the common-room roster and Realtime presence. Messages
-- below remain strictly room-member scoped.
create policy staff_chat_rooms_access_select
  on public.staff_chat_rooms for select to authenticated
  using (
    is_active = true
    and (select public.is_staff())
  );

create policy staff_chat_members_access_select
  on public.staff_chat_members for select to authenticated
  using (
    (select public.is_staff())
    and (select private.is_active_staff(staff_id))
    and exists (
      select 1
      from public.staff_chat_rooms r
      where r.id = staff_chat_members.room_id
        and r.is_active = true
    )
  );

create policy staff_chat_members_access_update_own
  on public.staff_chat_members for update to authenticated
  using (
    staff_id = (select auth.uid())
    and (select public.is_staff())
  )
  with check (
    staff_id = (select auth.uid())
    and (select public.is_staff())
  );

create policy staff_chat_messages_access_select_member
  on public.staff_chat_messages for select to authenticated
  using (
    (select public.is_staff())
    and exists (
      select 1
      from public.staff_chat_members m
      where m.room_id = staff_chat_messages.room_id
        and m.staff_id = (select auth.uid())
    )
  );

create policy staff_chat_messages_access_insert_member
  on public.staff_chat_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select public.is_staff())
    and exists (
      select 1
      from public.staff_chat_members m
      where m.room_id = staff_chat_messages.room_id
        and m.staff_id = (select auth.uid())
    )
  );

create policy staff_chat_messages_access_update_sender
  on public.staff_chat_messages for update to authenticated
  using (
    sender_id = (select auth.uid())
    and (select public.is_staff())
  )
  with check (
    sender_id = (select auth.uid())
    and (select public.is_staff())
  );

-- Realtime is part of the deployed Staff OS contract. Adding an already
-- published table raises duplicate_object, which is intentionally ignored.
do $$
begin
  begin
    alter publication supabase_realtime add table public.staff_notifications;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.staff_chat_rooms;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.staff_chat_members;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.staff_chat_messages;
  exception when duplicate_object then null;
  end;
end
$$;

commit;
