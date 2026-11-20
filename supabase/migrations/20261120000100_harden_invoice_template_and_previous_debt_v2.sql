-- Globall Cloud invoice financial integrity v2.
-- Adds the workbook's prior-debt and IQD-rate snapshot to each USD invoice.
begin;

alter table public.shipment_invoices
  add column if not exists previous_debt numeric(14,2) not null default 0,
  add column if not exists iqd_exchange_rate numeric(14,4),
  add column if not exists total_iqd numeric(18,0);

-- The v1 browser-callable overload is superseded by the Edge Function contract.
-- Only service_role may execute the new function; actor role and id are checked below.
revoke all on function public.upsert_shipment_invoice_template(
  uuid,text,text,jsonb,numeric,numeric,numeric,numeric,text,text,date,timestamptz,text,text,text,text,text
) from public, anon, authenticated, service_role;

create or replace function public.upsert_shipment_invoice_template(
  p_actor_id uuid,
  p_invoice_number text,
  p_shipment_id text,
  p_line_items jsonb default '[]'::jsonb,
  p_subtotal numeric default 0,
  p_discount numeric default 0,
  p_previous_debt numeric default 0,
  p_additional_charges numeric default 0,
  p_tax numeric default 0,
  p_currency text default 'USD',
  p_status text default 'issued',
  p_invoice_date date default current_date,
  p_due_at timestamptz default null,
  p_receipt_no text default null,
  p_bill_to_name text default null,
  p_bill_to_address text default null,
  p_payment_method text default null,
  p_notes text default null,
  p_iqd_exchange_rate numeric default null
)
returns public.shipment_invoices
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_shipment public.shipments%rowtype;
  v_invoice public.shipment_invoices%rowtype;
  v_shipment_uuid uuid;
  v_invoice_number text := upper(trim(coalesce(p_invoice_number, '')));
  v_subtotal numeric(14,2) := round(coalesce(p_subtotal, 0), 2);
  v_discount numeric(14,2) := round(coalesce(p_discount, 0), 2);
  v_previous_debt numeric(14,2) := round(coalesce(p_previous_debt, 0), 2);
  v_additional numeric(14,2) := round(coalesce(p_additional_charges, 0), 2);
  v_tax numeric(14,2) := round(coalesce(p_tax, 0), 2);
  v_total numeric(14,2);
  v_rate numeric(14,4);
  v_total_iqd numeric(18,0);
  v_status text := lower(trim(coalesce(p_status, 'issued')));
  v_currency text := upper(trim(coalesce(p_currency, 'USD')));
