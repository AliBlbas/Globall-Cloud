(() => {
  'use strict';
  if (!/\/staff(?:-os)?(?:\.html)?\/?$/.test(location.pathname)) return;

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const DIRECTORY_FN = `${SUPABASE_URL}/functions/v1/staff-directory`;
  const ACCOUNT_FN = `${SUPABASE_URL}/functions/v1/account-admin`;
  const state = { db: null, session: null, me: null, list: [], selected: null, loading: false };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
  const fmt = (v) => Number(v || 0).toLocaleString('en-US');
  const date = (v) => v ? new Intl.DateTimeFormat('ku-IQ', { dateStyle:'medium', timeStyle:'short' }).format(new Date(v)) : '—';

  async function client() {
    if (state.db) return state.db;
    if (window.gcEnsureSupabase) { await window.gcEnsureSupabase(); state.db = window.gcSupabase; if (state.db) return state.db; }
    if (window.gcSupabase) return state.db = window.gcSupabase;
    if (window.supabase?.createClient) return state.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
    throw new Error('Supabase client unavailable');
  }

  async function auth() {
    const db = await client();
    const { data, error } = await db.auth.getSession();
    if (error || !data?.session) throw new Error('Unauthorized');
    state.session = data.session;
    const { data: me, error: meError } = await db.from('staff').select('id,full_name,role,branch,is_active').eq('id', data.session.user.id).maybeSingle();
    if (meError || !me?.is_active || !['admin','super_admin'].includes(String(me.role || ''))) throw new Error('Admin access required');
    state.me = me;
    return db;
  }

  async function getJSON(url) {
    const db = await auth();
    const res = await fetch(url, { headers:{ Authorization:`Bearer ${state.session.access_token}`, apikey:SUPABASE_KEY, Accept:'application/json' }, cache:'no-store' });
    const text = await res.text(); let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error:text }; }
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  }

  async function account(action, data) {
    await auth();
    const res = await fetch(ACCOUNT_FN, {
      method:'POST',
      headers:{ Authorization:`Bearer ${state.session.access_token}`, apikey:SUPABASE_KEY, 'Content-Type':'application/json' },
      body:JSON.stringify({ kind:'staff', action, data }),
      cache:'no-store',
    });
    const text = await res.text(); let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { error:text }; }
    if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
    return body;
  }

  function toast(message, bad = false) {
    let el = $('#staff360Toast');
    if (!el) {
      el = document.createElement('div'); el.id='staff360Toast'; el.className='staff360-toast'; document.body.appendChild(el);
    }
    el.textContent = message; el.dataset.kind = bad ? 'bad' : 'ok';
    clearTimeout(el._timer); el._timer = setTimeout(() => el.remove(), 3600);
  }

  function openDrawer() {
    if ($('#staff360')) { $('#staff360').hidden = false; return; }
    const root = document.createElement('div');
    root.id='staff360'; root.className='staff360-overlay';
    root.innerHTML = `<aside class="staff360-drawer" aria-label="Staff Directory 360">
      <header class="staff360-head"><div><div class="staff360-kicker">GLOBAL CLOUD · PEOPLE CONTROL</div><h2>Staff Directory 360°</h2><p>پرۆفایلی تەواوی ستاف، دەسەڵات، assignment، task و audit لە یەک شوێن.</p></div><div class="staff360-head-actions"><span class="staff360-live"><i></i> LIVE</span><button class="staff360-btn" id="staff360Refresh" type="button">↻</button><button class="staff360-btn" id="staff360Close" type="button">✕</button></div></header>
      <section class="staff360-toolbar"><input id="staff360Search" class="staff360-field" placeholder="گەڕان بە ناو..." autocomplete="off"><select id="staff360Branch" class="staff360-field"><option value="">هەموو branch ـەکان</option></select><select id="staff360Role" class="staff360-field"><option value="">هەموو role ـەکان</option></select><select id="staff360Status" class="staff360-field"><option value="">هەموو دۆخ</option><option value="active">چالاک</option><option value="inactive">ناچالاک</option></select><button class="staff360-btn primary" id="staff360Add" type="button">+ Add Staff</button></section>
      <div class="staff360-layout"><section class="staff360-list" id="staff360List"></section><section class="staff360-profile" id="staff360Profile"><div class="staff360-empty">ستافێک هەڵبژێرە بۆ کردنەوەی 360° profile.</div></section></div>
    </aside>`;
    document.body.appendChild(root);
    $('#staff360Close').onclick = closeDrawer;
    root.addEventListener('click', e => { if (e.target === root) closeDrawer(); });
    $('#staff360Refresh').onclick = loadDirectory;
    $('#staff360Search').oninput = renderList;
    $('#staff360Branch').onchange = renderList;
    $('#staff360Role').onchange = renderList;
    $('#staff360Status').onchange = renderList;
    $('#staff360Add').onclick = showAddStaff;
    loadDirectory();
  }

  function closeDrawer() { $('#staff360')?.remove(); }

  function populateFilters() {
    const branches = [...new Set(state.list.map(x=>String(x.branch||'all')).filter(Boolean))].sort();
    const roles = [...new Set(state.list.map(x=>String(x.role||'')).filter(Boolean))].sort();
    $('#staff360Branch').innerHTML = '<option value="">هەموو branch ـەکان</option>' + branches.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    $('#staff360Role').innerHTML = '<option value="">هەموو role ـەکان</option>' + roles.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  }

  async function loadDirectory() {
    if (state.loading) return;
    state.loading = true;
    const listEl = $('#staff360List');
    if (listEl) listEl.innerHTML = '<div class="staff360-loading">داتاکان بار دەکرێن…</div>';
    try {
      const data = await getJSON(DIRECTORY_FN);
      state.list = data.items || [];
      populateFilters();
      renderList();
      if (state.selected) await selectStaff(state.selected.id);
    } catch (error) {
      if (listEl) listEl.innerHTML = `<div class="staff360-error">${esc(error.message || 'Failed to load staff')}</div>`;
      toast(error.message || 'هەڵەی بارکردنی ستاف', true);
    } finally { state.loading = false; }
  }

  function filtered() {
    const q = String($('#staff360Search')?.value || '').trim().toLowerCase();
    const branch = String($('#staff360Branch')?.value || '');
    const role = String($('#staff360Role')?.value || '');
    const status = String($('#staff360Status')?.value || '');
    return state.list.filter(row => {
      const hay = `${row.full_name||''} ${row.role||''} ${row.branch||''}`.toLowerCase();
      return (!q || hay.includes(q)) && (!branch || row.branch === branch) && (!role || row.role === role) && (!status || (status==='active' ? row.is_active : !row.is_active));
    });
  }

  function renderList() {
    const el = $('#staff360List'); if (!el) return;
    const rows = filtered();
    el.innerHTML = rows.length ? rows.map(row => `<button class="staff360-person ${state.selected?.id===row.id?'selected':''}" type="button" data-id="${esc(row.id)}">
      <span class="staff360-avatar">${esc((row.full_name||'S').trim().slice(0,1).toUpperCase())}</span><span class="staff360-person-main"><strong>${esc(row.full_name||'—')}</strong><small>${esc(row.role||'—')} · ${esc(row.branch||'all')}</small><em>${row.is_active?'ACTIVE':'INACTIVE'}</em></span><span class="staff360-load"><b>${fmt(row.shipment_count)}</b><small>loads</small></span>
    </button>`).join('') : '<div class="staff360-empty">هیچ staff ـێک لەگەڵ ئەم filter ـانە نەدۆزرایەوە.</div>';
    $$('.staff360-person', el).forEach(btn => btn.onclick = () => selectStaff(btn.dataset.id));
  }

  async function selectStaff(id) {
    const row = state.list.find(x=>String(x.id)===String(id)); if (!row) return;
    state.selected = row; renderList();
    const profile = $('#staff360Profile');
    profile.innerHTML = '<div class="staff360-loading">360° profile بار دەکرێت…</div>';
    try {
      const data = await getJSON(`${DIRECTORY_FN}?staff_id=${encodeURIComponent(id)}`);
      state.selected = { ...row, ...data.staff };
      renderProfile(data);
    } catch (error) {
      profile.innerHTML = `<div class="staff360-error">${esc(error.message || 'Failed to load profile')}</div>`;
    }
  }

  function renderProfile(data) {
    const s = data.staff || {}; const a = data.auth || {}; const st = data.stats || {};
    const canEdit = state.me?.role === 'super_admin' && String(s.id) !== String(state.me?.id);
    $('#staff360Profile').innerHTML = `<div class="staff360-profile-head"><div class="staff360-big-avatar">${esc((s.full_name||'S').trim().slice(0,1).toUpperCase())}</div><div class="staff360-profile-name"><div class="staff360-kicker">STAFF ID · ${esc(s.id)}</div><h3>${esc(s.full_name||'—')}</h3><p>${esc(a.email||'ئیمەیڵ بەردەست نییە')} · ${esc(s.role||'—')} · ${esc(s.branch||'all')}</p><span class="staff360-state ${s.is_active?'active':'inactive'}">${s.is_active?'ACTIVE':'INACTIVE'}</span></div><div class="staff360-profile-actions">${canEdit?`<button class="staff360-btn" id="staff360Edit">Edit Access</button><button class="staff360-btn danger" id="staff360Disable">${s.is_active?'Deactivate':'Reactivate'}</button><button class="staff360-btn danger" id="staff360Delete">Delete</button>`:'<span class="staff360-readonly">READ / MANAGE</span>'}</div></div>
      <div class="staff360-stat-grid"><div><span>Shipments</span><strong>${fmt(st.shipment_count)}</strong></div><div><span>Open tasks</span><strong>${fmt(st.open_task_count)}</strong></div><div><span>Customers</span><strong>${fmt(st.customer_count)}</strong></div><div><span>Activities</span><strong>${fmt(st.activity_count)}</strong></div><div><span>Open balance</span><strong>$${Number(st.open_balance||0).toLocaleString('en-US',{maximumFractionDigits:0})}</strong></div><div><span>Last activity</span><strong class="small">${esc(date(st.last_activity_at))}</strong></div></div>
      <div class="staff360-section"><div class="staff360-section-title"><div><div class="staff360-kicker">ACCOUNT</div><h4>Access & security</h4></div></div><div class="staff360-info-grid"><div><span>Role</span><b>${esc(s.role||'—')}</b></div><div><span>Branch</span><b>${esc(s.branch||'all')}</b></div><div><span>Created</span><b>${esc(date(s.created_at))}</b></div><div><span>Updated</span><b>${esc(date(s.updated_at))}</b></div><div><span>Last sign-in</span><b>${esc(date(a.last_sign_in_at))}</b></div><div><span>Email confirmed</span><b>${a.email_confirmed_at?'YES':'NO'}</b></div></div></div>
      <div class="staff360-section"><div class="staff360-section-title"><div><div class="staff360-kicker">WORK QUEUE</div><h4>Assigned shipments</h4></div></div>${table(data.shipments,[['ID',r=>`<span class="mono">${esc(r.id)}</span>`],['Customer',r=>esc(r.customer_name||'—')],['Route',r=>`${esc(r.origin_key||'—')} → ${esc(r.dest_key||'—')}`],['Status',r=>`<span class="staff360-pill">${r.step_dates?.delivered?'DELIVERED':`STEP ${fmt(Number(r.current_step_index||0)+1)}`}</span>`],['Created',r=>esc(date(r.created_at))]])}</div>
      <div class="staff360-section"><div class="staff360-section-title"><div><div class="staff360-kicker">TASKS</div><h4>Assigned tasks</h4></div></div>${table(data.tasks,[['Task',r=>`<b>${esc(r.title||'—')}</b><small class="staff360-sub">${esc(r.description||'')}</small>`],['Status',r=>`<span class="staff360-pill">${esc(r.status||'—')}</span>`],['Priority',r=>esc(r.priority||'—')],['Due',r=>esc(date(r.due_at))]])}</div>
      <div class="staff360-section"><div class="staff360-section-title"><div><div class="staff360-kicker">CUSTOMERS</div><h4>Managed customers</h4></div></div>${table(data.customers,[['Customer',r=>`<b>${esc(r.name||'—')}</b><small class="staff360-sub">${esc(r.gc_code||r.code||'—')}</small>`],['Phone',r=>esc(r.phone||'—')],['City',r=>esc(r.city||'—')],['Status',r=>`<span class="staff360-pill">${r.is_active?'ACTIVE':'INACTIVE'}</span>`]])}</div>
      <div class="staff360-section"><div class="staff360-section-title"><div><div class="staff360-kicker">AUDIT</div><h4>Recent activity</h4></div></div>${table(data.activity,[['Action',r=>`<b>${esc(r.action||'—')}</b><small class="staff360-sub">${esc(r.target_id||'')}</small>`],['Details',r=>esc(typeof r.details==='string'?r.details:JSON.stringify(r.details||{}))],['Time',r=>esc(date(r.created_at))]])}</div>`;
    $('#staff360Edit')?.addEventListener('click', () => showEditStaff(data));
    $('#staff360Disable')?.addEventListener('click', () => toggleStaff(data));
    $('#staff360Delete')?.addEventListener('click', () => deleteStaff(data));
  }

  function table(rows, cols) {
    if (!rows?.length) return '<div class="staff360-empty compact">هیچ record ـێکی بەستراو نییە.</div>';
    return `<div class="staff360-table-wrap"><table><thead><tr>${cols.map(c=>`<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,100).map(r=>`<tr>${cols.map(c=>`<td>${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function modal(title, subtitle, body, handler) {
    $('#staff360Modal')?.remove();
    const root = document.createElement('div'); root.id='staff360Modal'; root.className='staff360-modal-bg';
    root.innerHTML = `<form class="staff360-modal" id="staff360ModalForm"><div class="staff360-modal-head"><div><div class="staff360-kicker">STAFF CONTROL</div><h3>${esc(title)}</h3><p>${esc(subtitle||'')}</p></div><button type="button" class="staff360-btn" id="staff360ModalClose">✕</button></div>${body}<div class="staff360-modal-foot"><span id="staff360ModalMsg"></span><button type="button" class="staff360-btn" id="staff360ModalCancel">Cancel</button><button class="staff360-btn primary" type="submit">Save</button></div></form>`;
    document.body.appendChild(root); $('#staff360ModalClose').onclick=()=>root.remove(); $('#staff360ModalCancel').onclick=()=>root.remove();
    $('#staff360ModalForm').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button[type="submit"]');const msg=$('#staff360ModalMsg');btn.disabled=true;try{await handler(new FormData(e.target));root.remove();toast('کردارەکە بە سەرکەوتوویی تەواو بوو.');await loadDirectory();}catch(err){msg.textContent=err.message||'Error';toast(err.message||'Error',true);btn.disabled=false;}};
  }

  function showAddStaff() {
    const roles=['admin','super_admin','accountant','finance','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','driver','delivery'];
    modal('Create Staff Account','هەژماری نوێ لە Supabase Auth + staff table دروست دەکرێت.',`<div class="staff360-form-grid"><label>ناو<input class="staff360-field" name="full_name" required></label><label>ئیمەیڵ<input class="staff360-field" name="email" type="email" required></label><label>Role<select class="staff360-field" name="role">${roles.map(r=>`<option>${r}</option>`).join('')}</select></label><label>Branch<input class="staff360-field" name="branch" value="all"></label><label>وشەی نهێنی (optional)<input class="staff360-field" name="password" type="password" autocomplete="new-password"></label><label class="staff360-check"><input type="checkbox" name="send_invite" value="true" checked> Invite by email</label></div>`,async fd=>{await account('create',{full_name:fd.get('full_name'),email:fd.get('email'),role:fd.get('role'),branch:fd.get('branch'),password:fd.get('password'),send_invite:fd.get('send_invite')==='true'});});
  }

  function showEditStaff(data) {
    const s=data.staff, a=data.auth||{};
    if (String(s.id)===String(state.me?.id)) return toast('ناتوانیت دەسەڵاتی هەژماری خۆت لێ بگۆڕیت.', true);
    const roles=['admin','super_admin','accountant','finance','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','driver','delivery'];
    modal('Edit Staff Access','گۆڕانکارییەکان ڕاستەوخۆ لە Auth و staff تۆمار دەکرێن.',`<div class="staff360-form-grid"><label>ناو<input class="staff360-field" name="full_name" value="${esc(s.full_name||'')}" required></label><label>ئیمەیڵ<input class="staff360-field" name="email" type="email" value="${esc(a.email||'')}"></label><label>Role<select class="staff360-field" name="role">${roles.map(r=>`<option ${r===s.role?'selected':''}>${r}</option>`).join('')}</select></label><label>Branch<input class="staff360-field" name="branch" value="${esc(s.branch||'all')}"></label><label>Password<input class="staff360-field" name="password" type="password" autocomplete="new-password" placeholder="بەتاڵ بهێڵەوە ئەگەر ناگۆڕدرێت"></label><label class="staff360-check"><input type="checkbox" name="is_active" value="true" ${s.is_active?'checked':''}> Account active</label></div>`,async fd=>{await account('update',{id:s.id,full_name:fd.get('full_name'),email:fd.get('email'),role:fd.get('role'),branch:fd.get('branch'),password:fd.get('password'),is_active:fd.get('is_active')==='true'});});
  }

  async function toggleStaff(data) {
    const s=data.staff; if(String(s.id)===String(state.me?.id)) return toast('هەژماری خۆت ناتوانیت ناچالاک بکەیت.',true);
    const action=s.is_active?'Deactivate':'Reactivate'; if(!confirm(`${action} ${s.full_name}?`)) return;
    try { await account('update',{id:s.id,is_active:!s.is_active}); toast(`${action} completed`); await loadDirectory(); } catch(e){toast(e.message||'Update failed',true);}
  }

  async function deleteStaff(data) {
    const s=data.staff; if(String(s.id)===String(state.me?.id)) return toast('هەژماری خۆت ناتوانیت بسڕیتەوە.',true);
    if(!confirm(`Delete / deactivate ${s.full_name}? ئەمە دسترسی Auth ـیش لادەبات.`)) return;
    try { await account('delete',{id:s.id}); toast('Staff account deactivated'); await loadDirectory(); } catch(e){toast(e.message||'Delete failed',true);}
  }

  async function install() {
    try {
      await auth();
      if (location.pathname === '/staff.html') return;
      if ($('#staff360Launcher')) return;
      const actions = $('.top-actions'); if(!actions) return;
      const button=document.createElement('button'); button.id='staff360Launcher'; button.type='button'; button.className='btn primary'; button.textContent='◈ Staff 360°'; button.onclick=openDrawer; actions.prepend(button);
      document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='s'){e.preventDefault();openDrawer();}});
    } catch(e) { console.warn('[GC Staff 360]',e); }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>void install(),{once:true}); else void install();
})();
