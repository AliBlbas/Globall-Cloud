begin;

alter table public.staff
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.tg_touch_staff_updated_at()
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

drop trigger if exists trg_touch_staff_updated_at on public.staff;
create trigger trg_touch_staff_updated_at
before update on public.staff
for each row execute function public.tg_touch_staff_updated_at();

commit;;
