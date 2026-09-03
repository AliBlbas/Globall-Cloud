alter table public.quote_requests add column if not exists product_type text;

create or replace function public.enforce_logistics_quote_rules()
returns trigger language plpgsql security definer set search_path=public,pg_catalog,pg_temp as $$
declare c jsonb; p jsonb;
begin
  c:=public.validate_logistics_cargo(new.product_type,new.has_battery,new.has_liquid,new.msds_provided,new.medical_device);
  if coalesce((c->>'allowed')::boolean,false)=false then raise exception '%',coalesce(c->>'code','CARGO_NOT_ALLOWED'); end if;
  if new.transport_mode in ('air','sea') then
    p:=public.calculate_logistics_price(new.origin_key,new.dest_key,new.transport_mode,coalesce(new.product_type,'general'),new.weight_kg,new.volume_cbm,null);
    new.calculated_amount:=coalesce((p->>'iqd')::numeric,(p->>'usd')::numeric);
    new.calculated_currency:=coalesce(p->>'currency','IQD');
    new.calculated_rate_key:=p->>'rate_key';
  end if;
  new.compliance_status:='approved';
  return new;
end;
$$;

drop trigger if exists trg_enforce_logistics_quote_rules on public.quote_requests;
create trigger trg_enforce_logistics_quote_rules before insert or update of origin_key,dest_key,transport_mode,product_type,weight_kg,volume_cbm,has_battery,has_liquid,msds_provided,medical_device on public.quote_requests for each row execute function public.enforce_logistics_quote_rules();

create or replace function public.enforce_logistics_receipt_rules()
returns trigger language plpgsql security definer set search_path=public,pg_catalog,pg_temp as $$
declare c jsonb;
begin
  c:=public.validate_logistics_cargo(new.product_type,new.has_battery,new.has_liquid,new.msds_provided,new.medical_device);
  if coalesce((c->>'allowed')::boolean,false)=false then raise exception '%',coalesce(c->>'code','CARGO_NOT_ALLOWED'); end if;
  new.compliance_status:='approved';
  return new;
end;
$$;

drop trigger if exists trg_enforce_logistics_receipt_rules on public.warehouse_receipts;
create trigger trg_enforce_logistics_receipt_rules before insert or update of product_type,description,has_battery,has_liquid,msds_provided,medical_device on public.warehouse_receipts for each row execute function public.enforce_logistics_receipt_rules();
