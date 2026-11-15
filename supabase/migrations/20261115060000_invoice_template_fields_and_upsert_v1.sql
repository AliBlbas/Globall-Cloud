-- Globall Cloud invoice template fields and protected upsert contract.
alter table public.shipment_invoices
  add column if not exists receipt_no text,
  add column if not exists invoice_date date not null default current_date,
  add column if not exists bill_to_name text,
  add column if not exists bill_to_address text,
  add column if not exists payment_method text,
  add column if not exists notes text,
  add column if not exists additional_charges numeric(14,2) not null default 0;

create index if not exists shipment_invoices_receipt_no_idx
  on public.shipment_invoices(receipt_no) where receipt_no is not null;

create or replace function public.upsert_shipment_invoice_template(
  p_actor_id uuid, p_invoice_number text, p_shipment_id text,
  p_line_items jsonb default '[]'::jsonb, p_subtotal numeric default 0,
  p_discount numeric default 0, p_additional_charges numeric default 0,
  p_tax numeric default 0, p_currency text default 'USD', p_status text default 'draft',
  p_invoice_date date default current_date, p_due_at timestamptz default null,
  p_receipt_no text default null, p_bill_to_name text default null,
  p_bill_to_address text default null, p_payment_method text default null,
  p_notes text default null
)
returns public.shipment_invoices
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype; v_invoice public.shipment_invoices%rowtype;
  v_subtotal numeric(14,2) := greatest(0, round(coalesce(p_subtotal,0),2));
  v_discount numeric(14,2) := greatest(0, round(coalesce(p_discount,0),2));
  v_additional numeric(14,2) := greatest(0, round(coalesce(p_additional_charges,0),2));
  v_tax numeric(14,2) := greatest(0, round(coalesce(p_tax,0),2));
  v_total numeric(14,2); v_status text := lower(trim(coalesce(p_status,'draft')));
  v_currency text := upper(trim(coalesce(p_currency,'USD'))); v_name text;
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id=p_actor_id and is_active=true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_actor.role not in ('admin','super_admin','accountant') then raise exception 'Finance role required'; end if;
  if nullif(trim(p_invoice_number),'') is null or nullif(trim(p_shipment_id),'') is null then raise exception 'Invoice number and shipment are required'; end if;
  if not exists(select 1 from public.shipments where id=trim(p_shipment_id)) then raise exception 'Shipment not found'; end if;
  if v_status not in ('draft','issued','partially_paid','paid','overdue','void') then raise exception 'Unsupported invoice status'; end if;
  if v_currency not in ('USD','IQD','AED','CNY','EUR') then raise exception 'Unsupported invoice currency'; end if;
  v_total := greatest(0, v_subtotal-v_discount+v_additional+v_tax);
  select coalesce(nullif(trim(p_bill_to_name),''),s.customer_name) into v_name from public.shipments s where s.id=trim(p_shipment_id);
  insert into public.shipment_invoices(invoice_number,shipment_id,customer_user_id,line_items,subtotal,discount,tax,total,currency,status,due_at,issued_at,created_by,updated_by,receipt_no,invoice_date,bill_to_name,bill_to_address,payment_method,notes,additional_charges)
  select upper(trim(p_invoice_number)),s.id,s.customer_user_id,coalesce(p_line_items,'[]'::jsonb),v_subtotal,v_discount,v_tax,v_total,v_currency,v_status,p_due_at,case when v_status<>'draft' then coalesce(public.shipment_invoices.issued_at, now()) else public.shipment_invoices.issued_at end,p_actor_id,p_actor_id,nullif(trim(p_receipt_no),''),coalesce(p_invoice_date,current_date),v_name,nullif(trim(p_bill_to_address),''),nullif(trim(p_payment_method),''),nullif(trim(p_notes),''),v_additional from public.shipments s where s.id=trim(p_shipment_id)
  on conflict(invoice_number) do update set shipment_id=excluded.shipment_id,customer_user_id=excluded.customer_user_id,line_items=excluded.line_items,subtotal=excluded.subtotal,discount=excluded.discount,tax=excluded.tax,total=excluded.total,currency=excluded.currency,status=excluded.status,due_at=excluded.due_at,issued_at=case when excluded.status<>'draft' then coalesce(public.shipment_invoices.issued_at,excluded.issued_at) else public.shipment_invoices.issued_at end,receipt_no=excluded.receipt_no,invoice_date=excluded.invoice_date,bill_to_name=excluded.bill_to_name,bill_to_address=excluded.bill_to_address,payment_method=excluded.payment_method,notes=excluded.notes,additional_charges=excluded.additional_charges,updated_by=p_actor_id,updated_at=now()
  returning * into v_invoice;
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details) values(p_actor_id,v_actor.full_name,'upsert_shipment_invoice_template',trim(p_shipment_id),jsonb_build_object('invoice_number',p_invoice_number,'total',v_total,'status',v_status));
  return v_invoice;
end; $$;
revoke all on function public.upsert_shipment_invoice_template(uuid,text,text,jsonb,numeric,numeric,numeric,numeric,text,text,date,timestamptz,text,text,text,text,text) from public,anon;
grant execute on function public.upsert_shipment_invoice_template(uuid,text,text,jsonb,numeric,numeric,numeric,numeric,text,text,date,timestamptz,text,text,text,text,text) to authenticated,service_role;
