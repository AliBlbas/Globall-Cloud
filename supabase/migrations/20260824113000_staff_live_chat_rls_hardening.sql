-- Live Chat RLS hardening: avoid recursive self-references in membership policies.
-- Membership rows are non-sensitive staff presence metadata; active staff can see
-- active-room membership rows, while messages remain room-member scoped.

drop policy if exists staff_chat_rooms_select_member on public.staff_chat_rooms;
create policy staff_chat_rooms_select_member
  on public.staff_chat_rooms for select to authenticated
  using (is_active = true and public.is_staff());

drop policy if exists staff_chat_members_select_member on public.staff_chat_members;
create policy staff_chat_members_select_member
  on public.staff_chat_members for select to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.staff s
      where s.id = staff_id and s.is_active = true
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
      where m.room_id = public.staff_chat_messages.room_id
        and m.staff_id = auth.uid()
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
      where m.room_id = public.staff_chat_messages.room_id
        and m.staff_id = auth.uid()
    )
  );

drop policy if exists staff_chat_messages_update_sender on public.staff_chat_messages;
create policy staff_chat_messages_update_sender
  on public.staff_chat_messages for update to authenticated
  using (sender_id = auth.uid() and public.is_staff())
  with check (sender_id = auth.uid() and public.is_staff());
