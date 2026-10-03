# Customer Portal Enhancement Plan

## Goal
Extend the existing Globall Cloud customer portal without duplicating the production logistics model. `customer_directory` remains the canonical customer identity table; existing `shipments` and `quote_requests` remain the canonical shipment/request records. The public tracking page and logistics control plane remain unchanged.

## Design
- **Design movement:** dark logistics control-room UI with compact operational cards and teal/cyan action accents.
- **Principles:** clear status hierarchy, low-friction customer actions, mobile-first cards, and visible operational rules.
- **Palette:** deep navy communicates security and cargo control; cyan marks actionable/connected states; amber marks policy and delivery caveats.
- **Layout:** dashboard sections are organized as an operational sequence: identity → shipments → request/rates → warehouses → delivery/policies.
- **Signature elements:** GC identity badge, status pills, copy-address buttons, and rate cards with explicit transit-time labels.
- **Interaction:** forms explain validation inline, successful actions preserve context, and private data stays behind Supabase Auth/RLS.
- **Typography/voice:** Kurdish-first copy with short operational labels and English logistics terms only where they are industry-standard.
- **Brand essence:** a calm, transparent cargo operating system for customers shipping into Iraq; reliable, direct, accountable.

## Project structure
- `login.html`: GC-code login entry point.
- `register.html`: customer self-registration form that requests the next database-generated GC code.
- `dashboard.html`: authenticated customer view with shipments, requests, calculator, warehouse directory, accounting, delivery choices, and policies.
- `gc-customer-portal.css/js`: presentation and browser behavior for the added portal sections.
- `supabase/functions/customer-gc-register`: server-side account creation using Supabase Auth and canonical customer identity.
- `supabase/migrations/20261001160000_customer_self_registration_and_rates.sql`: additive rate/delivery configuration and secure registration support.
- `scripts/cloudflare-build.mjs`: existing Pages bundle pipeline; route manifest remains synchronized.

## Data decisions
The attached request names `customers`, `shipments`, and `requests`. The deployed system already has equivalent production tables with stronger relationships: `customer_directory`, `shipments`, and `quote_requests`. New duplicate tables would split ownership and break staff workflows, so the implementation maps the requested concepts to those existing tables and adds only missing configuration/registration structures.

USA warehouse remains an explicit owner-confirmation placeholder as requested.
