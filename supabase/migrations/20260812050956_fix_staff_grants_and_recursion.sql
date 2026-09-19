-- Restore missing base grants for the authenticated role on staff.
-- Without SELECT/DELETE here, Postgres blocks access before RLS is
-- even evaluated, regardless of how the policies are written.
grant select, delete on public.staff to authenticated;

-- is_admin()/is_staff() are used inside staff's own RLS policies but
-- were SECURITY INVOKER, so their internal query against staff was
-- itself subject to the same RLS -> infinite recursion (stack depth
-- limit exceeded) for any authenticated caller. Making them SECURITY
-- DEFINER lets them check membership without re-triggering RLS. Safe:
-- they only ever return a boolean, and search_path is already pinned.
alter function public.is_admin() security definer;
alter function public.is_staff() security definer;;
