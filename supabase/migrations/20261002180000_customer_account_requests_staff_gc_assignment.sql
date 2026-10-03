begin;

-- Public visitors request access; only authorized staff create the customer row
-- and the database sequence assigns its GC code.
create table if not exists public.customer_account_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  email text not null check (char_length(trim(email)) between 5 and 180),
  phone text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  staff_note text,
  customer_id uuid references public.customer_directory(id) on delete set null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_account_requests_status_created_idx
  on public.customer_account_requests (status, created_at desc);
create unique index if not exists customer_account_requests_pending_email_uidx
  on public.customer_account_requests (lower(email)) where status = 'pending';

alter table public.customer_account_requests enable row level security;
revoke all on table public.customer_account_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.customer_account_requests to service_role;

-- Fail closed if an older public registration Edge Function is still deployed.
revoke execute on function public.register_customer_with_gc(uuid,text,text,text) from public, anon, authenticated, service_role;

commit;
