create or replace function public.enqueue_customer_account_created_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payload jsonb;
begin
  if new.auth_user_id is null or coalesce(new.is_active, true) is distinct from true then
    return new;
  end if;

  v_payload := jsonb_build_object(
    'title', 'ئەکاونتی Globall Cloud ـت دروستکرا',
    'body', format('کۆدی ناسینەوەی تۆ %s ـە. لە ئێستاوە دەتوانیت Tracking و زانیارییەکانی بارەکانت لە Customer Portal ببینیت.', coalesce(new.gc_code, new.code, 'GC')),
    'action_url', '/customer-portal.html'
  );

  insert into public.notification_outbox (
    customer_user_id, shipment_id, channel, event_key, recipient, payload, status
  ) values (
    new.auth_user_id, null, 'in_app', 'account.created', null, v_payload, 'pending'
  );

  if nullif(trim(coalesce(new.email, '')), '') is not null
     and lower(trim(new.email)) not like '%@globall-cloud.local' then
    insert into public.notification_outbox (
      customer_user_id, shipment_id, channel, event_key, recipient, payload, status
    ) values (
      new.auth_user_id, null, 'email', 'account.created', trim(new.email), v_payload, 'pending'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.enqueue_customer_account_created_notification() from public, anon, authenticated;

drop trigger if exists customer_account_created_notification_outbox on public.customer_directory;
create trigger customer_account_created_notification_outbox
after insert on public.customer_directory
for each row
execute function public.enqueue_customer_account_created_notification();
