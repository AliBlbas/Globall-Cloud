-- Globall Cloud customer live chat: secure authenticated customer/staff access.
-- Customer messages are realtime-enabled but never public or anonymous.
begin;

alter table public.customer_chat_threads enable row level security;
alter table public.customer_chat_messages enable row level security;

-- Remove any historical policies on the two customer-chat tables so the contract
-- below is deterministic across production and staging.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('customer_chat_threads', 'customer_chat_messages')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end
$$;

revoke all on table public.customer_chat_threads from public, anon, authenticated;
revoke all on table public.customer_chat_messages from public, anon, authenticated;

grant select, insert on table public.customer_chat_threads to authenticated;
grant update (status, priority, assigned_staff_id, updated_at) on table public.customer_chat_threads to authenticated;
grant select, insert, update (read_at) on table public.customer_chat_messages to authenticated;
grant all on table public.customer_chat_threads to service_role;
grant all on table public.customer_chat_messages to service_role;

-- Customers can read their own threads; support staff can read every active thread.
create policy customer_chat_threads_select
  on public.customer_chat_threads for select to authenticated
  using (
    (select private.is_real_authenticated_session())
    and (
      customer_user_id = (select auth.uid())
      or (select public.is_staff())
    )
  );

-- A customer may open a thread only for themselves. Staff may open a thread
-- through the authenticated app, while service_role remains the trusted path.
create policy customer_chat_threads_insert
  on public.customer_chat_threads for insert to authenticated
  with check (
    (select private.is_real_authenticated_session())
    and (
      (customer_user_id = (select auth.uid()) and not (select public.is_staff()))
      or (select public.is_staff())
    )
  );

-- Customers cannot reassign or close their own support threads from the client.
-- Staff can update operational routing/status fields, but not ownership.
create policy customer_chat_threads_update_staff
  on public.customer_chat_threads for update to authenticated
  using ((select private.is_real_authenticated_session()) and (select public.is_staff()))
  with check ((select private.is_real_authenticated_session()) and (select public.is_staff()));

create policy customer_chat_messages_select
  on public.customer_chat_messages for select to authenticated
  using (
    (select private.is_real_authenticated_session())
    and exists (
      select 1
      from public.customer_chat_threads t
      where t.id = customer_chat_messages.thread_id
        and (t.customer_user_id = (select auth.uid()) or (select public.is_staff()))
    )
  );

create policy customer_chat_messages_insert
  on public.customer_chat_messages for insert to authenticated
  with check (
    (select private.is_real_authenticated_session())
    and (
      (
        sender_type = 'customer'
        and sender_user_id = (select auth.uid())
        and exists (
          select 1 from public.customer_chat_threads t
          where t.id = customer_chat_messages.thread_id
            and t.customer_user_id = (select auth.uid())
        )
      )
      or (
        sender_type = 'staff'
        and sender_user_id = (select auth.uid())
        and (select public.is_staff())
        and exists (
          select 1 from public.customer_chat_threads t
          where t.id = customer_chat_messages.thread_id
        )
      )
    )
  );

create policy customer_chat_messages_update_read
  on public.customer_chat_messages for update to authenticated
  using (
    (select private.is_real_authenticated_session())
    and (
      sender_user_id = (select auth.uid())
      or (select public.is_staff())
    )
  )
  with check (
    (select private.is_real_authenticated_session())
    and (
      sender_user_id = (select auth.uid())
      or (select public.is_staff())
    )
  );

create index if not exists customer_chat_threads_status_last_message_idx
  on public.customer_chat_threads(status, last_message_at desc);
create index if not exists customer_chat_threads_assigned_staff_idx
  on public.customer_chat_threads(assigned_staff_id, last_message_at desc)
  where assigned_staff_id is not null;

-- Realtime is used for message delivery and thread inbox refresh.
do $$
begin
  begin
    alter publication supabase_realtime add table public.customer_chat_threads;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.customer_chat_messages;
  exception when duplicate_object then null;
  end;
end
$$;

commit;
