-- Make the customer notification upsert conflict target inferable by Postgres/PostgREST.
-- This preserves existing rows and the uniqueness guarantee for non-null event keys.
-- NULL event keys remain independently allowed by PostgreSQL unique-index semantics.
create unique index if not exists customer_notifications_event_key_full_uidx
  on public.customer_notifications (customer_user_id, event_key);
drop index if exists public.customer_notifications_event_key_uidx;
alter index public.customer_notifications_event_key_full_uidx
  rename to customer_notifications_event_key_uidx;
