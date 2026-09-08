(() => {
  'use strict';

  if (window.__gcStaffOSPro) return;
  window.__gcStaffOSPro = true;

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const HEALTH_FN = `${SUPABASE_URL}/functions/v1/staff-data-health`;
  const state = { lastSync:null, health:null, healthBusy:false, paletteOpen:false, booted:false };
  const qs = (selector, root=document) => root.querySelector(selector);
  const qsa = (selector, root=document) => [...root.querySelectorAll(selector)];
  const text = (v) => String(v ?? '').trim();
  const esc = (v) => text(v).replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const time = (v) => v ? new Date(v).toLocaleTimeString('ku-IQ',{hour:'2-digit',minute:'2-digit'}) : '—';

  function token() {
    return window.gcSupabase?.auth?.getSession?.().then(({data}) => data?.session?.access_token || null).catch(() => null);
  }

  function setStatus(label, kind='live') {
    const el = qs('#systemStatus');
    if (!el) return;
    el.textContent = label;
    el.dataset.proState = kind;
    el.title = kind === 'live' ? 'پەیوەندیی production چالاکە' : 'پەیوەندیی production پێویستی پشکنینە';
  }

  function ensureRibbon() {
    const main = qs('.gc-main');
    if (!main || qs('#gcProRibbon')) return false;
    const topbar = qs('.topbar', main);
    const ribbon = document.createElement('section');
    ribbon.id = 'gcProRibbon';
    ribbon.className = 'gc-pro-ribbon';
    ribbon.innerHTML = `
      <div class="gc-pro-brand"><span class="gc-pro-pulse" aria-hidden="true"></span><div><strong>LIVE OPERATIONS</strong><small>وەشانی production · داتا لە سێرڤەری واقعیی Globall Cloud</small></div></div>
      <div class="gc-pro-chips"><span class="gc-pro-chip" id="gcProOnline">Online</span><span class="gc-pro-chip" id="gcProScope">Scope: —</span><span class="gc-pro-chip" id="gcProSync">Sync: —</span><span class="gc-pro-chip" id="gcProHealth">Backend: checking</span></div>
      <div class="gc-pro-actions"><button class="btn small" type="button" id="gcProHealthBtn">پشکنینی backend</button><button class="btn small" type="button" id="gcProPaletteBtn">⌘ کۆماند</button></div>`;
    if (topbar?.nextSibling) main.insertBefore(ribbon, topbar.nextSibling); else main.prepend(ribbon);
    bindRibbon();
    return true;
  }

  function bindRibbon() {
    qs('#gcProHealthBtn')?.addEventListener('click', () => refreshHealth(true));
    qs('#gcProPaletteBtn')?.addEventListener('click', openPalette);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    updateOnline();
  }

  function updateOnline() {
    const el = qs('#gcProOnline');
    if (!el) return;
    const online = navigator.onLine !== false;
    el.textContent = online ? 'Online' : 'Offline';
    el.dataset.state = online ? 'ok' : 'bad';
  }

  function updateScope() {
    const staff = window.gcStaffIdentity || {};
    const el = qs('#gcProScope');
    if (!el) return;
    const role = text(staff.role) || 'staff';
    const branch = text(staff.branch) || 'all';
    el.textContent = `Scope: ${role} · ${branch}`;
    el.title = `Role: ${role} · Branch: ${branch}`;
  }

  function setSync(at=Date.now()) {
    state.lastSync = new Date(at);
    const el = qs('#gcProSync');
    if (el) el.textContent = `Sync: ${time(state.lastSync)}`;
  }

  function setHealth(ok, message, detail='') {
    const el = qs('#gcProHealth');
    if (!el) return;
    el.textContent = `Backend: ${message}`;
    el.dataset.state = ok ? 'ok' : 'warn';
    if (detail) el.title = detail;
  }

  async function refreshHealth(force=false) {
    if (state.healthBusy) return state.health;
    const t = await token();
    if (!t) { setHealth(false,'login required','چوونەژوورەوەی Staff پێویستە بۆ health'); return null; }
    if (!force && state.health?.generated_at && Date.now()-new Date(state.health.generated_at).getTime()<12000) return state.health;
    state.healthBusy = true;
    try {
      const started = performance.now();
      const response = await fetch(HEALTH_FN,{headers:{Authorization:`Bearer ${t}`,apikey:SUPABASE_KEY,Accept:'application/json'},cache:'no-store'});
      const payload = await response.json().catch(()=>({}));
      const latency = Math.round(performance.now()-started);
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      state.health = payload;
      const q = payload.quality || {};
      const issues = Number(q.missing_gc||0)+Number(q.missing_mode||0)+Number(q.missing_operational_status||0)+Number(q.missing_timeline||0)+Number(q.stale_72h||0);
      const healthy = issues===0;
      setHealth(healthy,healthy?`healthy · ${latency}ms`:`degraded · ${issues}`,`Backend latency ${latency}ms`);
      updateHealthMetrics(q);
      setSync(payload.generated_at || Date.now());
      setStatus(healthy?'Supabase · Live':'Supabase · Degraded',healthy?'live':'warn');
      return payload;
    } catch (error) {
      setHealth(false,'degraded',error.message || 'backend health failed');
      setStatus('Supabase · Degraded','warn');
      return null;
    } finally { state.healthBusy=false; }
  }

  function updateHealthMetrics(q) {
    const map={gcHealthShipments:q.shipments,gcHealthOpenTasks:q.tasks_open,gcHealthReceipts:q.warehouse_receipts,gcHealthFinance:q.finance_transactions,gcHealthAlerts:q.alerts};
    Object.entries(map).forEach(([id,value])=>{const el=qs(`#${id}`);if(el)el.textContent=Number(value??0).toLocaleString('en-US');});
    const issueEl=qs('#gcHealthIssues');
    if(issueEl){const issues=Number(q.missing_gc||0)+Number(q.missing_mode||0)+Number(q.missing_operational_status||0)+Number(q.missing_timeline||0)+Number(q.stale_72h||0);issueEl.textContent=String(issues);issueEl.dataset.state=issues?'warn':'ok';}
  }

  function installFetchObserver() {
    if(window.__gcStaffOSProFetch)return;
    window.__gcStaffOSProFetch=true;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async(...args)=>{
      const response=await nativeFetch(...args);
      const url=typeof args[0]==='string'?args[0]:args[0]?.url||'';
      if(/supabase\.co\/functions\/v1\/(operations-v4|account-admin|warehouse-receiving|staff-ops-hub|staff-data-health)/i.test(url)&&response.ok){setSync(Date.now());setStatus('Supabase · Live','live');}
      return response;
    };
  }

  function addHealthSummary() {
    const view=qs('#view');
    if(!view||qs('[data-gc-pro-health-summary]'))return;
    const title=text(qs('#pageTitle')?.textContent);
    if(!/داشبۆرد|Dashboard/i.test(title))return;
    const card=document.createElement('section');card.className='card gc-pro-health-summary';card.dataset.gcProHealthSummary='1';
    card.innerHTML='<div class="card-head"><div><h3>PRODUCTION HEALTH</h3><span class="muted">پشکنینی راستەوخۆی backend و quality ـی داتا</span></div><span class="pill" id="gcHealthIssues">—</span></div><div class="gc-pro-health-grid"><div><span>Shipments</span><strong id="gcHealthShipments">—</strong></div><div><span>Open Tasks</span><strong id="gcHealthOpenTasks">—</strong></div><div><span>Warehouse</span><strong id="gcHealthReceipts">—</strong></div><div><span>Finance</span><strong id="gcHealthFinance">—</strong></div><div><span>Alerts</span><strong id="gcHealthAlerts">—</strong></div></div><div class="gc-pro-health-note" id="gcHealthNote">کەمترین مەعلومات لێرە پیشان دەدرێت؛ هیچ داتای ساختە زیاد ناکرێت.</div>';
    view.appendChild(card);
  }

  function normalizeErrors(root=document) {
    qsa('.empty, .login-msg, .toast, [data-retry]',root).forEach(el=>{
      const original=text(el.textContent);if(!original)return;let replacement=null;
      if(/permission denied|forbidden|staff permission required/i.test(original))replacement='دەستپێگەیشتنت بۆ ئەم کردارە نییە.';
      else if(/unauthorized|401|session required/i.test(original))replacement='جلسەنی Staff بەسەرچوو یان پشتڕاست نەکراوەتەوە؛ دووبارە بچۆ ژوورەوە.';
      else if(/internal server error|http 5\d\d|server error/i.test(original))replacement='سێرڤەر وەڵامی ناتەواوی دا؛ پشکنینی backend بکە و دووبارە هەوڵ بدە.';
      if(!replacement)return;const strong=el.querySelector('strong');if(strong)strong.textContent=replacement;else el.textContent=replacement;
    });
  }

  function setupErrorGuard() {
    const observer=new MutationObserver(()=>{normalizeErrors();ensureRetryControl();updateScope();});
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.setTimeout(()=>observer.disconnect(),120000);
    normalizeErrors();
  }

  function ensureRetryControl() {
    const view=qs('#view');if(!view||qs('#gcProRetry'))return;
    const errorText=text(view.textContent);if(!/دووبارە|سێرڤەر وەڵامی|دەستپێگەیشتنت/i.test(errorText))return;
    const control=document.createElement('div');control.id='gcProRetry';control.className='gc-pro-retry';
    control.innerHTML='<button class="btn primary" type="button">↻ دووبارە بارکردن</button><small>داتاکە لە سێرڤەری واقعی دووبارە وەردەگیرێت.</small>';
    control.querySelector('button').addEventListener('click',()=>qs('#refreshBtn')?.click());view.appendChild(control);
  }

  function paletteItems(){return qsa('.nav-btn').map(btn=>({id:btn.dataset.tab,label:text(btn.textContent).replace(/\s+/g,' '),button:btn})).filter(x=>x.id);}

  function openPalette(){
    if(state.paletteOpen)return;state.paletteOpen=true;
    const back=document.createElement('div');back.className='gc-pro-palette-backdrop';back.id='gcProPalette';
    back.innerHTML='<section class="gc-pro-palette" role="dialog" aria-modal="true" aria-label="Command palette"><div class="gc-pro-palette-head"><div><span>GLOBALL CLOUD</span><strong>Command Palette</strong></div><button class="btn small" type="button" data-gc-close>Esc</button></div><input class="field" id="gcProPaletteSearch" placeholder="گەڕان لە menu ـی Staff…"><div class="gc-pro-palette-list" id="gcProPaletteList"></div></section>';
    document.body.appendChild(back);
    const input=qs('#gcProPaletteSearch'),list=qs('#gcProPaletteList');
    const draw=()=>{const q=text(input.value).toLowerCase();const rows=paletteItems().filter(item=>!q||item.label.toLowerCase().includes(q)||item.id.includes(q));list.innerHTML=rows.map(item=>`<button type="button" class="gc-pro-command" data-gc-tab="${esc(item.id)}"><span>${esc(item.id)}</span><strong>${esc(item.label)}</strong></button>`).join('')||'<div class="empty">هیچ menu ـێک نەدۆزرایەوە.</div>';qsa('[data-gc-tab]',list).forEach(btn=>btn.addEventListener('click',()=>{qs(`.nav-btn[data-tab="${CSS.escape(btn.dataset.gcTab)}"]`)?.click();closePalette();}));};
    input.addEventListener('input',draw);back.addEventListener('click',e=>{if(e.target===back||e.target.closest('[data-gc-close]'))closePalette();});draw();input.focus();
  }
  function closePalette(){state.paletteOpen=false;qs('#gcProPalette')?.remove();}

  function bindKeyboard(){window.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openPalette();}if(event.key==='Escape'&&state.paletteOpen)closePalette();});}

  function bootWhenReady(){
    const tryBoot=()=>{
      if(!qs('.gc-shell'))return false;
      if(!state.booted){state.booted=true;installFetchObserver();ensureRibbon();updateScope();setupErrorGuard();bindKeyboard();void refreshHealth(true);window.setTimeout(()=>{addHealthSummary();void refreshHealth(false);},900);window.setInterval(()=>{updateScope();updateOnline();void refreshHealth(false);},30000);}
      else{ensureRibbon();updateScope();addHealthSummary();normalizeErrors();}
      return true;
    };
    if(tryBoot())return;
    const observer=new MutationObserver(()=>{if(tryBoot())observer.disconnect();});
    observer.observe(document.body,{childList:true,subtree:true});
    window.setTimeout(()=>observer.disconnect(),30000);
  }

  bootWhenReady();
})();
