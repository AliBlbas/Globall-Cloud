// Supabase Database Schema
// Reference snapshot for the live Globall Cloud project.
//
// IMPORTANT: production schema changes are applied through Supabase migrations.
// Keep this file aligned with the live schema so future maintenance does not
// reintroduce removed columns or permissive access paths.

const supabaseSchema = `

-- Existing production tables are maintained by the Supabase migration history.
-- Tracking is intentionally public-by-ID, but contact fields and internal IDs
-- are masked for anonymous callers by the live track_shipment() RPC.
-- Authenticated customers/staff can receive their own permitted private fields.

-- The staff table contains the canonical is_active flag plus a generated
-- compatibility alias named active for older frontend code.

`;

if (typeof window !== 'undefined') {
  window.supabaseSchema = supabaseSchema;
}
