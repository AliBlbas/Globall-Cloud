# Globall Cloud Operations V4

This release extends the existing static Cloudflare Pages + Supabase architecture rather than rebuilding the application.

## Implemented
- Shipment operations API with air/land/sea classification, customer GC code, warehouse origin/destination, cargo details, carton count, actual/volumetric/chargeable weight and edit workflow.
- Shipment detail view with packages, warehouse receipts/evidence, events, insurance and financial ledger.
- Public `/track.html` page backed by `public-track` and customer GC lookup.
- Customer management API/UI: create GC account, edit profile, archive account; new accounts receive a unique GC code and temporary password once.
- Warehouse V4 receiving workflow using the existing `warehouse-receiving` function: GC code, warehouse, cartons, tracking, item summary and multiple photos.
- Four warehouse locations represented: China, Dubai, Erbil and USA.
- Pricing/FX management: active `pricing_rates`, exchange-rate history and requested starter catalog values.
- Alerts data model and operations queue.
- Customer support chat data model/API for staff ↔ customer conversations linked to GC code.
- Finance view over transaction and financial-summary data.
- Settings entry point for profile/language/password; password changes remain in the existing protected self-service function.
- Audit entries for shipment, pricing and exchange-rate changes through `staff_activity_log`.
- Warehouse receipt → WhatsApp notification outbox queue. Existing `notification-dispatch` is the provider worker.
- Volumetric weight helper: `(length_cm * width_cm * height_cm) / 6000`, with chargeable weight = max(actual, volumetric).

## Provider-dependent
- WhatsApp delivery requires the existing Meta WhatsApp Cloud API/Twilio provider credentials and a verified business sender. The application now queues the outbound event; it must not embed a personal number or provider secret in source.
- Authenticated browser E2E, two-user chat realtime, payment callbacks and Cloudflare account-level deployment status require their respective credentials/sessions.

## Safety
- No service-role key or personal provider secret is committed.
- Customer and staff operational reads/writes are server-side through protected Edge Functions.
- Production destructive cleanup is not performed by this release.
