(() => {
  'use strict';
  if (window.__gcStaffProductionFix) return;
  window.__gcStaffProductionFix = true;
  const RECEIVE = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/warehouse-receiving';
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url === RECEIVE && init?.body instanceof FormData && String(init?.method || 'GET').toUpperCase() === 'POST') {
      const src = init.body;
      const out = new FormData();
      for (const [key, value] of src.entries()) {
        const map = {
          warehouse: 'location',
          carton_count: 'total_packages',
          weight_actual: 'gross_weight_kg',
          product_type: 'item_summary',
          description: 'notes'
        };
        const target = map[key] || key;
        if (key === 'photos' || key === 'customer_code' || key === 'batch_code' || key === 'location' || key === 'warehouse' || key === 'total_packages' || key === 'carton_count' || key === 'gross_weight_kg' || key === 'weight_actual' || key === 'item_summary' || key === 'product_type' || key === 'notes' || key === 'description' || key === 'tracking_number' || key === 'invoice_number') {
          if (value instanceof File) out.append(target, value, value.name);
          else if (!out.has(target) || key === 'photos') out.append(target, value);
        } else out.append(target, value);
      }
      return nativeFetch(input, {...init, body: out});
    }
    return nativeFetch(input, init);
  };
})();
