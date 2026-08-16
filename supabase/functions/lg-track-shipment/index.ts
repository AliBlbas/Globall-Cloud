Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' } });
  }
  // Retired: this function targeted lg_shipments / lg_tracking_events, which
  // were removed by the drop_unused_lg_schema migration (2026-08-10) -- every
  // call here was crashing with an opaque 500 against tables that no longer
  // exist. Shipment tracking now lives directly on the shipments table
  // (current_step_index + step_dates jsonb), served by account-admin.
  // Returning a clear 410 instead of a raw failure so any remaining caller
  // gets an honest, actionable error rather than a mystery crash.
  return new Response(
    JSON.stringify({
      error: 'gone',
      message: 'lg-track-shipment is retired. Its tables (lg_shipments, lg_tracking_events) no longer exist. Shipment tracking now lives on the shipments table (current_step_index + step_dates), served via the account-admin function. If something still needs to call this endpoint, it needs to be rewritten against the current schema.',
    }),
    { status: 410, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } },
  );
});
