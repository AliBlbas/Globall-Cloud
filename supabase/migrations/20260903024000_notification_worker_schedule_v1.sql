create table if not exists private.edge_worker_secrets (
  name text primary key,
  secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on private.edge_worker_secrets from public, anon, authenticated;
insert into private.edge_worker_secrets(name,secret)
values('notification_dispatch', encode(gen_random_bytes(32),'hex'))
on conflict (name) do nothing;

create or replace function public.verify_notification_worker_secret(p_secret text)
returns boolean
language plpgsql
security definer
set search_path = private, pg_temp
as $$
begin
  if p_secret is null or length(trim(p_secret)) < 32 then
    return false;
  end if;
  return exists (
    select 1 from edge_worker_secrets
    where name = 'notification_dispatch' and secret = p_secret
  );
end;
$$;
revoke all on function public.verify_notification_worker_secret(text) from public, anon, authenticated;
grant execute on function public.verify_notification_worker_secret(text) to service_role;

select cron.unschedule(jobid) from cron.job where jobname='globall-notification-dispatch-worker';
select cron.schedule(
  'globall-notification-dispatch-worker',
  '*/2 * * * *',
  $$select net.http_post(
      url := 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/notification-dispatch',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-notification-worker-secret',(select secret from private.edge_worker_secrets where name='notification_dispatch' limit 1)
      ),
      body := '{"limit":25}'::jsonb
    );$$
);
