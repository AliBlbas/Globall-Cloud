-- Fix "Function Search Path Mutable" security advisor warnings on the two
-- customer/quote-request update guard triggers. Pins search_path the same way
-- the existing is_staff() helpers already do (search_path=public, pg_temp),
-- so an unqualified call to is_staff() inside these triggers can no longer be
-- influenced by a caller-controlled search_path. No behavioral change: the
-- function bodies are untouched, only the search_path is fixed.

alter function public.guard_customer_notification_update() set search_path = public, pg_temp;
alter function public.guard_quote_request_update() set search_path = public, pg_temp;
