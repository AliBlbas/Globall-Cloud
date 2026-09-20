export async function onRequestGet(context) {
  return new Response(JSON.stringify({
    ok: true,
    service: 'globall-cloud',
    edge: 'ok',
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store, max-age=0, must-revalidate',
    },
  });
}
