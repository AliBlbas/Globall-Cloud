# Globall Cloud

Globall Cloud is a logistics platform for shipping from China and the UAE to Iraq.

## Live stack
- Frontend: static website on Cloudflare Pages with security headers
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
- Every public page (home, services, track, contact, request, about, portal,
  privacy, terms) is bookmarkable/shareable via its own `#fragment` — e.g.
  `/#services` opens straight to Services on first load, not just after
  clicking through from Home.

## Important backend functions
- `find_directory_customer_by_phone`
- `track_shipment`
- `account-admin` edge function
- `is_staff`, `is_admin`, `is_super`, `my_role`, `my_branch`

## Project files (live / wired in)
- `index.html` — main website and customer portal
- `management.html` — staff entry page
- `staff-portal.html` — authenticated Staff OS hub for quick access to internal tools
- `accounts-console.html` — staff management console. Loads `admin-dashboard.js`
  for the analytics tab and `form-validation.js` / `form-validation-styles.css`
  for inline field validation on the customer/staff/receipt forms.
- `account-admin` edge function — manager workflow for accounts and receipts
- `admin-dashboard.js` — analytics engine, wired into accounts-console.html's Dashboard tab
- `form-validation.js` / `form-validation-styles.css` — reusable field
  validation (required/email/phone/etc. with inline errors). Pages that
  handle their own form submission — like accounts-console.html — call
  `initializeForm(id, { manageSubmit: false })` and gate their existing
  submit handler with `validateForm(id)`, instead of letting the library
  own the submit event.
- `database-schema.js` — schema reference
- `manifest.json`, `robots.txt`, `sitemap.xml`
- Frontend pages now use the Supabase publishable key and expose the live client as `window.sb` so shared modules work consistently.

## Optional add-on modules (standalone, NOT currently loaded by any page)
- `price-calculator.js` — deterministic shipping cost estimator (weight ×
  rate × city factor, with a minimum charge). Not wired into index.html
  because index.html already has its own tailored `calcQuote()` with its
  own rate table *and* a live USD→IQD conversion — wiring this in too would
  just create a second, competing pricing calculation. Kept as a clean,
  documented utility for a future use case (e.g. a staff-side quick quote
  tool, or an API).
- `tracking-enhanced.js` + `tracking-styles.css` — optional animated route
  map + browser notifications for the public tracking page, on top of
  supabase-js **v2** realtime (`channel().on().subscribe()`) and the real
  shipment columns (`origin_key`, `dest_key`, `current_step_index`).
  index.html's tracking page already works without this. See
  `tracking-integration.html` for a ready-to-copy usage example.
- `whatsapp-messenger.js` — sends customer updates via prefilled `wa.me`
  links (same safe approach already used in index.html). Deliberately does
  *not* call the WhatsApp Cloud API directly, which would need Meta
  Business verification and a server to hold the API key.
- `webhook-handler.js` — browser-callable helpers that notify a customer
  after a status change or warehouse receipt, using the real `shipments` /
  `warehouse_receipts` tables. True inbound webhooks (e.g. from a payment
  provider) need a Supabase Edge Function, not browser code — see the TODO
  in the file.
- `payment-gateway.js` — **not active yet.** Real Stripe/PayPal payments
  need a server holding a secret key; this project only has one Supabase
  Edge Function (`account-admin`). This file is wired for the correct
  browser-publishable-key + Edge-Function shape and fails safely with a
  clear "not configured" message until you (1) add publishable keys, (2)
  build a payments Edge Function, (3) point `EDGE_FUNCTION_URL` at it.

## Removed
A few files in the original repo were dead weight and were deleted rather
than fixed, since nothing referenced them and there was nothing worth
keeping:
- `dynamic-pricing-engine.js` — an older, diverging duplicate of
  `price-calculator.js` that also called a fake placeholder API
  (`api.example.com`) which always failed.
