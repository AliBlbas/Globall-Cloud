create or replace function public.get_staff_exception_queue()
returns table (
  shipment_id text,
  customer_name text,
  origin_key text,
  dest_key text,
  current_step_index integer,
  eta timestamptz,
  total_amount numeric,
  paid_amount numeric,
  outstanding numeric,
  risk_code text,
  risk_level text,
  risk_reason text
)
language sql
stable
security definer
set search_path to 'public','pg_temp'
set statement_timeout to '2000ms'
as $$
  select
    s.id,
    s.customer_name,
    s.origin_key,
    s.dest_key,
    s.current_step_index,
    s.eta,
    coalesce(s.total_amount, 0),
    coalesce(s.paid_amount, 0),
    greatest(coalesce(s.total_amount, 0) - coalesce(s.paid_amount, 0), 0),
    case
      when s.eta is not null and s.eta < now() and s.current_step_index < 5 then 'ETA_OVERDUE'
      when coalesce(s.total_amount,0) > coalesce(s.paid_amount,0) and s.eta is not null and s.eta < now() + interval '24 hours' then 'PAYMENT_RISK'
      when s.current_step_index = 3 and s.eta is not null and s.eta < now() + interval '72 hours' then 'CUSTOMS_RISK'
      else 'WATCH'
    end,
    case
      when s.eta is not null and s.eta < now() and s.current_step_index < 5 then 'critical'
      when coalesce(s.total_amount,0) > coalesce(s.paid_amount,0) and s.eta is not null and s.eta < now() + interval '24 hours' then 'high'
      when s.current_step_index = 3 and s.eta is not null and s.eta < now() + interval '72 hours' then 'high'
      else 'medium'
    end,
    case
      when s.eta is not null and s.eta < now() and s.current_step_index < 5 then 'ETA has passed while the shipment is not delivered.'
      when coalesce(s.total_amount,0) > coalesce(s.paid_amount,0) and s.eta is not null and s.eta < now() + interval '24 hours' then 'Outstanding balance is present and ETA is within 24 hours.'
      when s.current_step_index = 3 and s.eta is not null and s.eta < now() + interval '72 hours' then 'Shipment is in customs with a near-term ETA.'
      else 'Shipment is active and should remain under operational watch.'
    end
  from public.shipments s
  where private.is_staff()
    and s.current_step_index < 5
  order by
    case
      when s.eta is not null and s.eta < now() and s.current_step_index < 5 then 0
      when coalesce(s.total_amount,0) > coalesce(s.paid_amount,0) and s.eta is not null and s.eta < now() + interval '24 hours' then 1
      when s.current_step_index = 3 and s.eta is not null and s.eta < now() + interval '72 hours' then 2
      else 3
    end,
    s.eta nulls last,
    s.created_at desc;
$$;

grant execute on function public.get_staff_exception_queue() to authenticated;
revoke execute on function public.get_staff_exception_queue() from anon;;
