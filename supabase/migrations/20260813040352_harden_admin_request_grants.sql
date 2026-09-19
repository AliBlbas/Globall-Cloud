revoke all on table public.admin_action_requests from anon;
revoke all on table public.staff_permissions from anon;
revoke all on function public.set_admin_action_request_review(bigint,text) from anon, public;
grant select,insert on public.admin_action_requests to authenticated;
grant update,delete on public.admin_action_requests to authenticated;
grant select on public.staff_permissions to authenticated;
grant insert,update,delete on public.staff_permissions to authenticated;
;
