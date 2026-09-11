begin;

-- Forward-only repair for the trusted Staff Console logging path.
-- Keep service_role as the server-side owner; do not broaden client privileges.
grant select, insert, update, delete on table public.staff_activity_log to service_role;

commit;
