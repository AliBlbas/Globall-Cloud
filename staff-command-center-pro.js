(() => {
  'use strict';
  if (!/\/staff(?:-os)?(?:\.html)?\/?$/.test(location.pathname)) return;

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const ACCOUNT_FN = `${SUPABASE_URL}/functions/v1/account-admin`;
  const state = { db: null, session: null, me: null, staff: [], customers: [], shipments: [], logs: [], loading: false };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
  const fmt = (v) => Number(v || 0).toLocaleString('en-US');
  const date = (v) => v ? new Intl.DateTimeFormat('ku-IQ',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)) : '—';

  async function client() {
    if (state.db) return state.db;
    if (window.gcEnsureSupabase) { await window.gcEnsureSupabase(); state.db = window.gcSupabase; if (state.db) return state.db; }
    if (window.gcSupabase) return state.db = window.gcSupabase;
    if (window.supabase?.createClient) return state.db = window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    throw new Error('Supabase client unavailable');
  }

  async function auth() {
    const db = await client();
    const { data } = await db.auth.getSession();
    if (!data?.session) throw new Error('Unauthorized');
    state.session = data.session;
    const { data: me, error } = await db.from('staff').select('id,full_name,role,branch,is_active,updated_at').eq('id',state.session.user.id).maybeSingle();
    if (error || !me?.is_active) throw new Error('Staff access required');
    state.me = me;
    return db;
  }

  async function get(kind) {
    const db = await auth();
    const u = new URL(ACCOUNT_FN); u.searchParams.set('kind',kind);
    const res = await fetch(u,{headers:{Authorization:`Bearer ${state.session.access_token}`,apikey:SUPABASE_KEY},cache:'no-store'});
    const text = await res.text(); let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error:text }; }
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data.items || [];
  }

  async function loadData() {
    if (state.loading) return;
    state.loading = true;
    try {
      const [staff,customers,shipments,logs] = await Promise.all([get('staff'),get('customer'),get('shipment'),get('log')]);
      state.staff = staff; state.customers = customers; state.shipments = shipments; state.logs = logs;
      render();
    } catch (e) { console.warn('[GC Staff Command Center]',e); }
    finally { state.loading = false; }
  }

  function isAdmin() { return ['admin','super_admin'].includes(String(state.me?.role || '')); }

  function metrics() {
    const active = state.staff.filter(x=>x.is_active).length;
    const inactive = state.staff.length - active;
    const branches = new Set(state.staff.filter(x=>x.is_active).map(x=>x.branch || 'all'));
    const unassigned = state.shipments.filter(x=>!x.assigned_staff_id).length;
    const due = state.shipments.reduce((s,x)=>s+Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0)),0);
    return {active,inactive,branches:branches.size,unassigned,due};
  }

  function branchRows() {
    const map = new Map();
    for (const row of state.staff) { const key = String(row.branch || 'all').toLowerCase(); const cur = map.get(key) || { total:0,active:0 }; cur.total++; if(row.is_active) cur.active++; map.set(key,cur); }
    const rows = [...map.entries()].sort((a,b)=>b[1].active-a[1].active).slice(0,8);
    const max = Math.max(1,...rows.map(([,v])=>v.total));
    return rows.map(([branch,v])=>`<div class="scc-branch"><div><strong>${esc(branch.toUpperCase())}</strong><small>${v.active} active · ${v.total} total</small></div><div class="scc-bar"><i style="width:${Math.round(v.total/max*100)}%"></i></div><div class="scc-count">${v.active}</div></div>`).join('') || '<div class="scc-empty">هیچ ستافێک تۆمار نەکراوە.</div>';
  }

  function roleRows() {
    const map = new Map();
    for (const row of state.staff) { const key = String(row.role || 'unknown'); map.set(key,(map.get(key)||0)+1); }
    return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([role,count])=>`<div class="scc-role"><b>${esc(role)}</b><strong>${fmt(count)}</strong><small>staff account${count===1?'':'s'}</small></div>`).join('') || '<div class="scc-empty">No roles found.</div>';
  }

  function activityRows() {
    const rows = state.logs.slice(0,10);
    return rows.length ? rows.map(x=>`<div class="scc-activity-row"><i></i><div><b>${esc(x.action||'Activity')}</b><small>${esc(x.staff_name||'Staff')} ${x.target_id?`· ${esc(x.target_id)}`:''}</small></div><time>${esc(date(x.created_at))}</time></div>`).join('') : '<div class="scc-empty">هیچ چالاکییەکی نوێ نییە.</div>';
  }

  function topStaffRows() {
    const score = new Map();
    for (const row of state.shipments) { if (!row.assigned_staff_id) continue; score.set(row.assigned_staff_id,(score.get(row.assigned_staff_id)||0)+1); }
    const rows = state.staff.filter(x=>x.is_active).map(x=>({ ...x,count:score.get(x.id)||0 })).sort((a,b)=>b.count-a.count).slice(0,8);
    return rows.length ? rows.map(x=>`<tr><td><b>${esc(x.full_name||'—')}</b><small style="display:block;color:var(--scc-muted);font-size:8px">${esc(x.branch||'all')}</small></td><td><span class="scc-pill">${esc(x.role||'—')}</span></td><td class="mono">${fmt(x.count)}</td><td><span class="scc-pill">${x.is_active?'ACTIVE':'OFF'}</span></td></tr>`).join('') : '<tr><td colspan="4" class="scc-empty">هیچ ستافێک نییە.</td></tr>';
  }

  function shell() {
    if ($('#sccOverlay')) return;
    const host = document.createElement('div');
    host.innerHTML = `<div id="sccOverlay" hidden><section class="scc-shell" role="dialog" aria-modal="true" aria-labelledby="sccTitle"><header class="scc-top"><div><div class="scc-kicker">GLOBAL CLOUD · STAFF COMMAND CENTER</div><h2 class="scc-title" id="sccTitle">People Operations Control</h2><p class="scc-sub">کۆنترۆڵی ڕاستەقینەی ستاف، branch، role، workload و activity لە یەک شوێن.</p></div><div class="scc-top-actions"><span class="scc-status"><span class="scc-dot"></span><span id="sccStatus">LIVE CONTROL</span></span><button class="scc-btn" id="sccRefresh" type="button">↻ نوێکردنەوە</button><button class="scc-btn danger" id="sccClose" type="button">داخستن</button></div></header><div id="sccContent"></div><footer class="scc-footer"><span>Access: ${esc(state.me?.role || 'staff')} · ${esc(state.me?.branch || 'all')}</span><span class="scc-command-hint">ESC · close &nbsp; | &nbsp; R · refresh</span></footer></section></div>`;
    document.body.appendChild(host.firstElementChild);
    $('#sccClose').onclick = close;
    $('#sccOverlay').addEventListener('click',e=>{if(e.target.id==='sccOverlay')close();});
    $('#sccRefresh').onclick = async()=>{ $('#sccStatus').textContent='SYNCING…'; await loadData(); $('#sccStatus').textContent='LIVE CONTROL'; };
    document.addEventListener('keydown',e=>{ if(!$('#sccOverlay')||$('#sccOverlay').hidden)return; if(e.key==='Escape')close(); if(e.key.toLowerCase()==='r' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) loadData(); });
  }

  function render() {
    const m = metrics();
    $('#sccContent').innerHTML = `<div class="scc-metrics"><div class="scc-metric"><span>Active staff</span><strong>${fmt(m.active)}</strong><small>${fmt(m.inactive)} inactive</small></div><div class="scc-metric"><span>Branches</span><strong>${fmt(m.branches)}</strong><small>active locations</small></div><div class="scc-metric"><span>Customers</span><strong>${fmt(state.customers.length)}</strong><small>directory records</small></div><div class="scc-metric"><span>Shipments</span><strong>${fmt(state.shipments.length)}</strong><small>last 30 days</small></div><div class="scc-metric"><span>Unassigned</span><strong>${fmt(m.unassigned)}</strong><small>needs owner</small></div><div class="scc-metric"><span>Outstanding</span><strong>$${Number(m.due||0).toLocaleString('en-US',{maximumFractionDigits:0})}</strong><small>open balance</small></div></div><div class="scc-grid"><section class="scc-card"><div class="scc-card-head"><div><div class="scc-kicker">QUICK CONTROL</div><h3>Command actions</h3><small>بگەڕێ بۆ action ـە سەرەکییەکان.</small></div></div><div class="scc-quick"><button data-scc-jump="staff"><b>Staff Management</b><span>زیادکردن · دەستکاری · access</span></button><button data-scc-jump="customers"><b>Customer Management</b><span>کڕیار و directory</span></button><button data-scc-jump="shipments"><b>Shipment Control</b><span>بار و assignment</span></button><button data-scc-jump="tasks"><b>Task Board</b><span>ئەرک و ownership</span></button><button data-scc-jump="notifications"><b>Notifications</b><span>ئاگادارییەکان</span></button><button data-scc-jump="activity"><b>Audit & Activity</b><span>مێژووی کردارەکان</span></button></div></section><section class="scc-card"><div class="scc-card-head"><div><div class="scc-kicker">ORGANIZATION MAP</div><h3>Branch distribution</h3><small>چالاکیی ستاف بە شوێن.</small></div></div><div class="scc-branch-grid">${branchRows()}</div></section><section class="scc-card"><div class="scc-card-head"><div><div class="scc-kicker">ROLE MATRIX</div><h3>Role distribution</h3><small>دابەشبوونی دەسەڵات.</small></div></div><div class="scc-role-grid">${roleRows()}</div></section><section class="scc-card"><div class="scc-card-head"><div><div class="scc-kicker">WORKLOAD SIGNAL</div><h3>Assigned workload</h3><small>ژمارەی shipment ـی assign کراو.</small></div></div><div class="scc-table"><div style="overflow:auto"><table class="scc-table"><thead><tr><th>Staff</th><th>Role</th><th>Load</th><th>Status</th></tr></thead><tbody>${topStaffRows()}</tbody></table></div></div></section><section class="scc-card scc-wide"><div class="scc-card-head"><div><div class="scc-kicker">LIVE AUDIT STREAM</div><h3>Recent staff activity</h3><small>دواین کردارەکان لە سیستەم.</small></div></div><div class="scc-activity">${activityRows()}</div></section></div><div class="scc-footer" style="margin-top:12px"><div>Super Admin controls are enforced separately by the server.</div>${isAdmin()?'<div><span class="scc-pill">ADMIN CONTROL ENABLED</span></div>':'<div><span class="scc-pill">READ VIEW</span></div>'}</div>`;
    $$('[data-scc-jump]').forEach(btn=>btn.addEventListener('click',()=>{ close(); const target = btn.dataset.sccJump; const nav = document.querySelector(`.nav-item[data-tab="${CSS.escape(target)}"]`); if(nav) nav.click(); }));
  }

  function open() { if(!isAdmin()) return; shell(); $('#sccOverlay').hidden=false; document.body.style.overflow='hidden'; render(); void loadData(); }
  function close() { $('#sccOverlay')?.setAttribute('hidden',''); document.body.style.overflow=''; }

  async function install() {
    try {
      await auth();
      if(!isAdmin()) return;
      if ($('#sccLauncher')) return;
      const actions = $('.top-actions');
      if(!actions) return;
      const button = document.createElement('button');
      button.id='sccLauncher'; button.type='button'; button.className='btn primary'; button.textContent='⌘ Staff Command Center';
      button.addEventListener('click',open); actions.prepend(button);
      document.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();} });
    } catch(e) { console.warn('[GC Staff Command Center install]',e); }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>void install(),{once:true}); else void install();
})();
