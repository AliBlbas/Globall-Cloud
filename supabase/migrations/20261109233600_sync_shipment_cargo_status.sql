-- Keep shipment_cargo_items.item_status aligned with the canonical shipment status.
-- Shipment status is the source of truth for customer-facing lifecycle state.
begin;

create or replace function public.sync_shipment_cargo_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(new.status, '') is distinct from coalesce(old.status, '')
     or coalesce(new.operational_status, '') is distinct from coalesce(old.operational_status, '') then
    update public.shipment_cargo_items
       set item_status = coalesce(nullif(new.status, ''), nullif(new.operational_status, ''), 'received_origin'),
           updated_at = now()
     where shipment_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_shipment_cargo_status() from public, anon, authenticated;
grant execute on function public.sync_shipment_cargo_status() to service_role;

drop trigger if exists shipments_sync_cargo_status on public.shipments;
create trigger shipments_sync_cargo_status
after update of status, operational_status on public.shipments
for each row execute function public.sync_shipment_cargo_status();

-- Repair existing drift once, using the canonical operational status first.
update public.shipment_cargo_items c
   set item_status = coalesce(nullif(s.status, ''), nullif(s.operational_status, ''), 'received_origin'),
       updated_at = now()
  from public.shipments s
 where s.id = c.shipment_id
   and c.item_status is distinct from coalesce(nullif(s.status, ''), nullif(s.operational_status, ''), 'received_origin');

commit;
