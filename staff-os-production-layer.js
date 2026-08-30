/* Globall Cloud Staff OS — production operations layer */
(() => {
  'use strict';
  if (!/^\/staff(?:-os)?(?:\.html)?\/?$/.test(window.location.pathname)) return;

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const FN = `${SUPABASE_URL}/functions/v1/account-admin`;
  const OPS_FN = `${SUPABASE_URL}/functions/v1/logistics-control-plane`;
  const state = { cache:null, cacheAt:0, open:false, timer:null };
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (v) => Number(v || 0).toLocaleString('en-US');
  const money = (v) => Number(v || 0).toLocaleString('en-US',{maximumFractionDigits:2});

  function session(){ return window.gcSupabase?.auth?.getSession ? window.gcSupabase.auth.getSession() : window.sb?.auth?.getSession(); }
  async function token(){
    const result = await session();
    const accessToken = result?.data?.session?.access_token;
    if (!accessToken) throw new Error('Staff session required');
    return accessToken;
  }
  async function getAccount(kind, signal){
    const accessToken = await token();
    const u = new URL(FN); u.searchParams.set('kind', kind);
    const res = await fetch(u,{headers:{Authorization:`Bearer ${accessToken}`,apikey:SUPABASE_KEY,Accept:'application/json'},cache:'no-store',signal});
    const text = await res.text(); let data={}; try{data=text?JSON.parse(text):{}}catch{data={error:text}};
    if(!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return Array.isArray(data?.items) ? data.items : [];
  }
  async function getOps(kind, signal){
    const accessToken = await token();
    const u = new URL(OPS_FN); u.searchParams.set('kind',kind); u.searchParams.set('limit','100');
    const res = await fetch(u,{headers:{Authorization:`Bearer ${accessToken}`,apikey:SUPABASE_KEY,Accept:'application/json'},cache:'no-store',signal});
    const text = await res.text(); let data={}; try{data=text?JSON.parse(text):{}}catch{data={error:text}};
    if(!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return Array.isArray(data?.items) ? data.items : [];
  }
  async function snapshot(force=false){
    if(!force && state.cache && Date.now()-state.cacheAt<45000) return state.cache;
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),9000);
    try{
      const [staff,customers,shipments,logs,exceptions] = await Promise.all([
        getAccount('staff',controller.signal),getAccount('customer',controller.signal),getAccount('shipment',controller.signal),getAccount('log',controller.signal),getOps('exceptions',controller.signal)
      ]);
      state.cache={staff,customers,shipments,logs,exceptions}; state.cacheAt=Date.now(); return state.cache;
    } finally { clearTimeout(timeout); }
  }
  function derive(d){
    const activeStaff=d.staff.filter(x=>x.is_active).length;
    const activeShipments=d.shipments.filter(x=>!['delivered','cancelled','canceled'].includes(String(x.status||'').toLowerCase())).length;
    const unassigned=d.shipments.filter(x=>!x.assigned_staff_id && !['delivered','cancelled','canceled'].includes(String(x.status||'').toLowerCase())).length;
    const outstanding=d.shipments.reduce((sum,x)=>sum+Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0)),0);
    const critical=d.exceptions.filter(x=>String(x.severity||'').toLowerCase()==='critical').length;
    const attention=d.exceptions.filter(x=>['critical','high','medium'].includes(String(x.severity||'').toLowerCase())).length;
    const today=Date.now()-86400000;
    const recentActivity=d.logs.filter(x=>new Date(x.created_at||0).getTime()>=today).length;
    const staffMap=new Map(d.staff.map(x=>[String(x.id),x]));
    const loads=new Map(); d.shipments.forEach(x=>{if(x.assigned_staff_id)loads.set(String(x.assigned_staff_id),(loads.get(String(x.assigned_staff_id))||0)+1)});
    const workload=d.staff.filter(x=>x.is_active).map(x=>({...x,load:loads.get(String(x.id))||0})).sort((a,b)=>b.load-a.load).slice(0,6);
    const topExceptions=[...d.exceptions].sort((a,b)=>{const w={critical:4,high:3,medium:2,low:1};return (w[String(b.severity||'').toLowerCase()]||0)-(w[String(a.severity||'').toLowerCase()]||0)}).slice(0,5);
    return {activeStaff,activeShipments,unassigned,outstanding,critical,attention,recentActivity,workload,topExceptions,staffMap};
  }

  function injectCss(){
    if($('#gcProdCss')) return;
    const s=document.createElement('style'); s.id='gcProdCss';
    s.textContent=`
      #gcOpsBar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;margin:0 0 12px;padding:10px 12px;border:1px solid rgba(151,205,239,.14);border-radius:17px;background:linear-gradient(100deg,rgba(11,37,61,.94),rgba(4,16,29,.96));box-shadow:0 12px 30px rgba(0,0,0,.22)}
      #gcOpsBar .gc-ops-meta{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}.gc-ops-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;border:1px solid rgba(151,205,239,.13);background:rgba(255,255,255,.025);color:#a6bfd5;font:700 10px var(--mono)}.gc-ops-chip b{color:#eaf9ff}.gc-live-dot{width:7px;height:7px;border-radius:50%;background:#55e6b2;box-shadow:0 0 0 4px rgba(85,230,178,.08);animation:gcPulse 2s ease infinite}.gc-ops-actions{display:flex;gap:7px}.gc-ops-btn{min-height:36px;padding:7px 11px;border-radius:10px;border:1px solid rgba(151,205,239,.16);background:rgba(255,255,255,.035);color:#fff;font-weight:800;font-size:11px}.gc-ops-btn:hover{border-color:rgba(139,234,246,.35)}.gc-ops-btn.primary{background:linear-gradient(135deg,#a6f2f8,#15c8e4);color:#03151b;border:0}
      #gcProdOverview{margin:0 0 14px;padding:16px;border:1px solid rgba(139,234,246,.17);border-radius:19px;background:linear-gradient(145deg,rgba(13,52,83,.68),rgba(3,15,27,.88));box-shadow:0 20px 45px rgba(0,0,0,.18)}.gc-prod-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;margin-bottom:13px}.gc-prod-head h3{font-size:16px;margin:5px 0 3px}.gc-prod-head p{margin:0;color:#91abc4;font-size:11px;line-height:1.7}.gc-prod-kicker{color:#f3c76c;font:700 9px var(--mono);letter-spacing:2px}.gc-prod-refresh{color:#6f91ad;font:600 9px var(--mono)}
      .gc-prod-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.gc-prod-kpi{min-height:86px;padding:11px 12px;border:1px solid rgba(151,205,239,.1);border-radius:13px;background:rgba(255,255,255,.025)}.gc-prod-kpi span{display:block;color:#89a9c4;font-size:10px}.gc-prod-kpi strong{display:block;margin:7px 0 2px;color:#d9fbff;font:900 19px var(--mono)}.gc-prod-kpi small{color:#678ba9;font-size:8px}.gc-prod-kpi.alert strong{color:#ffc1c8}.gc-prod-kpi.warn strong{color:#f8d88c}
      .gc-prod-columns{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:10px;margin-top:10px}.gc-prod-panel{padding:12px;border:1px solid rgba(151,205,239,.1);border-radius:15px;background:rgba(0,0,0,.12)}.gc-prod-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}.gc-prod-panel-head strong{font-size:12px}.gc-prod-list{display:grid;gap:7px}.gc-prod-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 10px;border-radius:11px;background:rgba(255,255,255,.028);border:1px solid rgba(151,205,239,.07)}.gc-prod-row-main{min-width:0}.gc-prod-row-main b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gc-prod-row-main small{display:block;margin-top:2px;color:#7898b3;font-size:9px}.gc-prod-badge{white-space:nowrap;padding:4px 7px;border-radius:999px;background:rgba(139,234,246,.08);color:#a7eff7;font:800 8px var(--mono)}.gc-prod-badge.bad{background:rgba(255,113,128,.1);color:#ffc3ca}.gc-prod-badge.warn{background:rgba(243,199,108,.1);color:#f9d98e}.gc-empty{padding:18px;text-align:center;color:#7594b0;font-size:10px;border:1px dashed rgba(151,205,239,.14);border-radius:11px}
      #gcCommand{position:fixed;inset:0;z-index:1000;display:none;place-items:start center;padding:12vh 16px;background:rgba(0,0,0,.68);backdrop-filter:blur(10px)}#gcCommand.open{display:grid}.gc-command-box{width:min(680px,100%);background:#061727;border:1px solid rgba(139,234,246,.3);border-radius:18px;box-shadow:0 30px 90px rgba(0,0,0,.55);overflow:hidden}.gc-command-top{display:flex;gap:8px;padding:11px;border-bottom:1px solid rgba(151,205,239,.1)}.gc-command-top input{flex:1;min-height:42px;border:1px solid rgba(151,205,239,.15);border-radius:11px;background:#03101c;padding:10px 12px;outline:none;color:#fff}.gc-command-list{max-height:55vh;overflow:auto;padding:8px}.gc-command-item{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:right;padding:11px;border:1px solid transparent;border-radius:10px;background:transparent;color:#e6f2fb}.gc-command-item:hover{background:rgba(139,234,246,.07);border-color:rgba(139,234,246,.15)}.gc-command-item small{color:#6f90aa;font-size:9px}
      .gc-mobile-bar{display:none}
      @keyframes gcPulse{0%,100%{opacity:.9}50%{opacity:.45}}
      @media(max-width:1100px){.gc-prod-grid{grid-template-columns:repeat(3,minmax(0,1fr));.gc-prod-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.gc-prod-columns{grid-template-columns:1fr}}
      @media(max-width:650px){#gcOpsBar{grid-template-columns:1fr}.gc-prod-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gc-prod-head{align-items:flex-start;flex-direction:column}.gc-ops-actions{width:100%}.gc-ops-btn{flex:1}.gc-mobile-bar{display:flex;position:fixed;left:8px;right:8px;bottom:8px;z-index:80;padding:7px;border:1px solid rgba(151,205,239,.14);border-radius:15px;background:rgba(4,17,30,.95);backdrop-filter:blur(14px);gap:5px;box-shadow:0 18px 40px rgba(0,0,0,.35)}.gc-mobile-bar button{flex:1;min-height:40px;border:1px solid transparent;border-radius:10px;background:transparent;color:#8eacc6;font-size:9px;font-weight:800}.gc-mobile-bar button.active{background:rgba(22,199,229,.11);color:#d9fbff;border-color:rgba(22,199,229,.18)}body{padding-bottom:62px}}
      @media(max-width:380px){.gc-prod-grid{grid-template-columns:1fr}.gc-prod-kpi{min-height:78px}.gc-ops-chip:nth-child(n+3){display:none}}
    `;
    document.head.appendChild(s);
  }

  function navTo(tab){ const b=$(`#nav .nav-item[data-tab="${CSS.escape(tab)}"]`); if(b){b.click();return true} return false; }
  function ensureBar(){
    if($('#gcOpsBar')) return;
    const main=$('main'); const view=$('#view'); if(!main||!view)return;
    const bar=document.createElement('section'); bar.id='gcOpsBar';
    bar.innerHTML=`<div class="gc-ops-meta"><span class="gc-ops-chip"><span class="gc-live-dot"></span> LIVE OPERATIONS</span><span class="gc-ops-chip"><b id="gcRole">Staff</b></span><span class="gc-ops-chip" id="gcBranch">all</span><span class="gc-ops-chip" id="gcClock">—</span></div><div class="gc-ops-actions"><button type="button" class="gc-ops-btn" id="gcSearchBtn">⌘ Search</button><button type="button" class="gc-ops-btn primary" id="gcRefreshBtn">↻ Sync</button></div>`;
    main.insertBefore(bar,view);
    $('#gcSearchBtn').onclick=()=>openCommand();
    $('#gcRefreshBtn').onclick=()=>refresh(true);
    const identity=window.gcStaffIdentity||{}; $('#gcRole').textContent=identity.role||$('#staffRole')?.textContent||'staff'; $('#gcBranch').textContent=identity.branch||$('#staffBranch')?.textContent||'all';
    const tick=()=>{const d=new Date();$('#gcClock').textContent=new Intl.DateTimeFormat('ku-IQ',{dateStyle:'medium',timeStyle:'short'}).format(d)};tick();state.timer=setInterval(tick,30000);
  }
  function ensureCommand(){
    if($('#gcCommand')) return;
    const wrap=document.createElement('div'); wrap.id='gcCommand';
    const commands=[['overview','داشبۆرد','کۆنترۆڵی گشتی'],['shipments','بارەکان','Shipment control'],['alerts','Alerts','Priority exceptions'],['customers','کڕیاران','Customer directory'],['tasks','ئەرکەکان','Task board'],['quotes','نرخەکان','Quotes'],['chat','چات','Team chat'],['notifications','ئاگاداری','Notifications'],['warehouse','کۆگا','Warehouse'],['finance','دارایی','Finance'],['staff','ستاف','Staff management'],['activity','چالاکی','Audit log'],['settings','ڕێکخستنەکان','System settings']];
    wrap.innerHTML=`<div class="gc-command-box"><div class="gc-command-top"><input id="gcCommandInput" autocomplete="off" placeholder="گەڕان لە ناو بەشەکانی Staff…"><button type="button" class="icon-btn" id="gcCommandClose">×</button></div><div class="gc-command-list" id="gcCommandList"></div></div>`;
    document.body.appendChild(wrap);
    const render=(q='')=>{const needle=q.toLowerCase().trim();const items=commands.filter(([id,label,desc])=>(`${id} ${label} ${desc}`).toLowerCase().includes(needle));$('#gcCommandList').innerHTML=items.map(([id,label,desc])=>`<button class="gc-command-item" data-command="${id}" type="button"><span><b>${label}</b><small>${esc(desc)}</small></span><small>↵</small></button>`).join('')||`<div class="gc-empty">هیچ ئەنجامێک نەدۆزرایەوە.</div>`;$$('[data-command]',wrap).forEach(b=>b.onclick=()=>{navTo(b.dataset.command);closeCommand()})};
    $('#gcCommandInput').addEventListener('input',e=>render(e.target.value)); $('#gcCommandClose').onclick=closeCommand; wrap.addEventListener('click',e=>{if(e.target===wrap)closeCommand()}); render();
  }
  function openCommand(){ensureCommand();$('#gcCommand').classList.add('open');document.body.style.overflow='hidden';setTimeout(()=>$('#gcCommandInput')?.focus(),20)}
  function closeCommand(){ $('#gcCommand')?.classList.remove('open');document.body.style.overflow=''; }

  function renderSnapshot(d){
    const stats=derive(d);
    const body=$('#viewBody'); if(!body) return;
    $('#gcProdOverview')?.remove();
    const section=document.createElement('section');section.id='gcProdOverview';
    const exceptionRows=stats.topExceptions.length?stats.topExceptions.map(x=>{const sev=String(x.severity||'').toLowerCase();const cls=sev==='critical'?'bad':sev==='high'||sev==='medium'?'warn':'';return `<div class="gc-prod-row"><div class="gc-prod-row-main"><b>${esc(x.title||x.description||x.exception_type||'Exception')}</b><small>${esc(x.shipment_id||'—')} · ${esc(x.status||'open')}</small></div><span class="gc-prod-badge ${cls}">${esc((x.severity||'attention').toUpperCase())}</span></div>`}).join(''):`<div class="gc-empty">هیچ exception ـێکی پێویست بە سەرنج نییە.</div>`;
    const staffRows=stats.workload.length?stats.workload.map(x=>`<div class="gc-prod-row"><div class="gc-prod-row-main"><b>${esc(x.full_name||'Staff')}</b><small>${esc(x.branch||'all')} · ${esc(x.role||'staff')}</small></div><span class="gc-prod-badge">${fmt(x.load)} load</span></div>`).join(''):`<div class="gc-empty">داتای workload بەردەست نییە.</div>`;
    section.innerHTML=`<div class="gc-prod-head"><div><div class="gc-prod-kicker">OPERATIONS PULSE</div><h3>ئێستا چی گرنگە؟</h3><p>کورتەیەکی ڕاستەقینە لە داتای operational ـی ئێستا. ئەم لایەرە تەنها read-only ـە.</p></div><span class="gc-prod-refresh" id="gcProdRefreshAt">SYNCED ${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span></div><div class="gc-prod-grid">${[
      ['Active staff',fmt(stats.activeStaff),'کارمەندی چالاک',''],['Active shipments',fmt(stats.activeShipments),'بارەکانی لە جۆڵان',''],['Unassigned',fmt(stats.unassigned),'پێویستی بە owner','warn'],['Critical',fmt(stats.critical),'exception ـی قورس','alert'],['Attention',fmt(stats.attention),'exception ـی کراوە','warn'],['Outstanding',money(stats.outstanding),'balance ـی نەدراوە','']
    ].map(([a,b,c,k])=>`<div class="gc-prod-kpi ${k}"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`).join('')}</div><div class="gc-prod-columns"><div class="gc-prod-panel"><div class="gc-prod-panel-head"><strong>Priority queue</strong><button type="button" class="gc-ops-btn tiny" data-jump="alerts">بینینی هەموو</button></div><div class="gc-prod-list">${exceptionRows}</div></div><div class="gc-prod-panel"><div class="gc-prod-panel-head"><strong>Staff workload</strong><button type="button" class="gc-ops-btn tiny" data-jump="staff">ڕێکخستن</button></div><div class="gc-prod-list">${staffRows}</div></div></div>`;
    body.prepend(section);
    $$('[data-jump]',section).forEach(b=>b.onclick=()=>navTo(b.dataset.jump));
  }

  async function refresh(force=false){
    const btn=$('#gcRefreshBtn'); if(btn){btn.disabled=true;btn.textContent='Syncing…'}
    try{
      const d=await snapshot(force);
      const activeTab=$('#nav .nav-item.active')?.dataset.tab||'';
      if(activeTab==='overview') renderSnapshot(d);
      updateNavBadges(d);
      document.documentElement.dataset.gcStaffSynced='true';
    }catch(error){ console.warn('[GC Staff production layer]',error); }
    finally{if(btn){btn.disabled=false;btn.textContent='↻ Sync'}}
  }
  function updateNavBadges(d){
    const stats=derive(d); const counts={alerts:stats.attention,shipments:stats.activeShipments,customers:d.customers.length,staff:stats.activeStaff};
    Object.entries(counts).forEach(([id,value])=>{const b=$(`#nav .nav-item[data-tab="${id}"] [data-count]`)||$(`#nav .nav-item[data-tab="${id}"] b`); if(b)b.textContent=value?String(value):'';});
  }
  function ensureMobileBar(){
    if($('.gc-mobile-bar'))return; const m=document.createElement('div');m.className='gc-mobile-bar';m.innerHTML=`<button type="button" data-m="overview">Dashboard</button><button type="button" data-m="shipments">Shipments</button><button type="button" data-m="alerts">Alerts</button><button type="button" data-m="customers">Customers</button><button type="button" data-m="staff">Staff</button>`;document.body.appendChild(m);$$('[data-m]',m).forEach(b=>b.onclick=()=>{navTo(b.dataset.m);syncMobile()});
  }
  function syncMobile(){const active=$('#nav .nav-item.active')?.dataset.tab;$$('[data-m]').forEach(b=>b.classList.toggle('active',b.dataset.m===active))}

  function hookRendering(){
    const view=$('#view'); if(!view)return;
    const observer=new MutationObserver(()=>{ ensureBar(); ensureMobileBar(); syncMobile(); const active=$('#nav .nav-item.active')?.dataset.tab; if(active==='overview' && $('#viewBody') && !$('#gcProdOverview')) void refresh(false); });
    observer.observe(view,{childList:true,subtree:true});
    const navObserver=new MutationObserver(()=>{syncMobile()}); const nav=$('#nav');if(nav)navObserver.observe(nav,{childList:true,subtree:true});
  }
  function boot(){
    injectCss(); ensureCommand(); ensureMobileBar(); ensureBar(); hookRendering();
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand()} if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();openCommand()} if(e.key==='Escape')closeCommand()});
    let attempts=0; const wait=setInterval(()=>{attempts++;if($('#viewBody')&&$('#nav .nav-item')){clearInterval(wait);void refresh(true)}else if(attempts>60)clearInterval(wait)},150);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
