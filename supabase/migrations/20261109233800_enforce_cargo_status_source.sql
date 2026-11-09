-- Defense in depth: cargo status is derived from its parent shipment on every write.
begin;

create or replace function public.enforce_shipment_cargo_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  shipment_status text;
begin
  select coalesce(nullif(status, ''), nullif(operational_status, ''), 'received_origin')
    into shipment_status
    from public.shipments
   where id = new.shipment_id;

  if shipment_status is not null then
    new.item_status := shipment_status;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.enforce_shipment_cargo_status() from public, anon, authenticated;
grant execute on function public.enforce_shipment_cargo_status() to service_role;

drop trigger if exists shipment_cargo_status_guard on public.shipment_cargo_items;
create trigger shipment_cargo_status_guard
before insert or update of shipment_id, item_status on public.shipment_cargo_items
for each row execute function public.enforce_shipment_cargo_status();

update public.shipment_cargo_items c
   set item_status = coalesce(nullif(s.status, ''), nullif(s.operational_status, ''), 'received_origin'),
       updated_at = now()
  from public.shipments s
 where s.id = c.shipment_id
   and c.item_status is distinct from coalesce(nullif(s.status, ''), nullif(s.operational_status, ''), 'received_origin');

commit;
