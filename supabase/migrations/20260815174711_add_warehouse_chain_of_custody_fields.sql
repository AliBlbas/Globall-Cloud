alter table public.warehouse_receipts
  add column if not exists shipment_id text,
  add column if not exists scan_code text,
  add column if not exists scan_type text default 'qr',
  add column if not exists scanned_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_status text default 'pending';

alter table public.warehouse_receipts
  add constraint warehouse_receipts_shipment_fk
  foreign key (shipment_id) references public.shipments(id)
  on update cascade on delete set null;

create index if not exists warehouse_receipts_shipment_id_idx
  on public.warehouse_receipts (shipment_id, received_at desc);
create index if not exists warehouse_receipts_scan_code_idx
  on public.warehouse_receipts (scan_code)
  where scan_code is not null;
create index if not exists warehouse_receipts_verification_idx
  on public.warehouse_receipts (verification_status, received_at desc);

create or replace function public.normalize_warehouse_scan_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.scan_code := nullif(upper(trim(new.scan_code)), '');
  new.scan_type := lower(coalesce(nullif(trim(new.scan_type), ''), 'qr'));
  if new.scan_type not in ('qr','barcode') then
    raise exception 'Unsupported warehouse scan type';
  end if;
  new.verification_status := lower(coalesce(nullif(trim(new.verification_status), ''), 'pending'));
  if new.verification_status not in ('pending','verified','rejected') then
    raise exception 'Unsupported warehouse verification status';
  end if;
  if new.scan_code is not null and new.scanned_at is null then
    new.scanned_at := now();
  end if;
  if new.verification_status = 'verified' and new.verified_at is null then
    new.verified_at := now();
  end if;
  if new.verification_status <> 'verified' then
    new.verified_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists warehouse_receipts_normalize_scan_trg on public.warehouse_receipts;
create trigger warehouse_receipts_normalize_scan_trg
before insert or update of shipment_id,scan_code,scan_type,verification_status,scanned_at,verified_at
on public.warehouse_receipts
for each row execute function public.normalize_warehouse_scan_fields();

alter table public.warehouse_receipts
  drop constraint if exists warehouse_receipts_verification_status_chk;
alter table public.warehouse_receipts
  add constraint warehouse_receipts_verification_status_chk
  check (verification_status in ('pending','verified','rejected'));

alter table public.warehouse_receipts
  drop constraint if exists warehouse_receipts_scan_type_chk;
alter table public.warehouse_receipts
  add constraint warehouse_receipts_scan_type_chk
  check (scan_type in ('qr','barcode'));;
