drop policy if exists shipment_events_staff_update on public.shipment_events;
revoke update on table public.shipment_events from authenticated;

drop policy if exists delivery_proofs_staff_update on public.delivery_proofs;
revoke update on table public.delivery_proofs from authenticated;
