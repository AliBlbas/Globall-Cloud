-- Ensure every staff account has a profile/settings row.
insert into public.staff_profiles (staff_id, locale, timezone, notification_preferences)
select s.id, 'ckb', 'Asia/Baghdad', '{}'::jsonb
from public.staff s
left join public.staff_profiles p on p.staff_id=s.id
where p.staff_id is null;

create or replace function public.ensure_staff_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.staff_profiles (staff_id, locale, timezone, notification_preferences)
  values (new.id, 'ckb', 'Asia/Baghdad', '{}'::jsonb)
  on conflict (staff_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.ensure_staff_profile() from public, anon, authenticated;

drop trigger if exists staff_profile_bootstrap on public.staff;
create trigger staff_profile_bootstrap
after insert on public.staff
for each row execute function public.ensure_staff_profile();
