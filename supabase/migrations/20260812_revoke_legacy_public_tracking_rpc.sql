-- Apply only after public-track-bridge.js has been deployed and verified
-- against the live public tracking page.
revoke execute on function public.track_shipment(text) from anon;
revoke execute on function public.track_shipment(text) from public;
