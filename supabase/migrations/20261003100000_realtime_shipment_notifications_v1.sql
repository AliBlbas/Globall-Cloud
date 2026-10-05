-- Globall Cloud: realtime shipment notifications for customers and staff.
-- The trigger is idempotent through customer_notifications.event_key and staff_alerts.entity_id.

alter table public.customer_notifications add column if not exists event_key text;
create unique index if not exists customer_notifications_event_key_uidx
  on public.customer_notifications(event_key)
  where event_key is not null;

create or replace function public.emit_shipment_realtime_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shipment_row public.shipments%rowtype;
  event_key_value text;
  title_value text;
  body_value text;
  action_value text;
begin
  select * into shipment_row from public.shipments where id = new.shipment_id;
  event_key_value := 'shipment-event:' || new.id::text;
  title_value := coalesce(new.title, 'نوێکردنەوەی بار');
  body_value := coalesce(new.note, 'دۆخی بار نوێکرایەوە.') || case when new.location_label is not null then ' · ' || new.location_label else '' end;
  action_value := '/customer-portal.html#shipment-' || new.shipment_id::text;

  if shipment_row.customer_user_id is not null then
    insert into public.customer_notifications(customer_user_id, shipment_id, kind, title, body, action_url, event_key)
    values (shipment_row.customer_user_id, new.shipment_id, 'shipment_update', title_value, body_value, action_value, event_key_value)
    on conflict (event_key) do nothing;
  end if;

  insert into public.staff_alerts(kind, title, body, entity_type, entity_id, action_url, severity, audience_role, read_by)
  select 'shipment_update', title_value, body_value, 'shipment', new.shipment_id::text,
         '/staff-os-v5.html#shipments',
         case when new.status_key in ('delivered','cancelled') then 'high' else 'normal' end,
         null, '{}'::uuid[]
  where not exists (
    select 1 from public.staff_alerts
    where entity_type = 'shipment_event' and entity_id = new.id::text
  );

  update public.staff_alerts
     set entity_type = 'shipment_event', entity_id = new.id::text
   where entity_type = 'shipment' and entity_id = new.shipment_id::text
     and created_at = (select max(created_at) from public.staff_alerts where entity_type = 'shipment' and entity_id = new.shipment_id::text);

  return new;
end;
$$;

drop trigger if exists trg_emit_shipment_realtime_notifications on public.shipment_tracking_events;
create trigger trg_emit_shipment_realtime_notifications
after insert on public.shipment_tracking_events
for each row execute function public.emit_shipment_realtime_notifications();

create or replace function public.emit_warehouse_realtime_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shipment_row public.shipments%rowtype;
  event_key_value text;
  location_value text;
begin
  if new.shipment_id is null then return new; end if;
  select * into shipment_row from public.shipments where id = new.shipment_id;
  location_value := coalesce(new.location, new.warehouse, 'warehouse');
  event_key_value := 'warehouse-receipt:' || new.id::text;
  if shipment_row.customer_user_id is not null then
    insert into public.customer_notifications(customer_user_id, shipment_id, kind, title, body, action_url, event_key)
    values (shipment_row.customer_user_id, new.shipment_id, 'warehouse_received', 'بارەکەت لە کۆگا وەرگیرا',
      'بارەکەت لە ' || location_value || ' وەرگیرا. ' || coalesce(new.carton_count::text || ' کارتۆن', ''),
      '/customer-portal.html#receipts', event_key_value)
    on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_emit_warehouse_realtime_notification on public.warehouse_receipts;
create trigger trg_emit_warehouse_realtime_notification
after insert on public.warehouse_receipts
for each row execute function public.emit_warehouse_realtime_notification();

do $$
begin
  alter publication supabase_realtime add table public.customer_notifications;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.staff_alerts;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.warehouse_receipts;
exception when duplicate_object then null;
end $$;

grant select, insert, update on public.customer_notifications to service_role;
grant select, insert, update on public.staff_alerts to service_role;
