revoke insert on table public.messages from anon;
drop policy if exists messages_anon_insert on public.messages;
