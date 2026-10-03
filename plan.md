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

## Professional visual refinement direction
- **Design movement:** premium editorial logistics dashboard — less “neon control room,” more calm enterprise product with one strong cyan signature accent.
- **Core principles:** one primary action per screen, progressive disclosure instead of showing every module at once, strong spacing rhythm, and Kurdish-first copy with consistent terminology.
- **Color philosophy:** navy remains the trust/background color; off-white text is reserved for hierarchy; cyan is only for live/primary actions; amber is reserved for warnings and payment exceptions; avoid using gradients on every card.
- **Layout paradigm:** use a guided operational flow rather than a wall of equal cards. Homepage: promise → proof → route choice → tracking/quote CTA. Dashboard: account summary → active shipments → next action → history/details.
- **Signature elements:** a single route-line motif, compact status chips with icons, and a consistent “next action” card. Remove duplicate decorative cards and repeated section labels.
- **Interaction philosophy:** every card should answer “what is this?” and “what can I do next?”; clicking a shipment opens a focused detail drawer/page rather than expanding multiple dense blocks.
- **Animation:** subtle 160–220ms fades/slides only for route changes, status updates, and modal/drawer entry; no perpetual glow or large motion on mobile.
- **Typography system:** Vazirmatn for all Kurdish UI; JetBrains Mono only for GC codes, tracking IDs, dates, and numeric metrics. Use three heading sizes and avoid mixing English labels beside every Kurdish label.
- **Brand essence:** “The clearest way to move cargo into Iraq.” Personality: dependable, precise, welcoming.
- **Brand voice examples:** “بارەکەت لە کوێیە؟” and “هەنگاوی دواترت لێرەیە.”
- **Wordmark/mark:** retain the GC mark, but pair it with a simple route-line underline rather than multiple boxed logos.
- **Signature brand color:** `#58E5EF` cyan, used sparingly for active state, primary CTA, and live connection status.

## Mobile excellence system
- **Responsive movement:** calm, safe-area-aware mobile operations UI designed for one-handed use on 320–430px devices.
- **Core principles:** one clear next action, 46–52px touch targets, no horizontal page overflow, readable Kurdish line lengths, and progressive disclosure for dense logistics data.
- **Mobile layout:** sticky compact header → focused hero or account summary → one primary action → stacked cards → fixed bottom navigation where the route benefits from repeated navigation.
- **Shared mobile surface:** `gc-mobile-excellence-20261003.css` is loaded last on the homepage, dashboard, tracking, customer auth, and staff OS routes so responsive rules are consistent rather than split across historical layers.
- **Signature mobile elements:** the dashboard five-item dock, full-width tracking field, compact two-column KPI cards, safe-area-aware toast/dock spacing, and reduced-motion support.
