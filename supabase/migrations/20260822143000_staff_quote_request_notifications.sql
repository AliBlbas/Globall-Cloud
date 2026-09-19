create table if not exists public.staff_notifications (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  action_url text,
  entity_type text not null default 'quote_request',
  entity_id uuid not null references public.quote_requests(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (staff_id, kind, entity_id)
);

create index if not exists staff_notifications_inbox_idx
  on public.staff_notifications(staff_id, read_at, created_at desc);

alter table public.staff_notifications enable row level security;

drop policy if exists staff_notifications_select_own on public.staff_notifications;
create policy staff_notifications_select_own
  on public.staff_notifications for select to authenticated
  using (staff_id = auth.uid() and exists (
    select 1 from public.staff s where s.id = auth.uid() and s.is_active = true
  ));

drop policy if exists staff_notifications_update_own on public.staff_notifications;
create policy staff_notifications_update_own
  on public.staff_notifications for update to authenticated
  using (staff_id = auth.uid())
  with check (staff_id = auth.uid());

revoke all on public.staff_notifications from anon;
grant select, update on public.staff_notifications to authenticated;

create or replace function public.enqueue_staff_quote_request_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.staff_notifications(staff_id, kind, title, body, action_url, entity_id)
  select s.id,
         'new_quote_request',
         'داواکاریی نوێی ناردنی کالا',
         coalesce(nullif(trim(new.customer_name), ''), 'کڕیاری نوێ') || ' · ' || coalesce(new.origin_key, '—') || ' → ' || coalesce(new.dest_key, '—'),
         '/staff-os.html#customerRequests',
         new.id
  from public.staff s
  where s.is_active = true
    and s.role in ('admin', 'super_admin', 'accountant', 'warehouse', 'operations')
  on conflict (staff_id, kind, entity_id) do nothing;
  return new;
end;
$$;

revoke all on function public.enqueue_staff_quote_request_notification() from public, anon, authenticated;
grant execute on function public.enqueue_staff_quote_request_notification() to service_role;

drop trigger if exists quote_request_staff_notification on public.quote_requests;
create trigger quote_request_staff_notification
after insert on public.quote_requests
for each row execute function public.enqueue_staff_quote_request_notification();

do $$
begin
  begin
    alter publication supabase_realtime add table public.staff_notifications;
  exception when duplicate_object then
    null;
  end;
end $$;
