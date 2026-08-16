revoke execute on function public.track_shipment(text) from authenticated;
revoke execute on function public.track_shipment(text) from public;
grant execute on function public.track_shipment(text) to anon;;
