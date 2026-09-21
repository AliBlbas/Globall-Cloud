-- Restore the server-side logging privilege required by account-admin.
-- RLS remains enabled; this grant is for the trusted service_role runtime.
GRANT SELECT, INSERT ON TABLE public.staff_activity_log TO service_role;
