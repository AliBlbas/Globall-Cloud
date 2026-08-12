/* Globall Cloud — public tracking bridge
 * Routes public tracking reads through the hardened public-track Edge Function
 * without a legacy RPC fallback.
 */
(function(){
  'use strict';

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

  // Replace the legacy global reader when present. No legacy RPC fallback is
  // allowed here: an Edge Function failure must be visible and recoverable at
  // the UI layer rather than silently bypassing the security boundary.
  if(typeof window.getShipment === 'function'){
    window.getShipment = publicTrack;
  }

  // Patch the optional enhanced tracker instance too.
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
