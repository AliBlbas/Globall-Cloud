create extension if not exists pgcrypto;

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  origin_key text not null,
  dest_key text not null,
  transport_mode text not null default 'air',
  weight_kg numeric(12,2),
  volume_cbm numeric(12,3),
  items_count integer,
  notes text,
  status text not null default 'pending' check (status in ('pending','reviewing','quoted','accepted','rejected','expired')),
  quoted_amount numeric(14,2),
  currency text not null default 'USD',
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  shipment_id text references public.shipments(id) on delete cascade,
  kind text not null default 'system',
  title text not null,
  body text,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.shipment_documents (
  id uuid primary key default gen_random_uuid(),
  shipment_id text not null references public.shipments(id) on delete cascade,
  customer_user_id uuid references auth.users(id) on delete set null,
  document_type text not null check (document_type in ('invoice','packing_list','receipt','customs','airway_bill','bill_of_lading','pod','other')),
  title text not null,
  file_url text not null,
  is_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  shipment_id text not null unique references public.shipments(id) on delete cascade,
  delivered_at timestamptz,
  receiver_name text,
  receiver_phone text,
  signature_url text,
  photo_urls jsonb not null default '[]'::jsonb,
  note text,
  latitude numeric,
  longitude numeric,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quote_requests_customer on public.quote_requests(customer_user_id, created_at desc);
create index if not exists idx_quote_requests_status on public.quote_requests(status, created_at desc);
create index if not exists idx_customer_notifications_customer on public.customer_notifications(customer_user_id, read_at, created_at desc);
create index if not exists idx_customer_notifications_shipment on public.customer_notifications(shipment_id, created_at desc);
create index if not exists idx_shipment_documents_shipment on public.shipment_documents(shipment_id, created_at desc);

alter table public.quote_requests enable row level security;
alter table public.customer_notifications enable row level security;
alter table public.shipment_documents enable row level security;
alter table public.delivery_proofs enable row level security;

create policy quote_requests_customer_select on public.quote_requests for select to authenticated using (is_staff() or customer_user_id = auth.uid());
create policy quote_requests_customer_insert on public.quote_requests for insert to authenticated with check (customer_user_id = auth.uid() or is_staff());
create policy quote_requests_staff_update on public.quote_requests for update to authenticated using (is_staff() or customer_user_id = auth.uid()) with check (is_staff() or customer_user_id = auth.uid());

create policy customer_notifications_select on public.customer_notifications for select to authenticated using (is_staff() or customer_user_id = auth.uid());
create policy customer_notifications_update on public.customer_notifications for update to authenticated using (is_staff() or customer_user_id = auth.uid()) with check (is_staff() or customer_user_id = auth.uid());
create policy customer_notifications_staff_insert on public.customer_notifications for insert to authenticated with check (is_staff());

create policy shipment_documents_select on public.shipment_documents for select to authenticated using (is_staff() or (customer_user_id = auth.uid()) or is_public);
create policy shipment_documents_staff_insert on public.shipment_documents for insert to authenticated with check (is_staff());
create policy shipment_documents_staff_update on public.shipment_documents for update to authenticated using (is_staff()) with check (is_staff());
create policy shipment_documents_staff_delete on public.shipment_documents for delete to authenticated using (is_staff());

create policy delivery_proofs_select on public.delivery_proofs for select to authenticated using (is_staff() or exists (select 1 from public.shipments s where s.id = delivery_proofs.shipment_id and s.customer_user_id = auth.uid()));
create policy delivery_proofs_staff_insert on public.delivery_proofs for insert to authenticated with check (is_staff() and created_by = auth.uid());
create policy delivery_proofs_staff_update on public.delivery_proofs for update to authenticated using (is_staff()) with check (is_staff());

create or replace function public.set_logistics_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_quote_requests_updated_at on public.quote_requests;
create trigger trg_quote_requests_updated_at before update on public.quote_requests for each row execute function public.set_logistics_updated_at();
drop trigger if exists trg_delivery_proofs_updated_at on public.delivery_proofs;
create trigger trg_delivery_proofs_updated_at before update on public.delivery_proofs for each row execute function public.set_logistics_updated_at();;
