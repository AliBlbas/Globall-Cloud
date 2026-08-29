(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const HEALTH_FN = `${SUPABASE_URL}/functions/v1/system-health`;
  const state = { client: null, session: null, me: null, health: null, timer: null };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
  const fmtTime = (v) => v ? new Date(v).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' }) : '—';

  async function client() {
    if (state.client) return state.client;
    if (window.gcEnsureSupabase) {
      try { await window.gcEnsureSupabase(); } catch (_) {}
    }
    if (window.gcSupabase) return state.client = window.gcSupabase;
    if (window.supabase?.createClient) return state.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
    throw new Error('Supabase client unavailable');
  }

  async function auth() {
    const db = await client();
    const { data, error } = await db.auth.getSession();
    if (error || !data?.session) throw new Error('Unauthorized');
    state.session = data.session;
    const { data: me, error: meError } = await db.from('staff').select('id,full_name,role,branch,is_active').eq('id', data.session.user.id).maybeSingle();
    if (meError || !me || me.is_active !== true || me.role !== 'super_admin') throw new Error('Super Admin access required');
    state.me = me;
    return db;
  }

  async function loadHealth() {
    try {
      await auth();
      const response = await fetch(HEALTH_FN, {
        method: 'GET',
        headers: { Authorization: `Bearer ${state.session.access_token}`, apikey: SUPABASE_KEY, Accept: 'application/json' },
        cache: 'no-store',
      });
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { status:'down', diagnostics:{ raw:text } }; }
      state.health = data;
      renderHealth(data);
    } catch (error) {
      state.health = { status:'down', checks:{}, diagnostics:{ server: error?.message || 'Health check failed' } };
      renderHealth(state.health);
    }
  }

  function checkLabel(key) {
    return ({
      database:'Database', shipments:'Shipment engine', configuration_bridge:'Configuration bridge', control_plane:'Logistics control plane', notification_outbox:'Notification outbox', integration_inbox:'Integration inbox', payment_sessions:'Payment sessions', payment_webhook_events:'Payment webhook events', advanced_workflows:'Advanced workflows', document_vault:'Document vault', document_storage:'Document storage'
    })[key] || key.replaceAll('_',' ');
  }

  function renderHealth(data) {
    const root = $('#saServerPanel');
    if (!root) return;
    const status = String(data.status || 'down');
    const checks = data.checks || {};
    const statusText = status === 'ok' ? 'ONLINE · HEALTHY' : status === 'degraded' ? 'DEGRADED · ATTENTION' : 'OFFLINE · UNAVAILABLE';
    const statusEl = $('.sa-server-status', root);
    statusEl?.classList.remove('degraded','down');
    if (status !== 'ok') statusEl?.classList.add(status === 'degraded' ? 'degraded' : 'down');
    const statusLabel = $('.sa-server-status-label', root);
    if (statusLabel) statusLabel.textContent = statusText;
    $('.sa-server-pulse', root)?.style.setProperty('color', status === 'ok' ? 'var(--sa-green)' : status === 'degraded' ? 'var(--sa-amber)' : 'var(--sa-red)');
    const latency = $('.sa-server-latency', root);
    if (latency) latency.textContent = `${Number(data.latency_ms ?? 0)} ms`;
    const checked = $('.sa-server-checked', root);
    if (checked) checked.textContent = fmtTime(checks.timestamp);
    const list = $('.sa-check-list', root);
    if (list) {
      list.innerHTML = Object.entries(checks).filter(([k,v]) => k !== 'timestamp' && typeof v === 'boolean').map(([key,value]) => `<div class="sa-check ${value ? 'ok' : 'bad'}"><div class="sa-check-main"><span class="sa-check-dot"></span><span class="sa-check-name">${esc(checkLabel(key))}</span></div><span class="sa-check-value">${value ? 'READY' : 'FAIL'}</span></div>`).join('');
    }
    const diag = $('.sa-diag', root);
    const diagnostics = data.diagnostics || {};
    if (diag) {
      const items = Object.entries(diagnostics).filter(([,v]) => v);
      diag.innerHTML = items.length ? items.map(([key,value]) => `<div class="sa-diag-box"><span>${esc(key)}</span><strong>${esc(value)}</strong></div>`).join('') : '<div class="sa-diag-box"><span>Diagnostics</span><strong>No active diagnostics</strong><p>All monitored subsystems responded within the last health probe.</p></div>';
    }
  }

  function openTab(tab) {
    const btn = document.querySelector(`.nav-item[data-tab="${CSS.escape(tab)}"]`);
    if (btn) btn.click();
  }

  function installPanel() {
    if ($('#saServerPanel')) return;
    const main = $('.main');
    const nav = $('#nav');
    if (!main || !nav) return;

    const navBtn = document.createElement('button');
    navBtn.className = 'nav-item';
    navBtn.dataset.tab = 'server';
    navBtn.innerHTML = '<span>◉</span> Server Control';
    navBtn.title = 'Server Control';
    nav.appendChild(navBtn);

    const section = document.createElement('section');
    section.id = 'server';
    section.className = 'tab-panel';
    section.innerHTML = `
      <div class="sa-server-shell" id="saServerPanel">
        <div class="sa-server-hero">
          <div class="sa-server-head">
            <div>
              <div class="sa-server-kicker">GLOBAL CLOUD · SERVER CONTROL</div>
              <h2 class="sa-server-title">Production Control Plane</h2>
              <p class="sa-server-sub">ڕاستەوخۆیی health check بۆ database، logistics، notifications، payments و document storage.</p>
            </div>
            <div class="sa-server-status"><span class="sa-server-pulse"></span><span class="sa-server-status-label">CHECKING…</span></div>
          </div>
          <div class="sa-server-metrics">
            <div class="sa-server-metric"><span>Service</span><strong>GLOBAL-CLOUD</strong><small>production</small></div>
            <div class="sa-server-metric"><span>Probe latency</span><strong class="sa-server-latency">—</strong><small>health endpoint</small></div>
            <div class="sa-server-metric"><span>Last check</span><strong class="sa-server-checked" style="font-size:13px">—</strong><small>server timestamp</small></div>
            <div class="sa-server-metric"><span>Access</span><strong>SUPER ADMIN</strong><small>authenticated</small></div>
          </div>
        </div>
        <div class="sa-server-grid">
          <section class="sa-server-card">
            <div class="sa-server-card-head"><div><div class="sa-server-kicker">SUBSYSTEM MATRIX</div><h3>Service health</h3><p>Actual production probes — no placeholder status.</p></div><div class="sa-server-actions"><button class="sa-server-btn primary" id="saServerRefresh" type="button">Probe now</button></div></div>
            <div class="sa-server-card-body"><div class="sa-check-list"><div class="sa-check warn"><div class="sa-check-main"><span class="sa-check-dot"></span><span class="sa-check-name">Running health probe…</span></div><span class="sa-check-value">WAIT</span></div></div></div>
          </section>
          <section class="sa-server-card">
            <div class="sa-server-card-head"><div><div class="sa-server-kicker">DIAGNOSTICS</div><h3>Server diagnostics</h3><p>Only surfaced when a subsystem reports an issue.</p></div></div>
            <div class="sa-server-card-body"><div class="sa-diag"><div class="sa-diag-box"><span>Diagnostics</span><strong>Checking server state…</strong></div></div></div>
          </section>
        </div>
        <div class="sa-server-card">
          <div class="sa-server-card-head"><div><div class="sa-server-kicker">CONTROL ACTIONS</div><h3>Quick access</h3><p>Navigate directly to the operational surfaces.</p></div></div>
          <div class="sa-server-card-body"><div class="sa-server-actions"><button class="sa-server-btn" type="button" data-sa-server-jump="staff">Staff management</button><button class="sa-server-btn" type="button" data-sa-server-jump="customers">Customer management</button><button class="sa-server-btn" type="button" data-sa-server-jump="operations">Shipment operations</button><button class="sa-server-btn" type="button" data-sa-server-jump="warehouse">Warehouse</button><button class="sa-server-btn" type="button" data-sa-server-jump="audit">Audit trail</button><button class="sa-server-btn" type="button" data-sa-server-jump="settings">System settings</button></div></div>
        </div>
      </div>`;
    main.appendChild(section);

    navBtn.addEventListener('click', () => setActiveTab('server'));
    $('#saServerRefresh').addEventListener('click', loadHealth);
    $$('[data-sa-server-jump]').forEach((b) => b.addEventListener('click', () => openTab(b.dataset.saServerJump)));
  }

  function setActiveTab(id) {
    document.querySelectorAll('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.tab === id));
    document.querySelectorAll('.tab-panel').forEach((el) => el.classList.toggle('active', el.id === id));
    const title = { server:['Server Control','Production server health and control plane.'] }[id];
    if (title) {
      $('#pageTitle') && ($('#pageTitle').textContent = title[0]);
      $('#pageSub') && ($('#pageSub').textContent = title[1]);
      window.scrollTo({ top:0, behavior:'smooth' });
    }
  }

  function installCommandPalette() {
    if ($('#saCommandPalette')) return;
    const palette = document.createElement('div');
    palette.id = 'saCommandPalette';
    palette.className = 'sa-command-palette';
    palette.hidden = true;
    palette.innerHTML = `<div class="sa-command-box"><input class="sa-command-input" id="saCommandInput" placeholder="Search commands…  Ctrl+K" autocomplete="off"><div class="sa-command-list" id="saCommandList"></div></div>`;
    document.body.appendChild(palette);
    const commands = [
      ['Open Server Control','server','⌘1'], ['Manage Staff','staff','⌘2'], ['Manage Customers','customers','⌘3'], ['Manage Shipments','operations','⌘4'], ['Open Warehouse','warehouse','⌘5'], ['Open Audit Trail','audit','⌘6'], ['Open Settings','settings','⌘7'],
    ];
    function render(filter='') {
      const rows = commands.filter(([label]) => label.toLowerCase().includes(filter.toLowerCase()));
      const list = $('#saCommandList');
      if (!list) return;
      list.innerHTML = rows.map(([label,tab,key],i) => `<button class="sa-command-item ${i===0?'active':''}" type="button" data-tab="${tab}"><span>${esc(label)}<small>${tab}</small></span><span class="sa-command-key">${key}</span></button>`).join('');
      $$('.sa-command-item', palette).forEach(b => b.addEventListener('click', () => { palette.hidden=true; openTab(b.dataset.tab); if(b.dataset.tab==='server') setActiveTab('server'); }));
    }
    render();
    $('#saCommandInput')?.addEventListener('input', e => render(e.target.value));
    palette.addEventListener('click', e => { if(e.target === palette) palette.hidden=true; });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k') { e.preventDefault(); palette.hidden=false; const input=$('#saCommandInput'); if(input){input.value='';render();input.focus();} }
      if (e.key==='Escape' && !palette.hidden) palette.hidden=true;
    });
  }

  async function boot() {
    try {
      if (location.pathname !== '/superadmin.html') return;
      await auth();
      installPanel();
      installCommandPalette();
      await loadHealth();
      clearInterval(state.timer); state.timer = setInterval(loadHealth, 30000);
    } catch (error) {
      console.warn('[GC Server Control]', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void boot(), { once:true }); else void boot();
})();
