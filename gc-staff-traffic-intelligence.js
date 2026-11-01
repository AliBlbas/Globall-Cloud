(() => {
  'use strict';
  if (window.__gcStaffTrafficIntelligence) return;
  window.__gcStaffTrafficIntelligence = true;

  const API = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/staff-production-api';
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const $ = (s, root = document) => root.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
  const money = (v) => `${n(v).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})} $`;
  const pct = (v) => `${n(v).toFixed(1)}%`;
  const statusText = (value) => value ? 'Live · Supabase analytics' : 'Fallback · operational snapshot';

  async function getData() {
    const session = (await window.gcSupabase?.auth?.getSession?.())?.data?.session;
    if (!session?.access_token) throw new Error('Session ـی ستاف نەدۆزرایەوە');
    const response = await fetch(`${API}?kind=analytics`, { cache:'no-store', headers:{ apikey:KEY, Authorization:`Bearer ${session.access_token}`, Accept:'application/json' } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Analytics ${response.status}`);
    return body;
  }

  function card(label, value, detail, tone='cyan', icon='↗') {
    return `<article class="gc-intel-kpi ${tone}"><div class="gc-intel-kpi-top"><span>${esc(label)}</span><i>${icon}</i></div><strong>${esc(value)}</strong><small>${esc(detail)}</small></article>`;
  }

  function render(data) {
    const view = document.getElementById('view'); if (!view) return;
    const s = data.summary || {};
    const routes = Array.isArray(data.routes) ? data.routes.slice(0, 6) : [];
    const staff = Array.isArray(data.staff) ? data.staff.slice(0, 5) : [];
    const costs = Array.isArray(data.recent_costs) ? data.recent_costs.slice(0, 5) : [];
    const total = n(s.total_shipments); const active = n(s.active_shipments);
    const delivered = Math.max(0, total - active);
    const completion = total ? delivered / total * 100 : 0;
    const routeRows = routes.map((r) => `<tr><td><b>${esc(r.route || '—')}</b></td><td class="mono">${n(r.shipments).toLocaleString('en-US')}</td><td class="mono">${money(r.revenue)}</td><td><span class="gc-intel-bar"><i style="width:${Math.min(100, total ? n(r.shipments) / total * 100 : 0)}%"></i></span></td></tr>`).join('') || '<tr><td colspan="4" class="muted">هێشتا route ـی تۆمارکراو نییە.</td></tr>';
    const staffRows = staff.map((r) => `<div class="gc-intel-rank"><span class="gc-intel-avatar">${esc(String(r.name || r.full_name || 'S').slice(0,2).toUpperCase())}</span><div><b>${esc(r.name || r.full_name || 'Staff')}</b><small>${n(r.shipments || r.assigned_shipments)} بار · ${n(r.delivered)} گەیەنراو</small></div><strong>${pct(n(r.shipments) ? n(r.delivered) / n(r.shipments) * 100 : 0)}</strong></div>`).join('') || '<div class="gc-intel-empty">داتای staff بەردەست نییە.</div>';
    const costRows = costs.map((r) => `<div class="gc-intel-cost"><span>${esc(r.description || r.category || r.reference || 'Cost')}</span><b>${money(r.amount_usd || r.amount || r.total)}</b></div>`).join('') || '<div class="gc-intel-empty">خەرجییە نوێیەکان نییە.</div>';
    view.innerHTML = `<div class="gc-intel-shell"><section class="gc-intel-hero"><div><span class="eyebrow">CONTROL TOWER · WEBSITE & OPERATIONS INTELLIGENCE</span><h1>داتا بکە بە بڕیارێکی خێرا.</h1><p>لە یەک شوێنەوە traffic، بارەکان، قازانج و performance ـی عملیات ببینە؛ بە شێوازی پاک و پڕۆفیشنالی Control Tower.</p></div><div class="gc-intel-hero-actions"><span class="gc-intel-live"><i></i>${esc(statusText(!data.fallback))}</span><button class="btn primary" id="gcIntelRefresh">↻ نوێکردنەوە</button><button class="btn" id="gcIntelExcel">Excel · پشکنین</button></div></section><div class="gc-intel-kpis">${card('بارەکانی چالاک',n(active).toLocaleString('en-US'),'لە ڕێگا یان لە workflow ـدا','cyan','◉')}${card('کۆی بارەکان',n(total).toLocaleString('en-US'),'داتا لە Staff Production API','violet','▦')}${card('قازانجی خەمڵێنراو',money(s.estimated_profit_usd),'Revenue − operational cost','mint','↗')}${card('قەرزی کڕیار',money(s.outstanding_usd),'بڕی ماوە بۆ وەرگرتن','amber','◌')}</div><div class="gc-intel-grid"><section class="card gc-intel-panel gc-intel-route"><div class="card-head"><div><span class="eyebrow">TRAFFIC / LOGISTICS FLOW</span><h3>ڕێگاکانی زۆرترین کار</h3><small class="muted">بەراوردی ژمارەی بار و داهات بەپێی route</small></div><span class="gc-intel-score">${pct(completion)}<small>تەواوبوو</small></span></div><div class="table-wrap"><table class="table"><thead><tr><th>Route</th><th>Shipments</th><th>Revenue</th><th>Share</th></tr></thead><tbody>${routeRows}</tbody></table></div></section><section class="card gc-intel-panel"><div class="card-head"><div><span class="eyebrow">TEAM PULSE</span><h3>کارایی تیم</h3><small class="muted">باشترین ئەنجامەکانی ئەم ماوەیە</small></div></div><div class="gc-intel-rank-list">${staffRows}</div></section></div><div class="gc-intel-grid secondary"><section class="card gc-intel-panel"><div class="card-head"><div><span class="eyebrow">FINANCE SIGNALS</span><h3>نیشانە دارایییەکان</h3><small class="muted">کۆی خەرجییە نوێیەکان لە API ـی پارێزراو</small></div><b class="gc-intel-fx">FX ${n(s.fx_usd_iqd).toLocaleString('en-US')}</b></div><div class="gc-intel-cost-list">${costRows}</div></section><section class="card gc-intel-panel gc-intel-excel"><div class="gc-intel-excel-mark">XLS</div><span class="eyebrow">EXCEL CONTROL PLANE</span><h3>فایلەکەت بە staged data بپارێزە</h3><p>فایلەکانی WSHKANI، QARD، QASA و ROZHANA پێش چوونە ناو shipment یان finance، لە row review ـدا پشکنین و mapping بکرێن.</p><button class="btn primary" id="gcIntelOpenExcel">کردنەوەی Excel Review ↗</button></section></div></div>`;
    $('#gcIntelRefresh')?.addEventListener('click', () => window.gcStaffTrafficRender?.(true));
    $('#gcIntelExcel')?.addEventListener('click', () => window.gcStaffLoadTab?.('excel-review'));
    $('#gcIntelOpenExcel')?.addEventListener('click', () => window.gcStaffLoadTab?.('excel-review'));
  }

  async function render(force = false) {
    const view = document.getElementById('view'); if (!view) return;
    view.innerHTML = '<div class="empty">Traffic و عملیات analytics لە بارکردندایە…</div>';
    try { render(await getData()); }
    catch (error) { view.innerHTML = `<div class="empty"><strong style="color:var(--red)">Analytics service error</strong><div>${esc(error.message)}</div><button class="btn" id="gcIntelRetry">↻ دووبارە هەوڵدان</button><button class="btn" id="gcIntelExcelFallback">Excel Review</button></div>`; $('#gcIntelRetry')?.addEventListener('click', () => render(true)); $('#gcIntelExcelFallback')?.addEventListener('click', () => window.gcStaffLoadTab?.('excel-review')); }
  }
  window.gcStaffTrafficRender = render;
})();
