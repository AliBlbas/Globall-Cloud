-- Public quote submissions are handled by the public-quote Edge Function.
-- Anonymous clients must not query or mutate the underlying table directly.
REVOKE ALL PRIVILEGES ON TABLE public.quote_requests FROM anon;
GRANT SELECT, INSERT ON TABLE public.quote_requests TO authenticated;
