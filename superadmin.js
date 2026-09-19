(() => {
  'use strict';

  const BOOT_TIMEOUT = 10000;
  const state = { client:null, user:null, me:null, tabs:[], data:{} };
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const fmt = (v) => new Intl.NumberFormat('en-US').format(Number(v || 0));
  const money = (v) => `$${Number(v || 0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const dt = (v) => v ? new Date(v).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'}) : '—';

  function show(el,on=true){ if(el) el.classList.toggle('hidden', !on); }
  function setText(id, value){ const el=$(id); if(el) el.textContent=value; }

  async function getClient(){
    if(window.gcEnsureSupabase) return window.gcEnsureSupabase();
    if(window.gcSupabase) return window.gcSupabase;
    await new Promise((resolve,reject)=>{ const start=Date.now(); const timer=setInterval(()=>{ if(window.gcSupabase){clearInterval(timer);resolve();} else if(Date.now()-start>BOOT_TIMEOUT){clearInterval(timer);reject(new Error('Supabase client timeout'));}},100); });
    return window.gcSupabase;
  }

  async function requireAdmin(){
    state.client = await getClient();
    const {data:sessionData} = await state.client.auth.getSession();
    state.user = sessionData?.session?.user || null;
    if(!state.user){ show($('boot'),false); show($('app'),false); show($('loginGate'),true); return false; }
    const {data:me,error} = await state.client.from('staff').select('id,full_name,role,branch,is_active,updated_at').eq('id',state.user.id).maybeSingle();
    if(error || !me || !me.is_active || !['admin','super_admin'].includes(me.role)){
      console.warn('[Global Cloud] admin gate', error || 'role denied');
      show($('boot'),false); show($('app'),false); show($('loginGate'),true); return false;
    }
    state.me=me;
    return true;
  }

  async function q(table, fields='*', options={}){
    let query=state.client.from(table).select(fields);
    if(options.order) query=query.order(options.order,{ascending:options.ascending ?? false});
    if(options.limit) query=query.limit(options.limit);
    if(options.countOnly){
      const {count,error}=await state.client.from(table).select('id',{count:'exact',head:true});
      return {count:count||0,error};
    }
    return query;
  }

  async function loadOverview(){
    const [ship,customers,staff,receipts,exceptions,logs,rate] = await Promise.all([
      q('shipments','id,customer_name,origin_key,dest_key,eta,total_amount,paid_amount,current_step_index,tracking_updated_at,created_at',{order:'created_at',limit:200}),
      q('customer_directory','id,code,name,phone,city,manager_staff_id,is_active,updated_at',{order:'updated_at',limit:250}),
      q('staff','id,full_name,role,branch,is_active,updated_at',{order:'updated_at',limit:100}),
      q('warehouse_receipts','id,batch_code,location,directory_phone,received_at,created_by_name,consolidated',{order:'received_at',limit:100}),
      q('logistics_exceptions','id,shipment_id,severity,title,note,status,due_at,created_at,assigned_to',{order:'created_at',limit:100}),
      q('staff_activity_log','id,staff_id,staff_name,action,target_id,details,created_at',{order:'created_at',limit:20}),
      state.client.from('app_settings').select('key,value').eq('key','usd_iqd_rate').maybeSingle()
    ]);
    state.data={shipments:ship.data||[],customers:customers.data||[],staff:staff.data||[],receipts:receipts.data||[],exceptions:exceptions.data||[],logs:logs.data||[],rate:rate.data?.value||null};
    const open=state.data.exceptions.filter(x=>['open','acknowledged'].includes(x.status));
    const balance=state.data.shipments.reduce((s,x)=>s+Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0)),0);
    setText('kShipments',fmt(state.data.shipments.length)); setText('kCustomers',fmt(state.data.customers.length)); setText('kStaff',fmt(state.data.staff.filter(x=>x.is_active).length)); setText('kReceipts',fmt(state.data.receipts.length)); setText('kExceptions',fmt(open.length)); setText('signalExceptions',fmt(open.length)); setText('kBalance',money(balance));
    setText('meName',state.me.full_name||state.user.email||'Staff'); setText('meRole',`${state.me.role} · ${state.me.branch}`); setText('avatar',(state.me.full_name||'GC').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase());
    renderActivity(); renderAttention(open); renderStaff(); renderOps(); renderExceptions(open); renderCustomers(); renderWarehouse(); renderAudit();
    if(rate.data?.value != null) $('usdRate').value=rate.data.value;
  }

  function renderActivity(){ const el=$('recentActivity'); if(!state.data.logs.length){el.innerHTML='<div class="activity-item"><strong>هیچ چالاکییەکی نوێ نییە</strong></div>';return;} el.innerHTML=state.data.logs.slice(0,7).map(x=>`<div class="activity-item"><strong>${esc(x.action||'Activity')}</strong><small>${esc(x.staff_name||'Staff')} · ${dt(x.created_at)}${x.target_id?` · ${esc(x.target_id)}`:''}</small></div>`).join(''); }
  function renderAttention(rows){ const el=$('attention'); if(!rows.length){el.innerHTML='<div class="attention-item"><strong class="ok">سیستەم پاکە — هیچ exception ـێکی کراوە نییە.</strong></div>';return;} el.innerHTML=rows.slice(0,6).map(x=>`<div class="attention-item"><strong>${esc(x.title)}</strong><small>${esc(x.shipment_id||'')} · ${esc(x.severity)} · ${dt(x.created_at)}</small></div>`).join(''); }
  function renderStaff(){ const term=($('staffSearch')?.value||'').trim().toLowerCase(), branch=$('staffBranchFilter')?.value||'all'; const rows=state.data.staff.filter(x=>(branch==='all'||x.branch===branch)&&(!term||`${x.full_name} ${x.role} ${x.branch}`.toLowerCase().includes(term))); $('staffRows').innerHTML=rows.map(x=>`<tr><td><b>${esc(x.full_name||'—')}</b></td><td><span class="badge">${esc(x.role)}</span></td><td>${esc(x.branch||'—')}</td><td><span class="status ${x.is_active?'ok':'off'}">${x.is_active?'ACTIVE':'INACTIVE'}</span></td><td>${dt(x.updated_at)}</td></tr>`).join('')||'<tr><td colspan="5">هیچ ئەنجامێک نییە.</td></tr>'; }
  function renderOps(){ const mode=$('opsFilter')?.value||'all'; let rows=[...state.data.shipments]; if(mode==='unpaid') rows=rows.filter(x=>Number(x.total_amount||0)>Number(x.paid_amount||0)); if(mode==='late') rows=rows.filter(x=>x.eta&&new Date(x.eta)<new Date()); $('opsRows').innerHTML=rows.slice(0,100).map(x=>{const due=Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0)); return `<tr><td class="mono">${esc(x.id)}</td><td>${esc(x.customer_name||'—')}</td><td>${esc(x.origin_key||'—')} → ${esc(x.dest_key||'—')}</td><td>${x.eta?dt(x.eta):'—'}</td><td>${money(due)}</td><td><span class="status ${due>0?'warn':'ok'}">${due>0?'DUE':'PAID'}</span></td></tr>`}).join('')||'<tr><td colspan="6">هیچ shipment ـێک نییە.</td></tr>'; }
  function renderExceptions(rows){ $('exceptionCards').innerHTML=rows.length?rows.slice(0,100).map(x=>`<article class="exception-card"><div class="sev">${esc(x.severity)} · ${esc(x.status)}</div><h3>${esc(x.title)}</h3><p>${esc(x.note||'No note')}</p><div class="exception-meta"><span>${esc(x.shipment_id||'—')}</span><span>${dt(x.due_at||x.created_at)}</span></div></article>`).join(''):'<div class="card"><strong class="ok">هیچ exception ـێکی کراوە نییە.</strong></div>'; }
  function renderCustomers(){ const term=($('customerSearch')?.value||'').trim().toLowerCase(); const rows=state.data.customers.filter(x=>!term||`${x.name} ${x.code} ${x.phone} ${x.city}`.toLowerCase().includes(term)); const managers=new Map(state.data.staff.map(x=>[x.id,x.full_name])); $('customerRows').innerHTML=rows.slice(0,150).map(x=>`<tr><td class="mono">${esc(x.code||'—')}</td><td>${esc(x.name||'—')}</td><td>${esc(x.phone||'—')}</td><td>${esc(x.city||'—')}</td><td>${esc(managers.get(x.manager_staff_id)||'—')}</td><td><span class="status ${x.is_active?'ok':'off'}">${x.is_active?'ACTIVE':'INACTIVE'}</span></td></tr>`).join('')||'<tr><td colspan="6">هیچ کڕیارێک نییە.</td></tr>'; }
  function renderWarehouse(){ $('warehouseRows').innerHTML=state.data.receipts.slice(0,100).map(x=>`<tr><td class="mono">${esc(x.batch_code||'—')}</td><td>${esc(x.location||'—')}</td><td>${esc(x.directory_phone||'—')}</td><td>${dt(x.received_at)}</td><td>${esc(x.created_by_name||'—')}</td><td><span class="status ${x.consolidated?'ok':'warn'}">${x.consolidated?'YES':'PENDING'}</span></td></tr>`).join('')||'<tr><td colspan="6">هیچ receipt ـێک نییە.</td></tr>'; }
  function renderAudit(){ $('auditRows').innerHTML=state.data.logs.map(x=>`<tr><td>${dt(x.created_at)}</td><td>${esc(x.staff_name||'—')}</td><td>${esc(x.action||'—')}</td><td class="mono">${esc(x.target_id||'—')}</td><td>${esc(x.details||'—')}</td></tr>`).join('')||'<tr><td colspan="5">هیچ audit record ـێک نییە.</td></tr>'; }

  function setupNav(){
    document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>openTab(btn.dataset.tab)));
    document.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>openTab(btn.dataset.jump)));
  }
  function openTab(id){
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));
    document.querySelectorAll('.tab-panel').forEach(x=>x.classList.toggle('active',x.id===id));
    const labels={overview:['Overview','وێنەی گشتی لە دۆخی سیستەم و عملیات.'],staff:['Staff & Roles','دەستڕاگەیشتن، role و branch.'],operations:['Operations','بار، پارە و ETA.'],exceptions:['Exception Center','کێشە و مەترسییەکان.'],customers:['Customers','Customer intelligence.'],warehouse:['Warehouse','Batch و receipt management.'],audit:['Audit Trail','چالاکییە تۆمارکراوەکان.'],settings:['System Settings','Business configuration و security posture.']};
    setText('pageTitle',labels[id]?.[0]||id); setText('pageSub',labels[id]?.[1]||''); window.scrollTo({top:0,behavior:'smooth'});
  }

  async function saveRate(){
    const value=Number($('usdRate').value); const msg=$('settingsMsg'); if(!Number.isFinite(value)||value<=0){msg.textContent='نرخی دروست داخڵ بکە.';return;}
    msg.textContent='لە پاشەکەوتکردندایە…';
    const {error}=await state.client.from('app_settings').upsert({key:'usd_iqd_rate',value,updated_by:state.user.id,updated_at:new Date().toISOString()});
    if(error){msg.textContent=`هەڵە: ${error.message}`;return;}
    await state.client.from('staff_activity_log').insert({staff_id:state.user.id,staff_name:state.me.full_name,action:'update_setting',target_id:'usd_iqd_rate',details:`Updated USD/IQD rate to ${value}`});
    msg.textContent='پاشەکەوت کرا ✅';
  }

  async function logout(){ await state.client.auth.signOut(); location.href='./staff-os.html'; }

  async function boot(){
    try{
      const ok=await requireAdmin();
      show($('boot'),false);
      if(!ok) return;
      setupNav(); await loadOverview();
      $('refresh').addEventListener('click',async()=>{ $('refresh').textContent='…'; await loadOverview(); $('refresh').textContent='نوێکردنەوە'; });
      $('logout').addEventListener('click',logout); $('saveRate').addEventListener('click',saveRate);
      $('staffSearch').addEventListener('input',renderStaff); $('staffBranchFilter').addEventListener('change',renderStaff); $('opsFilter').addEventListener('change',renderOps); $('customerSearch').addEventListener('input',renderCustomers);
      show($('app'),true);
    }catch(error){ console.error('[GC Super Admin]',error); show($('boot'),false); show($('loginGate'),true); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else void boot();
})();
