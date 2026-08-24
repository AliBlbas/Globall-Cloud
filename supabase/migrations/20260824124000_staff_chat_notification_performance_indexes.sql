-- Globall Cloud: targeted indexes for Staff OS chat and notification workloads.
-- Forward-only and idempotent. These indexes cover the foreign keys reported by
-- Supabase Performance Advisor and the common Staff OS sender/owner lookups.

begin;

create index if not exists staff_chat_rooms_created_by_idx
  on public.staff_chat_rooms(created_by)
  where created_by is not null;

create index if not exists staff_notifications_entity_id_idx
  on public.staff_notifications(entity_id);

create index if not exists staff_chat_messages_sender_idx
  on public.staff_chat_messages(sender_id, created_at desc);

commit;
