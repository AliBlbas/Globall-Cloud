-- Harden customer storage and remove broad table access policies

-- 1) Prevent customer codes from being changed after creation.
create or replace function public.prevent_customer_directory_code_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.code is distinct from new.code then
    raise exception 'customer_directory.code cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_customer_directory_code_update on public.customer_directory;
create trigger trg_prevent_customer_directory_code_update
before update on public.customer_directory
for each row
execute function public.prevent_customer_directory_code_update();

-- 2) Add targeted customer policies (self-service only, plus existing staff/admin coverage).
drop policy if exists customer_directory_select_own on public.customer_directory;
create policy customer_directory_select_own
on public.customer_directory
for select
to authenticated
using (id = auth.uid());

drop policy if exists customer_directory_insert_own on public.customer_directory;
create policy customer_directory_insert_own
on public.customer_directory
for insert
to authenticated
with check (id = auth.uid());

-- 3) Remove over-broad catch-all policies so the specific policies above can do their job.
drop policy if exists allow_all_auth on public.customer_directory;
drop policy if exists allow_all_auth on public.shipments;
drop policy if exists allow_all_auth on public.messages;
drop policy if exists allow_all_auth on public.staff;
drop policy if exists allow_all_auth on public.warehouse_receipts;
drop policy if exists allow_all_auth on public.lg_orders;
drop policy if exists allow_all_auth on public.lg_shipments;
drop policy if exists allow_all_auth on public.lg_tracking_events;

-- 4) Small read-performance helper indexes for customer lookup.
create index if not exists customer_directory_phone_idx
on public.customer_directory using btree (phone);

create index if not exists customer_directory_phone2_idx
on public.customer_directory using btree (phone2);

create index if not exists customer_directory_created_at_desc_idx
on public.customer_directory using btree (created_at desc);
;