- `index#U0661.html` — a stray, no-purpose redirect file.
- `.github/workflows/aws.yml`, `azure-webapps-node.yml`, `google.yml`,
  `jekyll-docker.yml`, `label.yml`, `manual.yml`, `summary.yml` — GitHub's
  default starter workflow templates, never customized. Every one of them
  targeted infrastructure this project doesn't use (AWS/Azure/GKE/Jekyll)
  and would have failed on every push. Deployment is handled entirely by
  Cloudflare Pages' own GitHub integration — no Actions needed.
- `.github/ISSUE_TEMPLATE/custom.md` — the unfilled placeholder template
  GitHub scaffolds by default.

## Notable bugs fixed in this pass
- **`tracking-enhanced.js`**: `subscribeToRealtime()` called `cleanup()` as a
  "clear any previous subscription" guard, but `cleanup()` also deleted the
  shipment record that had just been fetched — so every realtime update
  silently no-op'd (the update handler's `if (!shipment) return` always hit).
  Resubscribing now only tears down the old channel, not the shipment data.
- **`tracking-enhanced.js`**: the live map always redrew into a hardcoded
  `#liveMapContainer` regardless of which shipment triggered the update, so
  two shipments tracked at once would overwrite each other's map. Each
  shipment now remembers its own container id.
- **`form-validation.js`**: `resetForm()` looked up each field's error state
  using `field.name`, but this project's inputs are identified by `id`, not
  `name` — so clearing a form never actually cleared red/invalid styling.
  Now uses the same `name || id` key the field was registered under.
- **`form-validation.js`**: error/helper icons referenced an SVG sprite
  (`#i-x`, `#i-info`) that only `index.html` defines — on any other host
  page (accounts-console.html included) they silently rendered as empty
  space. Replaced with small self-contained inline SVGs.
- **`tracking-integration.html`**: called `generateTrackingHTML()`, a
  method that doesn't exist on `EnhancedTracking` (the real method is
  `generateMapHTML`). Rewritten to call the real API and to clean up the
  previous shipment's subscription when a new one is searched.
- **`accounts-console.html`**: the "Start receipt intake" link on
  `management.html` points at `accounts-console.html#receipts`, but the
  console never read the URL hash — it always opened on the Dashboard tab.
  Tab selection now syncs with `location.hash` both ways.
- **`index.html`**: routing only ever recognized `#admin`; every other
  hash (`#services`, `#track`, ...) silently fell back to the home page,
  which meant the fragment URLs already listed in `sitemap.xml` didn't
  actually work if you opened them directly. Generalized to all real page
  routes.
- **`manifest.json`**: declared the app icon as 512×512; the actual PNG on
  disk is 256×256. A declared size that doesn't match the file can make
  Chrome/Android install a blurry or rejected icon. Corrected to 256×256 —
  if you want a crisper home-screen icon later, supply a real 512×512 (or
  larger) source image rather than upscaling the current one, which
  wouldn't add any real detail.
- **`robots.txt`**: allowed indexing of the staff-only console pages
  (`management.html`, `accounts-console.html`). Both require Supabase Auth
  to show any real data, but there's no reason for them to be crawlable or
  show up in search results. Now disallowed.

## Notes
- Keep RLS enabled on public tables.
- Use the publishable Supabase key in the frontend.
- Never expose the service role key in browser code.
- Manager-created customer accounts should be the only supported onboarding path for internal records.
- Never put secret payment/API keys in browser JS — route them through a Supabase Edge Function, same pattern as `account-admin`.

## Possible future improvements (not implemented here)
- The staff-editable USD→IQD exchange rate is now shared in Supabase
  (`app_settings.usd_iqd_rate`) instead of living only in `localStorage`,
  so the public quote calculator and staff finance panel stay in sync across
  devices.
- The sitemap's `#fragment` URLs now work correctly when opened directly,
  but search engines generally don't index fragment URLs as separate
  pages from the base URL. If distinct search-engine ranking per page
  ever matters, that needs real separate URLs (or server-side
  rendering/prerendering), which is a bigger change than this pass.
