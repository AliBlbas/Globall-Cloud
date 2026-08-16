begin;

-- Managed account linkage and lifecycle fields
alter table public.customer_directory
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null,
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

-- Keep updated_at current
create or replace function public.tg_touch_customer_directory_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_customer_directory_updated_at on public.customer_directory;
create trigger trg_touch_customer_directory_updated_at
before update on public.customer_directory
for each row execute function public.tg_touch_customer_directory_updated_at();

-- Prevent code changes after creation
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
for each row execute function public.prevent_customer_directory_code_update();

-- Narrow customer self-service: existing customers can view/update their own profile, but cannot create accounts.
drop policy if exists customer_directory_insert_own on public.customer_directory;
drop policy if exists customer_directory_select_own on public.customer_directory;
drop policy if exists customer_directory_self_update_no_code on public.customer_directory;

create policy customer_directory_select_own
on public.customer_directory
for select
to authenticated
using (auth_user_id = auth.uid() or id = auth.uid());

create policy customer_directory_update_own
on public.customer_directory
for update
to authenticated
using (auth_user_id = auth.uid() or id = auth.uid())
with check (auth_user_id = auth.uid() or id = auth.uid());

-- A lightweight admin-friendly overview for staff dashboards.
create or replace view public.customer_directory_accounts as
select
  cd.id,
  cd.code,
  cd.name,
  cd.phone,
  cd.phone2,
  cd.email,
  cd.city,
  cd.delivery_location,
  cd.note,
  cd.auth_user_id,
  cd.is_active,
  cd.created_at,
  cd.updated_at,
  count(s.id) as shipment_count,
  coalesce(sum(coalesce(s.total_amount, 0)), 0) as total_amount,
  coalesce(sum(greatest(coalesce(s.total_amount, 0) - coalesce(s.paid_amount, 0), 0)), 0) as outstanding_amount,
  max(s.created_at) as last_shipment_at
from public.customer_directory cd
left join public.shipments s on s.directory_customer_id = cd.id
group by cd.id;

grant select on public.customer_directory_accounts to authenticated;

grant select on public.customer_directory to authenticated;

grant update on public.customer_directory to authenticated;

commit;;
