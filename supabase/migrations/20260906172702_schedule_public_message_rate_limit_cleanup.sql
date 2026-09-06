do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'globall-public-message-rate-limit-cleanup'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end
$$;

select cron.schedule(
  'globall-public-message-rate-limit-cleanup',
  '15 * * * *',
  $$delete from public.public_message_rate_limits where window_started_at < clock_timestamp() - interval '2 hours';$$
);
