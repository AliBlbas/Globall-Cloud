-- Apply only after the public-message bridge is deployed and the live contact form
-- has been verified end-to-end on the production site.
revoke insert on table public.messages from anon;