begin
  if p_actor_id is null then
    raise exception 'Active finance actor is required';
  end if;
  if auth.uid() is not null and auth.uid() <> p_actor_id then
    raise exception 'Actor mismatch';
  end if;

  select * into v_actor
  from public.staff
  where id = p_actor_id and is_active = true;

  if not found then
    raise exception 'Active staff account required';
  end if;
  if v_actor.role not in ('admin', 'super_admin', 'accountant') then
    raise exception 'Finance role required';
  end if;

  if v_invoice_number = '' or nullif(trim(p_shipment_id), '') is null then
    raise exception 'Invoice number and shipment are required';
  end if;
  begin
    v_shipment_uuid := trim(p_shipment_id)::uuid;
  exception when invalid_text_representation then
    raise exception 'Shipment must be selected from the registered shipment list';
  end;

  select * into v_shipment
  from public.shipments
  where id = v_shipment_uuid;

  if not found then
    raise exception 'Shipment not found';
  end if;

  if v_subtotal < 0 or v_discount < 0 or v_previous_debt < 0 or v_additional < 0 or v_tax < 0 then
    raise exception 'Invoice amounts cannot be negative';
  end if;
  if v_currency not in ('USD', 'IQD', 'AED', 'CNY', 'EUR') then
    raise exception 'Unsupported invoice currency';
  end if;
  if v_status not in ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void') then
    raise exception 'Unsupported invoice status';
  end if;

  v_total := greatest(0, v_subtotal - v_discount + v_previous_debt + v_additional + v_tax);
  v_rate := case
    when p_iqd_exchange_rate is null or p_iqd_exchange_rate <= 0 then null
    else round(p_iqd_exchange_rate, 4)
  end;
  if v_currency = 'USD' and v_rate is not null then
    v_total_iqd := round(v_total * v_rate, 0)::numeric(18,0);
  else
    v_total_iqd := null;
  end if;

  insert into public.shipment_invoices (
    invoice_number, shipment_id, customer_user_id, line_items,
    subtotal, discount, tax, total, currency, status, due_at, issued_at,
    created_by, updated_by, receipt_no, invoice_date, bill_to_name,
    bill_to_address, payment_method, notes, additional_charges,
    previous_debt, iqd_exchange_rate, total_iqd
  )
  values (
    v_invoice_number, v_shipment.id::text, v_shipment.customer_user_id,
    coalesce(p_line_items, '[]'::jsonb),
    v_subtotal, v_discount, v_tax, v_total, v_currency, v_status, p_due_at,
    case when v_status <> 'draft' then now() else null end,
    p_actor_id, p_actor_id, nullif(trim(p_receipt_no), ''),
    coalesce(p_invoice_date, current_date),
    coalesce(nullif(trim(p_bill_to_name), ''), v_shipment.customer_name),
    nullif(trim(p_bill_to_address), ''),
    nullif(trim(p_payment_method), ''),
    nullif(trim(p_notes), ''),
    v_additional, v_previous_debt, v_rate, v_total_iqd
  )
  on conflict (invoice_number) do update set
    line_items = excluded.line_items,
    subtotal = excluded.subtotal,
    discount = excluded.discount,
    tax = excluded.tax,
    total = excluded.total,
    currency = excluded.currency,
    status = case
      when public.shipment_invoices.paid_total >= excluded.total
        and public.shipment_invoices.paid_total > 0 then 'paid'
      when public.shipment_invoices.paid_total > 0 then 'partially_paid'
      else excluded.status
    end,
    due_at = excluded.due_at,
    issued_at = case
      when excluded.status <> 'draft'
        then coalesce(public.shipment_invoices.issued_at, excluded.issued_at)
      else public.shipment_invoices.issued_at
    end,
    receipt_no = excluded.receipt_no,
    invoice_date = excluded.invoice_date,
    bill_to_name = excluded.bill_to_name,
    bill_to_address = excluded.bill_to_address,
    payment_method = excluded.payment_method,
    notes = excluded.notes,
    additional_charges = excluded.additional_charges,
    previous_debt = excluded.previous_debt,
    iqd_exchange_rate = excluded.iqd_exchange_rate,
    total_iqd = excluded.total_iqd,
    updated_by = p_actor_id,
    updated_at = now()
  where public.shipment_invoices.shipment_id = excluded.shipment_id
    and public.shipment_invoices.paid_total <= excluded.total
  returning * into v_invoice;

  if not found then
    raise exception 'Invoice number is already assigned to another shipment, or the new total is below the amount already paid';
  end if;

  insert into public.staff_activity_log (
    staff_id, staff_name, action, target_id, details
  )
  values (
    p_actor_id, v_actor.full_name, 'upsert_shipment_invoice_template',
    v_shipment.id::text,
    jsonb_build_object(
      'invoice_number', v_invoice_number,
      'subtotal', v_subtotal,
      'discount', v_discount,
      'previous_debt', v_previous_debt,
      'additional_charges', v_additional,
      'total_usd', v_total,
      'total_iqd', v_total_iqd,
      'currency', v_currency,
      'status', v_invoice.status
    )
  );

  return v_invoice;
end;
$$;

revoke all on function public.upsert_shipment_invoice_template(
  uuid,text,text,jsonb,numeric,numeric,numeric,numeric,numeric,text,text,date,timestamptz,text,text,text,text,text,numeric
) from public, anon, authenticated;
grant execute on function public.upsert_shipment_invoice_template(
  uuid,text,text,jsonb,numeric,numeric,numeric,numeric,numeric,text,text,date,timestamptz,text,text,text,text,text,numeric
) to service_role;

commit;
