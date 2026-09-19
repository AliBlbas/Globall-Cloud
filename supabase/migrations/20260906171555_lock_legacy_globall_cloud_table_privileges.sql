-- Legacy compatibility table is intentionally server-only.
-- Remove direct client table privileges; server-side service_role access remains unchanged.
revoke all privileges on table public."Globall Cloud" from anon, authenticated;
