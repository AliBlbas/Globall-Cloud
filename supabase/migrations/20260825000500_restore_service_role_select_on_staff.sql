-- Globall Cloud: restore the trusted server read path for Staff authorization.
-- Forward-only and idempotent. The service_role key remains backend-only;
-- browser clients continue to be governed by RLS and do not receive this grant.

begin;

grant select on table public.staff to service_role;

commit;

