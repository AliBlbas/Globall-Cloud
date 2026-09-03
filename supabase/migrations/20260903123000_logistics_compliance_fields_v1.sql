alter table public.warehouse_receipts
  add column if not exists has_battery boolean not null default false,
  add column if not exists has_liquid boolean not null default false,
  add column if not exists msds_provided boolean not null default false,
  add column if not exists medical_device boolean not null default false,
  add column if not exists compliance_status text not null default 'pending';

alter table public.quote_requests
  add column if not exists has_battery boolean not null default false,
  add column if not exists has_liquid boolean not null default false,
  add column if not exists msds_provided boolean not null default false,
  add column if not exists medical_device boolean not null default false,
  add column if not exists compliance_status text not null default 'pending',
  add column if not exists calculated_amount numeric,
  add column if not exists calculated_currency text,
  add column if not exists calculated_rate_key text;

create index if not exists warehouse_receipts_compliance_status_idx on public.warehouse_receipts(compliance_status);
create index if not exists quote_requests_compliance_status_idx on public.quote_requests(compliance_status);
