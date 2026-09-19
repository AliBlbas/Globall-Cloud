(() => {
  'use strict';
  if (window.__gcStaffAnalyticsBridge) return;
  window.__gcStaffAnalyticsBridge = true;

  const API = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/staff-production-api';
  const ANALYTICS = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/staff-analytics';
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const nativeFetch = window.fetch.bind(window);

  const jsonFetch = async (url, headers) => {
    const response = await nativeFetch(url, { headers, cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  };

  const asNumber = (value) => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const fallbackAnalytics = async (headers) => {
    const [shipmentsResult, financeResult, pricingResult] = await Promise.allSettled([
      jsonFetch(`${API}?kind=shipments`, headers),
      jsonFetch(`${API}?kind=finance`, headers),
      jsonFetch(`${API}?kind=pricing`, headers)
    ]);

    const shipments = shipmentsResult.status === 'fulfilled' && shipmentsResult.value.response.ok
      ? (shipmentsResult.value.data?.items || [])
      : [];
    const finance = financeResult.status === 'fulfilled' && financeResult.value.response.ok
      ? (financeResult.value.data || {})
      : {};
    const pricing = pricingResult.status === 'fulfilled' && pricingResult.value.response.ok
      ? (pricingResult.value.data || {})
      : {};

    const tx = Array.isArray(finance.transactions) ? finance.transactions : [];
    const income = tx.filter(x => !['expense','cost','out'].includes(String(x.type || '').toLowerCase()))
      .reduce((n, x) => n + asNumber(x.amount_usd), 0);
    const expenses = tx.filter(x => ['expense','cost','out'].includes(String(x.type || '').toLowerCase()))
      .reduce((n, x) => n + asNumber(x.amount_usd), 0);
    const outstanding = tx.reduce((n, x) => {
      const type = String(x.type || '').toLowerCase();
      return ['charge','customer_charge'].includes(type) ? n + Math.max(0, asNumber(x.amount_usd)) : n;
    }, 0) - tx.filter(x => ['payment','customer_payment','income'].includes(String(x.type || '').toLowerCase()))
      .reduce((n, x) => n + asNumber(x.amount_usd), 0);

    const routes = new Map();
    for (const shipment of shipments) {
      if (shipment.archived_at) continue;
      const route = `${shipment.origin_key || shipment.origin || '—'} → ${shipment.dest_key || shipment.destination || '—'}`;
      const row = routes.get(route) || { route, shipments: 0, revenue: 0, outstanding: 0 };
      row.shipments += 1;
      row.revenue += asNumber(shipment.total_amount);
      row.outstanding += Math.max(0, asNumber(shipment.total_amount) - asNumber(shipment.paid_amount));
      routes.set(route, row);
    }

    const fxRows = Array.isArray(pricing.exchange_rates) ? pricing.exchange_rates : [];
    const fx = fxRows.find(x => asNumber(x.usd_to_iqd || x.rate) > 0);
    const fxRate = fx ? asNumber(fx.usd_to_iqd || fx.rate) : null;

    const active = shipments.filter(x => !['delivered','completed','cancelled','canceled']
      .includes(String(x.operational_status || x.status || '').toLowerCase()) && !x.archived_at).length;

    return {
      ok: true,
      summary: {
        outstanding_usd: Math.max(0, outstanding),
        revenue_usd: income,
        collected_usd: Math.max(0, income - Math.max(0, outstanding)),
        company_cost_usd: expenses,
        company_cost_iqd: 0,
        estimated_profit_usd: income - expenses,
        active_shipments: active,
        total_shipments: shipments.length,
        fx_usd_iqd: fxRate
      },
      routes: [...routes.values()].sort((a, b) => b.revenue - a.revenue),
      staff: [],
      recent_costs: [],
      generated_at: new Date().toISOString(),
      fallback: true
    };
  };

  const latestFx = async (token) => {
    try {
      const { response, data } = await jsonFetch(`${API}?kind=pricing`, {
        apikey: KEY,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      });
      if (!response.ok) return null;
      const rows = Array.isArray(data.exchange_rates) ? data.exchange_rates : [];
      const first = rows.find(x => asNumber(x.usd_to_iqd || x.rate) > 0);
      return first ? asNumber(first.usd_to_iqd || first.rate) : null;
    } catch {
      return null;
    }
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

      if (!rawResponse.ok) {
        const fallback = await fallbackAnalytics(headers);
        fallback.summary.fx_usd_iqd = fx || fallback.summary.fx_usd_iqd;
        return new Response(JSON.stringify(fallback), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      }

      const s = raw.summary || {};
      const costIqd = asNumber(s.total_cost);
      const revenueUsd = asNumber(s.total_revenue);
      const collectedUsd = asNumber(s.total_collected);
      const outstandingUsd = asNumber(s.total_outstanding);
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
          active_shipments: asNumber(s.active_shipments),
          total_shipments: asNumber(s.total_shipments),
          fx_usd_iqd: fx
        },
        routes: Array.isArray(raw.routes) ? raw.routes : [],
        staff: Array.isArray(raw.staff) ? raw.staff.map(x => ({
          ...x,
          active: true,
          shipments: asNumber(x.assigned_shipments),
          delivered: asNumber(x.delivered)
        })) : [],
        recent_costs: Array.isArray(raw.recent_costs) ? raw.recent_costs : [],
        generated_at: new Date().toISOString(),
        fallback: false
      };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    } catch (error) {
      console.error('[Globall Cloud] analytics bridge:', error);
      return nativeFetch(input, init);
    }
  };
})();
