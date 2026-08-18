-- Isolated notification worker boundary.
-- External delivery channels are server-worker only; in-app processing remains
-- available to the existing internal workflow through its existing RPC.

create or replace function public.claim_notification_outbox_external(
  p_limit integer default 50
)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with picked as (
    select id
    from public.notification_outbox
    where status = 'pending'
      and channel in ('email', 'whatsapp', 'sms')
      and next_attempt_at <= now()
    order by created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 50), 200))
  )
  update public.notification_outbox n
  set status = 'processing',
      attempts = n.attempts + 1,
      updated_at = now()
  from picked
  where n.id = picked.id
  returning n.*;
end;
$$;

revoke all on function public.claim_notification_outbox_external(integer)
  from public, anon, authenticated;
grant execute on function public.claim_notification_outbox_external(integer)
  to service_role;

comment on function public.claim_notification_outbox_external(integer)
is 'Claims only external notification channels for the server-only notification-dispatch worker.';

create or replace function public.claim_notification_outbox_channel(
  p_channel text,
  p_limit integer default 50
)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_channel not in ('in_app', 'email', 'whatsapp', 'sms') then
    raise exception 'Unsupported notification channel';
  end if;

  return query
  with picked as (
    select id
    from public.notification_outbox
    where status = 'pending'
      and channel = p_channel
      and next_attempt_at <= now()
    order by created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 50), 200))
  )
  update public.notification_outbox n
  set status = 'processing',
      attempts = n.attempts + 1,
      updated_at = now()
  from picked
  where n.id = picked.id
  returning n.*;
end;
$$;

revoke all on function public.claim_notification_outbox_channel(text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_notification_outbox_channel(text, integer)
  to service_role;

comment on function public.claim_notification_outbox_channel(text, integer)
is 'Claims one notification channel for a trusted worker; external channels are never client-claimable.';
