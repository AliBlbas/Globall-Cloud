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
- `tracking-enhanced.js` + `tracking-styles.css` — now loaded by `index.html`.
  Adds a small animated SVG route map and an "enable notifications" button
  under every tracking result (`#page-track`, portal tracking, and after a
  language switch), on top of supabase-js **v2** realtime
  (`channel().on().subscribe()`) and the real shipment columns
  (`origin_key`, `dest_key`, `current_step_index`). The plain tracking
  result still renders first and works even if this script fails to load —
  see `startEnhancedTrackingFor()` in index.html.
- `whatsapp-messenger.js` — now loaded by `index.html` and
  `accounts-console.html`. index.html's staff "send WhatsApp update" button
  (`sendWhatsAppUpdate()`) now picks one of this file's per-status message
  templates (`warehouseReceived` / `inTransit` / `customsClearance` /
  `outForDelivery` / `delivered`) based on the shipment's current step,
  instead of one generic line for every status. Still opens a prefilled
  `wa.me` link that staff tap Send on — no Meta Business API, no secret
  key, nothing sent silently.
- `webhook-handler.js` — now loaded by `index.html` and
  `accounts-console.html`. After a warehouse receipt is registered (in
  either the index.html admin panel's receipt form or
  accounts-console.html's Warehouse Receipts tab), staff get a confirm
  prompt to send a "goods arrived" WhatsApp notice to the customer via
  `shipmentEvents.notifyWarehouseReceived()` / `whatsappMessenger`. Nothing
  fires automatically — same "staff taps Send" model as everywhere else on
  the site. `warehouse_receipts` inserts from index.html's admin panel now
  also save `directory_phone` (looked up from `customer_directory` by
  batch code) so this lookup has a phone number to use.
- `price-calculator.js` — now loaded by `accounts-console.html` only, as a
  new "Quick Quote" tab (`runQuickQuote()`) for staff to sanity-check a
  price internally. Deliberately **still not** loaded by `index.html` —
  that page keeps its own tailored `calcQuote()` (own rate table + live
  USD→IQD conversion); loading both there would recreate the exact
  duplicate-pricing-engine bug described in "Removed" below.
- `payment-gateway.js` — **still not active.** Real Stripe/PayPal payments
  need a server holding a secret key; this project only has one Supabase
  Edge Function (`account-admin`). This file is wired for the correct
  browser-publishable-key + Edge-Function shape and fails safely with a
  clear "not configured" message until you (1) add publishable keys, (2)
  build a payments Edge Function, (3) point `EDGE_FUNCTION_URL` at it. Not
  wired into any page because doing so without those three pieces in place
  would just show customers a broken "pay now" button.

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
