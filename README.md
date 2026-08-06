# Globall Cloud

Globall Cloud is a logistics platform for shipping from China and the UAE to Iraq.

## Live stack
- Frontend: static website on Cloudflare Pages
- Backend: Supabase (Postgres, Auth, Storage, RLS, RPC)
- Staff tools: customer accounts, staff access, warehouse receipts, and activity logs

## Main data model
- `customer_directory`
- `customer_directory_accounts` (security-invoker view)
- `shipments`
- `warehouse_receipts`
- `messages`
- `staff`
- `staff_activity_log`
- `lg_orders`, `lg_shipments`, `lg_routes`, `lg_tracking_events`

## How the app works
- Customers can request quotes and track shipments.
- Customers do not self-create management accounts.
- Staff create customer and staff accounts from the management console.
- Warehouse receipts are registered in Dubai, China, or Erbil with batch code and photos.
- The management console uses Supabase Auth for staff sign-in and the `account-admin` edge function for account and receipt actions.
- Dashboard analytics read directly from the live Supabase database.

## Important backend functions
- `find_directory_customer_by_phone`
- `track_shipment`
- `account-admin` edge function
- `is_staff`, `is_admin`, `is_super`, `my_role`, `my_branch`

## Project files (live / wired in)
- `index.html` — main website and customer portal
- `management.html` — staff entry page
- `accounts-console.html` — staff management console
- `account-admin` edge function — manager workflow for accounts and receipts
- `admin-dashboard.js` — analytics engine (correct, matches schema — not yet wired into a page; see below)
- `database-schema.js` — schema reference
- `form-validation.js` / `form-validation-styles.css` — generic form validation utility
- `manifest.json`, `robots.txt`, `sitemap.xml`

## Optional add-on modules (standalone, NOT currently loaded by any page)
These were fixed to match the real schema and real APIs, but still need an
explicit `<script src="...">` in a page before they do anything:
- `price-calculator.js` — deterministic shipping cost estimator. Replaces the
  old `price-calculator.js` + `dynamic-pricing-engine.js` pair (they had
  diverging duplicate logic; `dynamic-pricing-engine.js` also called a fake
  placeholder API, `api.example.com`, which always failed — removed).
- `tracking-enhanced.js` + `tracking-styles.css` — optional animated route
  map + realtime updates for the public tracking page. Fixed to use
  supabase-js **v2** realtime syntax (`channel().on().subscribe()`) and the
  real shipment columns (`origin_key`, `dest_key`, `current_step_index`).
  index.html's tracking page already works without this.
- `whatsapp-messenger.js` — sends customer updates via prefilled `wa.me`
  links (same safe approach already used in index.html). The old version
  tried to call the WhatsApp Cloud API directly from the browser, which
  can't work here (needs Meta Business verification + a server to hold the
  API key) and pointed at the wrong domain besides.
- `webhook-handler.js` — renamed in spirit to "shipment event helpers":
  browser-callable functions that notify a customer after a status change or
  warehouse receipt, using the real `shipments` / `warehouse_receipts`
  tables. True inbound webhooks (e.g. from a payment provider) need a
  Supabase Edge Function, not browser code — see the TODO in the file.
- `payment-gateway.js` — **not active yet.** Real Stripe/PayPal payments need
  a server holding a secret key; this project only has one Supabase Edge
  Function (`account-admin`). This file is wired for the correct
  browser-publishable-key + Edge-Function shape and fails safely with a
  clear "not configured" message until you (1) add publishable keys, (2)
  build a payments Edge Function, (3) point `EDGE_FUNCTION_URL` at it.

## Notes
- Keep RLS enabled on public tables.
- Use the publishable Supabase key in the frontend.
- Never expose the service role key in browser code.
- Manager-created customer accounts should be the only supported onboarding path for internal records.
- Never put secret payment/API keys in browser JS — route them through a Supabase Edge Function, same pattern as `account-admin`.
