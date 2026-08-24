-- Staff-to-staff Live Chat: forward-only, RLS-protected, realtime-enabled.

create table if not exists public.staff_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_chat_members (
  room_id uuid not null references public.staff_chat_rooms(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (room_id, staff_id)
);

create table if not exists public.staff_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.staff_chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.staff(id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  client_message_id text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  unique (sender_id, client_message_id)
);

create index if not exists staff_chat_messages_room_created_idx
  on public.staff_chat_messages(room_id, created_at asc);
create index if not exists staff_chat_members_staff_idx
  on public.staff_chat_members(staff_id, room_id);

alter table public.staff_chat_rooms enable row level security;
alter table public.staff_chat_members enable row level security;
alter table public.staff_chat_messages enable row level security;

drop policy if exists staff_chat_rooms_select_member on public.staff_chat_rooms;
create policy staff_chat_rooms_select_member
  on public.staff_chat_rooms for select to authenticated
  using (
    is_active = true
    and public.is_staff()
    and exists (
      select 1 from public.staff_chat_members m
      where m.room_id = id and m.staff_id = auth.uid()
    )
  );

drop policy if exists staff_chat_members_select_member on public.staff_chat_members;
create policy staff_chat_members_select_member
  on public.staff_chat_members for select to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.staff_chat_members mine
      where mine.room_id = room_id and mine.staff_id = auth.uid()
    )
  );

drop policy if exists staff_chat_members_update_own on public.staff_chat_members;
create policy staff_chat_members_update_own
  on public.staff_chat_members for update to authenticated
  using (staff_id = auth.uid() and public.is_staff())
  with check (staff_id = auth.uid() and public.is_staff());

drop policy if exists staff_chat_messages_select_member on public.staff_chat_messages;
create policy staff_chat_messages_select_member
  on public.staff_chat_messages for select to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.staff_chat_members m
      where m.room_id = room_id and m.staff_id = auth.uid()
    )
  );

drop policy if exists staff_chat_messages_insert_member on public.staff_chat_messages;
create policy staff_chat_messages_insert_member
  on public.staff_chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_staff()
    and exists (
      select 1 from public.staff_chat_members m
      where m.room_id = room_id and m.staff_id = auth.uid()
    )
  );

drop policy if exists staff_chat_messages_update_sender on public.staff_chat_messages;
create policy staff_chat_messages_update_sender
  on public.staff_chat_messages for update to authenticated
  using (sender_id = auth.uid() and public.is_staff())
  with check (sender_id = auth.uid() and public.is_staff());

revoke all on public.staff_chat_rooms from anon;
revoke all on public.staff_chat_members from anon;
revoke all on public.staff_chat_messages from anon;
grant select on public.staff_chat_rooms to authenticated;
grant select, update on public.staff_chat_members to authenticated;
grant select, insert, update on public.staff_chat_messages to authenticated;

do $$
declare
  v_room_id uuid;
begin
  insert into public.staff_chat_rooms(slug, name, description)
  values (
    'staff-room',
    'Staff Room',
    'گفتوگۆی هاوبەشی تیمی Globall Cloud'
  )
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    is_active = true,
    updated_at = now();

  select id into v_room_id from public.staff_chat_rooms where slug = 'staff-room';
  insert into public.staff_chat_members(room_id, staff_id)
  select v_room_id, s.id
  from public.staff s
  where s.is_active = true
  on conflict (room_id, staff_id) do nothing;
end $$;

create or replace function public.ensure_staff_chat_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room_id uuid;
begin
  if new.is_active = true then
    select id into v_room_id from public.staff_chat_rooms where slug = 'staff-room' and is_active = true;
    if v_room_id is not null then
      insert into public.staff_chat_members(room_id, staff_id)
      values (v_room_id, new.id)
      on conflict (room_id, staff_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.ensure_staff_chat_membership() from public, anon, authenticated;
grant execute on function public.ensure_staff_chat_membership() to service_role;

drop trigger if exists staff_chat_membership_on_staff on public.staff;
create trigger staff_chat_membership_on_staff
after insert or update of is_active on public.staff
for each row execute function public.ensure_staff_chat_membership();

do $$
begin
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
end $$;
