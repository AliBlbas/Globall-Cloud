Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' } });
  }
  return new Response(JSON.stringify({
    error: 'gone',
    message: 'lg-track-shipment is retired. Shipment tracking now lives on the shipments table and public-track Edge Function.',
  }), { status: 410, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
});
