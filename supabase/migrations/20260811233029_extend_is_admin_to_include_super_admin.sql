-- is_admin() previously matched role = 'admin' only, so every policy built on
-- it (messages_update/delete, staff_insert/update/delete) silently excluded
-- super_admin -- a role that should be a superset of admin, not a peer that's
-- excluded. app_settings' hand-written policies already use the correct
-- pattern (role = ANY (ARRAY['admin','super_admin'])); this makes is_admin()
-- match that same, evidently-intended semantics everywhere it's used.
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.staff s
    where s.id = auth.uid()
      and s.role = any (array['admin','super_admin'])
  );
$function$;;
