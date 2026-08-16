create table if not exists public.admin_action_requests (
  id bigint generated always as identity primary key,
  request_type text not null check (request_type in ('shipment_edit','refund','rate_change','staff_access','account_adjustment','other')),
  target_id text,
  title text not null,
  details text,
  amount numeric,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_by uuid not null references public.staff(id),
  reviewed_by uuid references public.staff(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_action_requests_status_idx on public.admin_action_requests(status, created_at desc);
create index if not exists admin_action_requests_requested_by_idx on public.admin_action_requests(requested_by);

create table if not exists public.staff_permissions (
  staff_id uuid not null references public.staff(id) on delete cascade,
  permission text not null,
  granted_by uuid references public.staff(id),
  created_at timestamptz not null default now(),
  primary key (staff_id, permission)
);

create index if not exists staff_permissions_permission_idx on public.staff_permissions(permission);

alter table public.admin_action_requests enable row level security;
alter table public.staff_permissions enable row level security;

create policy "admin action requests staff read" on public.admin_action_requests for select to authenticated using (is_staff());
create policy "admin action requests staff create" on public.admin_action_requests for insert to authenticated with check (is_staff() and requested_by = (select auth.uid()));
create policy "admin action requests admin update" on public.admin_action_requests for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin action requests admin delete" on public.admin_action_requests for delete to authenticated using (is_admin());

create policy "staff permissions self read" on public.staff_permissions for select to authenticated using (staff_id = (select auth.uid()) or is_admin());
create policy "staff permissions admin write" on public.staff_permissions for all to authenticated using (is_admin()) with check (is_admin());

create or replace function public.set_admin_action_request_review(p_request_id bigint, p_status text)
returns public.admin_action_requests
language plpgsql
security invoker
set search_path = public
as $$
declare r public.admin_action_requests;
begin
  if not is_admin() then raise exception 'admin access required'; end if;
  if p_status not in ('approved','rejected','cancelled') then raise exception 'invalid review status'; end if;
  update public.admin_action_requests
     set status=p_status, reviewed_by=(select auth.uid()), reviewed_at=now(), updated_at=now()
   where id=p_request_id returning * into r;
  if r.id is null then raise exception 'request not found'; end if;
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details)
  select s.id,s.full_name,'review_admin_action_request',r.id::text,format('%s → %s',r.request_type,p_status)
  from public.staff s where s.id=(select auth.uid());
  return r;
end;
$$;
revoke all on function public.set_admin_action_request_review(bigint,text) from public, anon;
grant execute on function public.set_admin_action_request_review(bigint,text) to authenticated;
;
