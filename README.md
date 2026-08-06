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

## Project files
- `index.html` — main website and customer portal
- `management.html` — staff entry page
- `accounts-console.html` — staff management console
- `account-admin` edge function — manager workflow for accounts and receipts
- `admin-dashboard.js` — analytics engine
- `database-schema.js` — schema reference

## Notes
- Keep RLS enabled on public tables.
- Use the publishable Supabase key in the frontend.
- Never expose the service role key in browser code.
- Manager-created customer accounts should be the only supported onboarding path for internal records.
