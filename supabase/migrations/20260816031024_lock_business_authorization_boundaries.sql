-- Lock authoritative business data behind staff/admin workflows.
-- Customers remain read-only for shipments and customer directory.
-- Staff roles cannot self-promote or self-deactivate through direct table writes.

-- SHIPMENTS: source-of-truth records are managed by staff/operations only.
drop policy if exists shipments_insert_guest on public.shipments;
drop policy if exists shipments_insert on public.shipments;
drop policy if exists shipments_update on public.shipments;
drop policy if exists shipments_delete on public.shipments;

create policy shipments_staff_insert
on public.shipments
for insert to authenticated
with check ((select is_staff()));

create policy shipments_staff_update
on public.shipments
for update to authenticated
using ((select is_staff()))
with check ((select is_staff()));

create policy shipments_staff_delete
on public.shipments
for delete to authenticated
using ((select is_admin()));

-- Keep the customer/staff read boundary exactly scoped to ownership/staff.
-- SHIPMENTS read policy remains unchanged.

-- CUSTOMER DIRECTORY: customers can read their own record but cannot mutate
-- administrative fields (status, manager, auth link, etc.) directly.
drop policy if exists customer_directory_update on public.customer_directory;
create policy customer_directory_update_staff
on public.customer_directory
for update to authenticated
using ((select is_staff()))
with check ((select is_staff()));

drop policy if exists customer_directory_delete on public.customer_directory;
create policy customer_directory_delete_staff
on public.customer_directory
for delete to authenticated
using ((select is_staff()));

-- STAFF: account/role lifecycle is an administrative operation.
drop policy if exists staff_insert on public.staff;
drop policy if exists staff_update on public.staff;
drop policy if exists staff_delete on public.staff;

create policy staff_insert_admin
on public.staff
for insert to authenticated
with check ((select is_admin()));

create policy staff_update_admin
on public.staff
for update to authenticated
using ((select is_admin()))
with check ((select is_admin()));

create policy staff_delete_admin
on public.staff
for delete to authenticated
using ((select is_admin()));

-- CUSTOMER NOTIFICATIONS: customers may only mark their own notification as read;
-- content/recipient ownership cannot be changed by the customer.
create or replace function public.guard_customer_notification_update()
returns trigger
language plpgsql
as $$
begin
  if not (select is_staff()) then
    if new.customer_user_id is distinct from old.customer_user_id
       or new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.created_at is distinct from old.created_at then
      raise exception 'Customer notifications are immutable except read_at';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_customer_notification_update on public.customer_notifications;
create trigger guard_customer_notification_update
before update on public.customer_notifications
for each row execute function public.guard_customer_notification_update();

-- QUOTE REQUESTS: customers may edit request details, but never quote/approval
-- fields or ownership.
create or replace function public.guard_quote_request_update()
returns trigger
language plpgsql
as $$
begin
  if not (select is_staff()) then
    if new.id is distinct from old.id
       or new.customer_user_id is distinct from old.customer_user_id
       or new.status is distinct from old.status
       or new.quoted_amount is distinct from old.quoted_amount
       or new.currency is distinct from old.currency
       or new.valid_until is distinct from old.valid_until
       or new.created_at is distinct from old.created_at then
      raise exception 'Quote approval fields are controlled by staff';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_quote_request_update on public.quote_requests;
create trigger guard_quote_request_update
before update on public.quote_requests
for each row execute function public.guard_quote_request_update();

-- Customers do not need direct write access to shipment data or customer admin data.
-- Keep quote creation and read access as the customer workflow.
