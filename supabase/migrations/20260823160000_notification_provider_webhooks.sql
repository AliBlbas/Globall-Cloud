-- Expand notification delivery audit to the providers used by the worker.
-- This migration is additive and keeps notification_outbox as the retry source of truth.
alter table public.notification_delivery_events
  drop constraint if exists notification_delivery_events_provider_check;

alter table public.notification_delivery_events
  add constraint notification_delivery_events_provider_check
  check (provider in ('resend', 'whatsapp', 'twilio', 'gmail'));

create index if not exists notification_delivery_events_provider_recipient_idx
  on public.notification_delivery_events(provider, recipient, occurred_at desc);

create or replace function public.record_notification_delivery_event(
  p_provider text,
  p_provider_event_id text,
  p_provider_message_id text,
  p_status text,
  p_recipient text default null,
  p_occurred_at timestamptz default now(),
  p_raw_payload jsonb default '{}'::jsonb
)
returns public.notification_delivery_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.notification_delivery_events%rowtype;
  v_outbox public.notification_outbox%rowtype;
  v_status_rank integer;
  v_old_rank integer;
  v_channel text;
begin
  if p_provider not in ('resend','whatsapp','twilio','gmail') then raise exception 'Unsupported notification provider'; end if;
  if p_status not in ('accepted','sent','delivered','read','failed','rejected') then raise exception 'Unsupported delivery status'; end if;
  if nullif(trim(p_provider_event_id), '') is null then raise exception 'Provider event id is required'; end if;

  insert into public.notification_delivery_events(provider, provider_event_id, provider_message_id, status, recipient, occurred_at, raw_payload)
  values (p_provider, trim(p_provider_event_id), nullif(trim(p_provider_message_id), ''), p_status, p_recipient, coalesce(p_occurred_at, now()), coalesce(p_raw_payload, '{}'::jsonb))
  on conflict (provider, provider_event_id) do nothing
  returning * into v_event;

  if v_event.id is null then
    select * into v_event
      from public.notification_delivery_events
     where provider = p_provider and provider_event_id = trim(p_provider_event_id);
    return v_event;
  end if;

  v_channel := case when p_provider in ('resend','gmail') then 'email' when p_provider = 'whatsapp' then 'whatsapp' else 'sms' end;
  if v_event.provider_message_id is not null then
    select * into v_outbox from public.notification_outbox where provider_message_id = v_event.provider_message_id limit 1;
    if v_outbox.id is null then
      select * into v_outbox
        from public.notification_outbox
       where recipient = v_event.recipient
         and channel = v_channel
         and status in ('processing','sent','pending')
       order by created_at desc
       limit 1;
    end if;
  end if;

  if v_outbox.id is not null then
    v_status_rank := case p_status when 'accepted' then 1 when 'sent' then 2 when 'delivered' then 3 when 'read' then 4 else 0 end;
    v_old_rank := case coalesce(v_outbox.provider_status, '') when 'accepted' then 1 when 'sent' then 2 when 'delivered' then 3 when 'read' then 4 else 0 end;
    update public.notification_outbox
       set provider_message_id = coalesce(provider_message_id, v_event.provider_message_id),
           provider_status = case when p_status in ('failed','rejected') or v_status_rank >= v_old_rank then p_status else provider_status end,
           delivered_at = case when p_status in ('delivered','read') then coalesce(delivered_at, v_event.occurred_at) else delivered_at end,
           read_at = case when p_status = 'read' then coalesce(read_at, v_event.occurred_at) else read_at end,
           updated_at = now()
     where id = v_outbox.id;
  end if;
  return v_event;
end;
$$;

revoke all on function public.record_notification_delivery_event(text,text,text,text,text,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.record_notification_delivery_event(text,text,text,text,text,timestamptz,jsonb) to service_role;

do $$
begin
  begin
    alter publication supabase_realtime add table public.notification_delivery_events;
  exception when duplicate_object then
    null;
  end;
end $$;
