-- Production Staff Console staging surface.
-- Public schema is used so the server-side Edge Function can access it through
-- Supabase REST; RLS plus revoked client grants keep it server-only.

begin;

create table if not exists public.excel_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_filename text not null,
  source_sha256 text not null,
  source_size_bytes bigint,
  import_status text not null default 'prepared'
    check (import_status in ('prepared', 'uploaded', 'reviewing', 'approved', 'rejected', 'committed')),
  source_row_count integer not null default 0,
  warning_count integer not null default 0,
  created_by uuid null references auth.users(id),
  approved_by uuid null references auth.users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.excel_import_rows (
  id bigint generated always as identity primary key,
  batch_id uuid not null references public.excel_import_batches(id) on delete cascade,
  source_sheet text not null,
  source_row integer not null,
  source_category text not null,
  raw_values jsonb not null default '[]'::jsonb,
  normalized_candidates jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed', 'accepted', 'needs_mapping', 'rejected')),
  mapped_entity text,
  mapped_record_id uuid,
  reviewed_by uuid null references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (batch_id, source_sheet, source_row)
);

create index if not exists excel_import_rows_batch_idx on public.excel_import_rows (batch_id, source_sheet, source_row);
create index if not exists excel_import_rows_review_idx on public.excel_import_rows (batch_id, review_status);

create or replace function public.excel_import_touch_updated_at()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists excel_import_batches_updated_at on public.excel_import_batches;
create trigger excel_import_batches_updated_at before update on public.excel_import_batches
for each row execute function public.excel_import_touch_updated_at();

alter table public.excel_import_batches enable row level security;
alter table public.excel_import_rows enable row level security;
revoke all on public.excel_import_batches, public.excel_import_rows from anon, authenticated;
grant select, insert, update on public.excel_import_batches, public.excel_import_rows to service_role;
grant usage, select on all sequences in schema public to service_role;

commit;
