# Globall Cloud

## Hardening update — 2026-08-11

The maintenance pass hardens the Supabase tracking boundary, preserves compatibility with the existing staff console (`is_active` / `active`), and verifies the bundled JavaScript files with Node syntax checks. Production database changes are applied through Supabase migrations; frontend releases continue through the normal GitHub → Cloudflare Pages flow.
