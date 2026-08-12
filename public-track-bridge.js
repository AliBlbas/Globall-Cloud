/* Globall Cloud — public tracking bridge
 * Routes public tracking reads through the hardened public-track Edge Function
 * without rewriting the large legacy index.html document.
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
    if(!trackingId || trackingId.length > 128) throw new Error('Invalid tracking id');
    const res = await fetch(`${FUNCTION_URL}?id=${encodeURIComponent(trackingId)}`, {
      method:'GET',
      headers: await authHeaders(),
      credentials:'omit',
      cache:'no-store',
    });
    let body = null;
    try { body = await res.json(); } catch (_) {}
    if(!res.ok) throw new Error(body?.error || `Tracking request failed (${res.status})`);
    if(!body?.shipment) throw new Error('Shipment not found');
    return body.shipment;
  }

  // Patch the legacy global getShipment after the main inline script has loaded.
  // The old implementation remains only as an emergency fallback during this
  // migration; successful tracking always uses the Edge Function above.
  if(typeof window.getShipment === 'function'){
    const legacyGetShipment = window.getShipment;
    window.getShipment = async function(id){
      try{
        const tracked = await publicTrack(id);
        if(typeof window.rowToShipment === 'function') return window.rowToShipment(tracked);
        return tracked;
      }catch(err){
        console.warn('public-track bridge fallback:', err);
        return legacyGetShipment(id);
      }
    };
  }

  // Patch the optional enhanced tracker instance too, so the live route map
  // never needs the public SECURITY DEFINER RPC directly.
  const patchEnhancedTracker = () => {
    const tracker = window.enhancedTracking;
    if(!tracker || typeof tracker.fetchShipmentData !== 'function') return false;
    tracker.fetchShipmentData = async function(_sb, shipmentId){
      return publicTrack(shipmentId);
    };
    return true;
  };
  if(!patchEnhancedTracker()) setTimeout(patchEnhancedTracker, 0);

  window.publicTrack = publicTrack;
})();
