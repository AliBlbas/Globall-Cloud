create or replace function public.handle_delivery_proof_completion()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  shipment_row public.shipments%rowtype;
  assignment_id uuid;
  notification_exists boolean;
begin
  select * into shipment_row
  from public.shipments
  where id = new.shipment_id
  for update;

  if not found then
    return new;
  end if;

  select da.id into assignment_id
  from public.delivery_assignments da
  where da.shipment_id = new.shipment_id
    and da.status not in ('delivered','cancelled')
  order by da.created_at desc
  limit 1;

  if assignment_id is not null then
    update public.delivery_assignments
    set status = 'delivered',
        delivered_at = coalesce(new.delivered_at, now()),
        proof_id = new.id,
        note = coalesce(new.note, note),
        updated_at = now()
    where id = assignment_id;
  end if;

  update public.shipments
  set operational_status = 'delivered',
      current_step_index = greatest(coalesce(current_step_index, 0), 5),
      step_dates = jsonb_set(coalesce(step_dates, '{}'::jsonb), '{delivered}', to_jsonb(coalesce(new.delivered_at, now())), true)
  where id = new.shipment_id;

  insert into public.shipment_tracking_events (
    shipment_id, status_key, title, note, location_label, lat, lng,
    occurred_at, photos, created_by, created_at, is_public
  )
  select
    new.shipment_id,
    'delivered',
    'Shipment delivered',
    coalesce(new.note, 'Delivery proof recorded.'),
    null,
    new.latitude,
    new.longitude,
    coalesce(new.delivered_at, now()),
    coalesce(new.photo_urls, '[]'::jsonb),
    new.created_by,
    now(),
    true
  where not exists (
    select 1
    from public.shipment_tracking_events ste
    where ste.shipment_id = new.shipment_id
      and ste.status_key = 'delivered'
      and ste.occurred_at >= coalesce(new.delivered_at, now()) - interval '5 minutes'
      and ste.occurred_at <= coalesce(new.delivered_at, now()) + interval '5 minutes'
  );

  if shipment_row.customer_user_id is not null then
    select exists (
      select 1
      from public.customer_notifications cn
      where cn.customer_user_id = shipment_row.customer_user_id
        and cn.shipment_id = new.shipment_id
        and cn.kind = 'delivery_completed'
        and cn.created_at >= now() - interval '24 hours'
    ) into notification_exists;

    if not notification_exists then
      insert into public.customer_notifications (
        customer_user_id, shipment_id, kind, title, body, action_url
      ) values (
        shipment_row.customer_user_id,
        new.shipment_id,
        'delivery_completed',
        'Shipment delivered',
        'Your shipment has been delivered successfully.',
        '/?track=' || new.shipment_id
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists delivery_proofs_completion_automation_trg on public.delivery_proofs;
create trigger delivery_proofs_completion_automation_trg
after insert on public.delivery_proofs
for each row
execute function public.handle_delivery_proof_completion();;
