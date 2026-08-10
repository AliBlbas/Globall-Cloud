# Globall Cloud System Status

This repository now reflects the current production direction of Globall Cloud:

- **Frontend**: Cloudflare Pages static site
- **Backend**: Supabase Postgres + Auth + Storage + RLS + Edge Functions
- **Staff entry**: `management.html`
- **Staff portal**: `staff-portal.html`
- **Operations suite**: `operations-suite.html`
- **Management console**: `accounts-console.html`
- **Analytics**: `admin-dashboard.js` now loads through the `account-admin` Edge Function instead of querying tables directly from the browser

## Security hardening completed
- Helper RPC functions were converted to `SECURITY INVOKER` where appropriate.
- A reproducible migration was added at `supabase/migrations/20260810_security_hardening.sql`.
- The staff analytics path now uses the Edge Function API rather than direct browser table reads.

## Current Supabase project
- Project ID: `ahslifnthiwfkmaswjno`
- URL: `https://ahslifnthiwfkmaswjno.supabase.co`
- Region: `eu-central-1`

## Notes
- The remaining Supabase advisor warnings are mostly about broader table exposure and auth settings.
- The next major hardening step is to move more browser reads behind Edge Functions and reduce direct table exposure where the UI no longer needs it.
- Keep the service role key server-side only.
