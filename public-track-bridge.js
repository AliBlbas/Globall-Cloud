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

  function emit(name, detail){
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch (_) {}
  }

  function publishTracking(shipment, id){
    emit('gc:tracking-loaded', { shipment, trackingId: id, source: 'public-track' });
  }

  async function publicTrack(id){
    const trackingId = String(id || '').trim();
    if(!trackingId || trackingId.length > 128) {
      const error = new Error('Invalid tracking id');
      emit('gc:tracking-error', { message: 'ژمارەی tracking دروست نییە.' });
      throw error;
    }

    emit('gc:tracking-loading', { trackingId });

    try {
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
      publishTracking(body.shipment, trackingId);
      return body.shipment;
    } catch (error) {
      const raw = String(error?.message || '');
      const message = /not found/i.test(raw)
        ? 'ئەم کۆدی tracking ـە نەدۆزرایەوە.'
        : 'نەتوانرا زانیاریی بار نوێ بکرێتەوە. تکایە دووبارە هەوڵبدەرەوە.';
      emit('gc:tracking-error', { message });
      throw error;
    }
  }

  if(typeof window.getShipment === 'function'){
    window.getShipment = publicTrack;
  }

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
