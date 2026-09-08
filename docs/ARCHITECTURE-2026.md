# Globall Cloud — Production Architecture 2026

## Purpose

This document is the canonical architecture map for Globall Cloud. It separates components that are already implemented from integrations that require provider credentials/production access.

## Runtime architecture

```text
                         INTERNET / MOBILE / DESKTOP
                                      |
                                      | HTTPS
                                      v
┌──────────────────────────────────────────────────────────────┐
│                       CLOUDFLARE PAGES                       │
│                                                              │
│  Static Frontend                                             │
│  HTML / CSS / JavaScript / PWA                               │
│                                                              │
│  Pages Functions / Edge Middleware                            │
│  Routing · Security Headers · Health · Release Verification  │
│                                                              │
│  CDN / Cache                                                 │
│  Static assets · browser delivery                            │
└──────────────────────────────┬───────────────────────────────┘
                               |
                               | HTTPS / REST / Realtime
                               v
┌──────────────────────────────────────────────────────────────┐
│                         SUPABASE                              │
│                                                              │
│  PostgreSQL                                                  │
│  Source of truth · transactions · RLS · audit/event data     │
│                                                              │
│  Auth                                                        │
│  Session/JWT · customer/staff authorization · MFA support    │
│                                                              │
│  Edge Functions                                              │
│  Tracking · control plane · payments · webhooks · health     │
│                                                              │
│  Storage                                                     │
│  Private shipment documents · warehouse proof                │
│                                                              │
│  Realtime                                                    │
│  Shipment/event/notification updates                         │
│                                                              │
│  Integration Inbox                                           │
│  HMAC verification · idempotent provider event intake       │
│                                                              │
│  Notification / Payment Outbox                                │
│  Retry-aware server-side processing                           │
└──────────────────────────────┬───────────────────────────────┘
                               |
                               | Server-side only
                               v
┌──────────────────────────────────────────────────────────────┐
│                    EXTERNAL PROVIDERS                        │
│                                                              │
│  Qicard / FIB       Payment adapters + signed webhooks       │
│  WhatsApp / Meta    Customer notifications                   │
│  Resend             Transactional email                      │
│  Twilio             SMS                                      │
│  Future carriers    Tracking/label/customs adapters          │
└──────────────────────────────────────────────────────────────┘
```

## Current implementation status

### Implemented

- Cloudflare Pages static frontend.
- Cloudflare Pages Functions middleware and `/api/health` edge health path.
- Security headers and production CSP.
- Supabase PostgreSQL, RLS, transactions and audit/event layers.
- Supabase Auth for customer/staff sessions.
- Supabase Storage with private shipment-document handling.
- Supabase Realtime foundations for live operational updates.
- `shipments` as the shipment source of truth.
- Warehouse chain-of-custody and delivery proof boundaries.
- `shipment_tracking_events`, `shipment_events`, `logistics_exceptions`, and `customer_notifications`.
- `logistics-control-plane` for authenticated operational actions.
- `integration-webhook` with HMAC verification and idempotent `(provider,event_id)` inbox storage.
- `payment-webhook` and `payment-reconcile` foundations for Qicard/FIB.
- Notification outbox / dispatch architecture.
- Control Tower and Shipment Intelligence surfaces.
- Mobile-first customer/staff/driver layers.

## Security boundaries

1. Browser code may use only the Supabase publishable key.
2. Service-role keys and provider credentials are server-side secrets only.
3. RLS is the primary database authorization boundary.
4. Privileged operational writes go through authenticated Edge Functions and server-side RPCs.
5. Payment settlement requires provider-side status verification and amount/currency matching.
6. Webhook intake is idempotent and does not execute arbitrary provider payloads.
7. Private documents are exposed only through ownership-checked, time-limited access paths.

## Queue / Redis rule

Redis is **optional** for Globall Cloud today. The database outbox/inbox pattern is already suitable for durable integration events and retry-aware processing. Redis should be introduced only when measured workload requires high-throughput ephemeral queues, rate limiting at scale, distributed locks, or latency-sensitive background workloads.

## External provider rule

A provider is not considered **LIVE** merely because its adapter exists in source code. It becomes LIVE only after:

- production credentials are installed as server-side secrets,
- provider callback/webhook URLs are configured,
- signature verification is tested,
- successful sandbox/integration tests pass,
- production test transaction/event is reconciled end-to-end,
- monitoring/alerting is enabled.

The application must return an explicit configuration/error state when a provider is not configured; it must never fabricate success.

## CI/CD release gate

The intended path is:

`GitHub main -> GitHub Actions -> Cloudflare Pages production -> /api/health -> /release.json exact commit verification`

Feature-gate checks must validate required assets, JavaScript syntax, TypeScript bundling, security invariants and release-version consistency before accepting a production release.

## Operational domains

- Customer: account, quotes, shipments, tracking, documents, invoices, payments, support.
- Staff: Control Tower, shipment operations, exceptions, warehouse, finance, customer support.
- Warehouse: receiving, scans, package traceability, consolidation, handover evidence.
- Driver: assignment, route state, check-in/out, location and delivery proof.
- Super Admin: staff lifecycle, privileged configuration, audit visibility and platform health.
