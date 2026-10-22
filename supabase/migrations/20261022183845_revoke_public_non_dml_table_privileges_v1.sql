-- Remove unnecessary non-DML table privileges from browser-facing roles.
-- RLS and existing DML grants remain unchanged. All current public tables are
-- owned by postgres; prevent the same grants on future postgres-owned tables.
BEGIN;

REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN
ON ALL TABLES IN SCHEMA public
FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLES
FROM anon, authenticated;

COMMIT;
