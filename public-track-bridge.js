/* Globall Cloud — public tracking bridge
 * Keeps the legacy page code stable while moving public tracking reads to the
 * hardened public-track Edge Function. No direct shipment table access is added.
 */
(function(){
  const FUNCTION_URL = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/public-track';

  async function authHeaders(){
    const headers = { Accept:'application/json' };
    try {
      const client = window.sb || window.supabase;
      if(client?.auth?.getSession){
        const { data:{ session } } = await client.auth.getSession();
        if(session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (_) {}
    return headers;
  }

  async function publicTrack(id){
    const trackingId = String(id || '').trim();
    if(!trackingId || trackingId.length > 128) return null;
    const res = await fetch(`${FUNCTION_URL}?id=${encodeURIComponent(trackingId)}`, {
      method:'GET',
      headers: await authHeaders(),
      credentials:'omit',
      cache:'no-store',
    });
    let body = null;
    try { body = await res.json(); } catch (_) {}
    if(!res.ok) return null;
    return body?.shipment || null;
  }

  // The legacy index.html declares getShipment() in the global classic-script
  // scope. Replacing window.getShipment here updates that public function after
  // the page script has loaded, without rewriting the large inline document.
  if(typeof window.getShipment === 'function'){
    const legacyGetShipment = window.getShipment;
    window.getShipment = async function(id){
      try {
        const tracked = await publicTrack(id);
        if(tracked) return typeof window.rowToShipment === 'function' ? window.rowToShipment(tracked) : tracked;
      } catch (_) {}
      return legacyGetShipment(id);
    };
  }

  window.publicTrack = publicTrack;
})();
