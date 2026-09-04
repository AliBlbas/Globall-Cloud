(() => {
  'use strict';
  const OPS_V4 = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/operations-v4';
  const OPS_ADMIN = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/operations-admin';
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const nativeFetch = window.fetch.bind(window);
  if (window.__gcV5ShipmentCreatePatch) return;
  window.__gcV5ShipmentCreatePatch = true;
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url === OPS_V4 && String(init.method || 'GET').toUpperCase() === 'POST' && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body);
        if (body?.action === 'shipment_update' && body?.data?.id && !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(body.data.id))) {
          const session = await window.gcSupabase?.auth?.getSession?.();
          const token = session?.data?.session?.access_token;
          if (!token) return nativeFetch(input, init);
          const d = body.data;
          const adminBody = {
            kind: 'shipments',
            action: 'create',
            data: {
              id: d.tracking_id || d.id,
              customer_name: d.customer_name || d.customer_gc_code || '',
              customer_phone: d.customer_phone || '',
              origin_key: d.origin_warehouse || d.origin_key || 'china',
              dest_key: d.destination_warehouse || d.dest_key || 'erbil',
              type: d.transport_mode || d.type || 'air',
              weight_kg: d.actual_weight_kg ?? d.weight_kg ?? null,
              items_count: d.carton_count ?? d.items_count ?? null,
              notes: d.cargo_description || d.notes || null,
              eta: d.eta || null,
              directory_customer_id: d.directory_customer_id || null,
              batch_code: d.batch_code || null,
              branch: d.branch || 'all',
              operational_status: d.status || d.operational_status || 'pending',
              priority: d.priority || 'normal',
              assigned_staff_id: d.assigned_staff_id || null,
            },
          };
          const r = await nativeFetch(OPS_ADMIN, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`, apikey:KEY}, body:JSON.stringify(adminBody), cache:'no-store' });
          const raw = await r.text();
          return new Response(raw, { status:r.status, headers:r.headers });
        }
      } catch (_) {}
    }
    return nativeFetch(input, init);
  };
})();
