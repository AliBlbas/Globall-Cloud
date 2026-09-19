create or replace function public.touch_tracking_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    if new.tracking_updated_at is null then
      new.tracking_updated_at := coalesce(new.created_at, now());
    end if;
    return new;
  end if;

  if (
    new.current_lat is distinct from old.current_lat
    or new.current_lng is distinct from old.current_lng
    or new.current_location_label is distinct from old.current_location_label
    or new.operational_status is distinct from old.operational_status
    or new.current_step_index is distinct from old.current_step_index
    or new.eta is distinct from old.eta
  ) then
    new.tracking_updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists shipments_touch_tracking_updated_at_trg on public.shipments;
create trigger shipments_touch_tracking_updated_at_trg
before insert or update on public.shipments
for each row
execute function public.touch_tracking_updated_at();

comment on function public.touch_tracking_updated_at() is 'Keeps shipment live-tracking freshness timestamp aligned with location/status/ETA changes.';;
