(() => {
  'use strict';
  if (window.__gcStaffAnalyticsBridge) return;
  window.__gcStaffAnalyticsBridge = true;

  const API = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/staff-production-api';
  const ANALYTICS = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/staff-analytics';
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const nativeFetch = window.fetch.bind(window);

  const latestFx = async (token) => {
    try {
      const r = await nativeFetch(`${API}?kind=pricing`, {
        headers: { apikey: KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!r.ok) return null;
      const d = await r.json();
      const rows = Array.isArray(d.exchange_rates) ? d.exchange_rates : [];
      const first = rows.find(x => Number(x.usd_to_iqd || x.rate) > 0);
      return first ? Number(first.usd_to_iqd || first.rate) : null;
    } catch { return null; }
  };

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.startsWith(`${API}?kind=analytics`)) return nativeFetch(input, init);

    try {
      const session = (await window.gcSupabase?.auth?.getSession?.())?.data?.session;
      if (!session?.access_token) return nativeFetch(input, init);
      const headers = { apikey: KEY, Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' };
      const [rawResponse, fx] = await Promise.all([
        nativeFetch(ANALYTICS + '?days=30', { headers, cache: 'no-store' }),
        latestFx(session.access_token)
      ]);
      const raw = await rawResponse.json().catch(() => ({}));
      if (!rawResponse.ok) return new Response(JSON.stringify(raw), { status: rawResponse.status, headers: rawResponse.headers });

      const s = raw.summary || {};
      const costIqd = Number(s.total_cost || 0);
      const revenueUsd = Number(s.total_revenue || 0);
      const collectedUsd = Number(s.total_collected || 0);
      const outstandingUsd = Number(s.total_outstanding || 0);
      const costUsd = fx && fx > 0 ? costIqd / fx : 0;
      const body = {
        ok: true,
        summary: {
          outstanding_usd: outstandingUsd,
          revenue_usd: revenueUsd,
          collected_usd: collectedUsd,
          company_cost_usd: costUsd,
          company_cost_iqd: costIqd,
          estimated_profit_usd: revenueUsd - costUsd,
          active_shipments: Number(s.active_shipments || 0),
          total_shipments: Number(s.total_shipments || 0),
          fx_usd_iqd: fx
        },
        routes: Array.isArray(raw.routes) ? raw.routes : [],
        staff: Array.isArray(raw.staff) ? raw.staff.map(x => ({
          ...x,
          active: true,
          shipments: Number(x.assigned_shipments || 0),
          delivered: Number(x.delivered || 0)
        })) : [],
        recent_costs: Array.isArray(raw.recent_costs) ? raw.recent_costs : [],
        generated_at: new Date().toISOString()
      };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    } catch {
      return nativeFetch(input, init);
    }
  };
})();
