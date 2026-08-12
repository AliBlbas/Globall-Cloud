/* Globall Cloud — Production Exception & Notification Engine
 * Safe client-side operations layer for the Operations Command Center.
 * Uses the publishable Supabase client only; all privileged writes stay behind RLS.
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (n) => Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-US', {maximumFractionDigits: 2}) : '—';
  const host = window.location.hostname;
  const state = { client: null, user: null, isStaff: false, shipments: [] };

  async function ensureClient() {
    if (window.gcEnsureSupabase) return window.gcEnsureSupabase();
    if (window.gcSupabase) return window.gcSupabase;
    if (window.supabase?.createClient) return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    await new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = CDN; script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
    });
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  }

  function set(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
  function empty(id, message) { set(id, `<div class="empty">${esc(message)}</div>`); }

  function exceptionCard(row) {
    const severity = row.severity || 'medium';
    const cls = severity === 'critical' || severity === 'high' ? 'alert red' : severity === 'low' ? 'alert green' : 'alert';
    return `<div class="${cls}"><strong>${esc(row.title || 'Shipment exception')}</strong><div class="muted">${esc(row.description || row.reason || 'Requires operational review.')}</div><div style="margin-top:6px;font-size:11px" class="mono">${esc(row.shipment_id || '—')} · ${esc(row.status || 'open')} · ${esc(severity)}</div></div>`;
  }

  async function loadExceptions() {
    if (!state.isStaff) { set('kExc', '—'); return empty('exceptions', 'تەنها staff دەتوانێت Exception Center ببینێت.'); }
    const { data, error } = await state.client.from('logistics_exceptions').select('*').order('created_at', {ascending:false}).limit(24);
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    set('kExc', rows.filter(r => !['resolved','closed'].includes(String(r.status || '').toLowerCase())).length);
    if (!rows.length) return empty('exceptions', 'هیچ Exception ـێکی کراوە نییە.');
    set('exceptions', rows.slice(0, 12).map(exceptionCard).join(''));
  }

  async function loadNotifications() {
    if (!state.user) return empty('notifications', 'بۆ بینینی ئاگادارکردنەوەکان بچۆ ژوورەوە.');
    let query = state.client.from('customer_notifications').select('*').order('created_at', {ascending:false}).limit(8);
    if (!state.isStaff) query = query.eq('user_id', state.user.id);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    if (!rows.length) return empty('notifications', 'هێشتا ئاگادارکردنەوەیەک نییە.');
    set('notifications', rows.map(r => `<div class="alert ${r.read_at ? 'green' : ''}"><strong>${esc(r.title || 'Notification')}</strong><div class="muted">${esc(r.message || r.body || '')}</div></div>`).join(''));
  }

  async function loadQuotes() {
    if (!state.user && !state.isStaff) return empty('quotes', 'بۆ quote pipeline بچۆ ژوورەوە.');
    let query = state.client.from('quote_requests').select('*').order('created_at', {ascending:false}).limit(8);
    if (!state.isStaff) query = query.eq('customer_user_id', state.user.id);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    if (!rows.length) return empty('quotes', 'هیچ داواکاریی نرخێکی نوێ نییە.');
    set('quotes', rows.map(r => `<div class="alert ${r.status === 'quoted' ? 'green' : ''}"><strong>${esc(r.origin_key || '—')} → ${esc(r.dest_key || '—')}</strong><div class="muted">${esc(r.mode || '—')} · ${esc(r.status || 'pending')} · ${money(r.estimated_total || r.quoted_total)} USD</div></div>`).join(''));
  }

  async function loadDocs() {
    if (!state.user && !state.isStaff) return empty('docs', 'بۆ بەڵگەنامەکان بچۆ ژوورەوە.');
    let query = state.client.from('shipment_documents').select('*').order('created_at', {ascending:false}).limit(12);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    if (!rows.length) return empty('docs', 'هێشتا بەڵگەنامەیەک تۆمار نەکراوە.');
    const counts = rows.reduce((a,r) => { const k = String(r.status || 'uploaded'); a[k] = (a[k] || 0) + 1; return a; }, {});
    set('docs', Object.entries(counts).map(([k,v]) => `<div class="alert ${k === 'verified' || k === 'approved' ? 'green' : k === 'rejected' ? 'red' : ''}"><strong>${esc(k)}</strong><div class="muted">${v} document(s)</div></div>`).join(''));
  }

  async function loadShipments() {
    if (!state.user) { set('kShip','—'); set('kMoving','—'); set('kDue','—'); return empty('shipments', 'چوونەژوورەوە بکە بۆ بینینی shipment ـەکان.'); }
    let q = state.client.from('shipments').select('id,customer_name,origin_key,dest_key,type,total_amount,paid_amount,current_step_index,eta,created_at').order('created_at',{ascending:false}).limit(60);
    if (!state.isStaff) q = q.eq('customer_user_id', state.user.id);
    const { data, error } = await q;
    if (error) throw error;
    state.shipments = data || [];
    const moving = state.shipments.filter(s => Number(s.current_step_index ?? 0) > 0 && Number(s.current_step_index ?? 0) < 5).length;
    const due = state.shipments.reduce((sum,s) => sum + Math.max(0, Number(s.total_amount || 0) - Number(s.paid_amount || 0)), 0);
    set('kShip', state.shipments.length); set('kMoving', moving); set('kDue', money(due)); renderShipments();
  }

  function renderShipments() {
    const search = String(document.getElementById('search')?.value || '').trim().toLowerCase();
    const filter = String(document.getElementById('filter')?.value || 'all');
    const rows = state.shipments.filter(s => {
      if (filter === 'moving' && !(Number(s.current_step_index ?? 0) > 0 && Number(s.current_step_index ?? 0) < 5)) return false;
      if (filter === 'due' && !(Number(s.total_amount || 0) > Number(s.paid_amount || 0))) return false;
      if (!search) return true;
      return [s.id,s.customer_name,s.origin_key,s.dest_key].some(v => String(v || '').toLowerCase().includes(search));
    });
    if (!rows.length) return empty('shipments', 'هیچ shipment ـێک لەو filter ـە نییە.');
    set('shipments', rows.slice(0, 25).map(s => `<div class="rowitem"><div class="mono">${esc(s.id)}</div><div class="route"><b>${esc(s.origin_key || '—')} → ${esc(s.dest_key || '—')}</b><small>${esc(s.customer_name || 'Customer')}</small></div><div>${money(Math.max(0,Number(s.total_amount||0)-Number(s.paid_amount||0)))} USD</div><div class="mono">${s.eta ? esc(new Date(s.eta).toISOString().slice(0,10)) : '—'}</div><button class="btn ghost" data-track-id="${esc(s.id)}">Track</button></div>`).join(''));
    document.querySelectorAll('[data-track-id]').forEach(btn => btn.addEventListener('click', () => { const id = btn.getAttribute('data-track-id'); window.location.href = `./index.html?tracking=${encodeURIComponent(id)}#track`; }));
  }

  async function refreshAll() {
    try {
      state.client = await ensureClient();
      const { data } = await state.client.auth.getSession();
      state.user = data?.session?.user || null;
      state.isStaff = false;
      if (state.user) {
        const staff = await state.client.from('staff').select('id,full_name,role,is_active').eq('id',state.user.id).maybeSingle();
        state.isStaff = !!staff.data && staff.data.is_active !== false;
        const who = staff.data?.full_name || state.user.email || 'User';
        set('who', esc(who)); set('rolePill', esc(state.isStaff ? (staff.data?.role || 'Staff') : 'Customer')); set('sessionText', state.isStaff ? 'Staff session ـی پشتڕاستکراو.' : 'Customer session ـی پشتڕاستکراو.');
      } else { set('rolePill','Guest'); set('who','Guest'); }
      set('dataState', '<span class="pill good">Live Data</span>');
      await Promise.allSettled([loadShipments(), loadExceptions(), loadNotifications(), loadQuotes(), loadDocs()]);
    } catch (error) {
      console.error('[Globall Cloud] Exception engine:', error); set('dataState','<span class="pill bad">Data Error</span>');
    }
  }

  function bind() {
    document.getElementById('refresh')?.addEventListener('click', refreshAll);
    document.getElementById('search')?.addEventListener('input', renderShipments);
    document.getElementById('filter')?.addEventListener('change', renderShipments);
    window.addEventListener('gc:supabase-ready', refreshAll, { once: false });
  }

  if (host) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { bind(); refreshAll(); }, {once:true});
    else { bind(); refreshAll(); }
  }
})();
