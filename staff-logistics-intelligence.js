(()=>{
  'use strict';
  const CONTROL='https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/logistics-control-tower';
  const OPS='https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/operations-v4';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate=v=>v?new Date(v).toLocaleString('ku-IQ',{dateStyle:'medium',timeStyle:'short'}):'—';
  const fmtMode=v=>({air:'ئاسمانی',land:'وشکانی',sea:'دەریایی'}[v]||v||'—');
  const fmtRisk=v=>({ETA_OVERDUE:'دواخستنەوەی ETA',PAYMENT_RISK:'مەترسی پارەدان',CUSTOMS_RISK:'مەترسی گومرک',STALE_TRACKING:'Tracking کۆنە',WATCH:'چاودێری'}[v]||v||'—');
  const fmtStatus=v=>({received_origin:'لە سەرچاوە وەرگیراوە',in_transit:'لە ڕێگایە',at_transit_hub:'لە ناوەندی ترانزیت',customs:'گومرک',out_for_delivery:'بۆ گەیاندن',delivered:'گەیشتووە',on_hold:'وەستێنراوە',cancelled:'هەڵوەشێنراوە'}[v]||v||'—');
  let timer=null;
  let lastData=null;

  function addAssets(){
    if(!document.querySelector('link[data-gc-intel-css]')){
      const l=document.createElement('link');l.rel='stylesheet';l.href='/staff-logistics-intelligence.css?v=20260908-1';l.dataset.gcIntelCss='1';document.head.appendChild(l);
    }
  }
  async function session(){
    const sb=window.sb||window.gcSupabase;
    if(!sb?.auth) throw new Error('Supabase session unavailable');
    const {data,error}=await sb.auth.getSession();
    if(error||!data?.session?.access_token) throw new Error('Session ـی Staff نییە');
    return data.session;
  }
  async function callControl(method='GET',body=null){
    const s=await session();
    const r=await fetch(CONTROL,{method,headers:{Authorization:`Bearer ${s.access_token}`,apikey:'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda','Content-Type':'application/json','Accept':'application/json','Cache-Control':'no-cache'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
    const p=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(p.error||`HTTP ${r.status}`);
    return p;
  }
  async function callOps(path){
    const s=await session();
    const r=await fetch(`${OPS}${path}`,{headers:{Authorization:`Bearer ${s.access_token}`,apikey:'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda',Accept:'application/json','Cache-Control':'no-cache'},cache:'no-store'});
    const p=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(p.error||`HTTP ${r.status}`);
    return p;
  }
  function launcher(){
    if(document.getElementById('gcIntelLaunch')) return;
    const host=document.querySelector('.top-actions');
    if(!host) return;
    const b=document.createElement('button');
    b.id='gcIntelLaunch';b.className='gc-intel-launcher';b.type='button';b.innerHTML='<b>OPS</b><span>کۆنسۆڵی زیرەکی عملیات</span> ✦';
    b.addEventListener('click',openDrawer);host.insertBefore(b,host.firstChild);
  }
  function drawer(){
    if(document.getElementById('gcIntelBackdrop')) return;
    const wrap=document.createElement('div');
    wrap.id='gcIntelBackdrop';wrap.className='gc-intel-backdrop';
    wrap.innerHTML=`<section class="gc-intel-drawer" aria-label="کۆنسۆڵی زیرەکی لۆجستیک">
      <header class="gc-intel-head"><div class="gc-intel-title"><div class="gc-intel-orb">✦</div><div><strong>Logistics Intelligence</strong><small>Control Tower · ETA · Risk · Exceptions · Live Operations</small></div></div><div class="gc-intel-actions"><button class="gc-intel-btn primary" id="gcIntelRefresh">↻ نوێ</button><button class="gc-intel-btn" id="gcIntelClose">×</button></div></header>
      <div class="gc-intel-body" id="gcIntelBody"><div class="gc-intel-spinner"></div></div>
      <footer class="gc-intel-foot"><span class="gc-intel-pulse"><i></i> Production data · authorized staff only</span><span id="gcIntelUpdated">—</span></footer>
    </section>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click',e=>{if(e.target===wrap)closeDrawer()});
    document.getElementById('gcIntelClose').onclick=closeDrawer;
    document.getElementById('gcIntelRefresh').onclick=()=>load(true);
  }
  function openDrawer(){addAssets();drawer();document.getElementById('gcIntelBackdrop').classList.add('open');load(true);if(timer)clearInterval(timer);timer=setInterval(()=>load(false),45000)}
  function closeDrawer(){document.getElementById('gcIntelBackdrop')?.classList.remove('open');if(timer){clearInterval(timer);timer=null}}
  function kpi(title,value,note,tone=''){
    return `<article class="gc-intel-kpi" data-tone="${tone}"><span>${esc(title)}</span><strong>${esc(value)}</strong><em>${esc(note)}</em></article>`;
  }
  function shipmentRow(s){
    return `<div class="gc-intel-row" data-level="${esc(s.risk_level)}"><i class="gc-intel-sev" aria-hidden="true"></i><div class="gc-intel-row-title"><strong>${esc(s.tracking_number||s.id)}</strong><small>${esc(s.customer_name||'کڕیار')} · ${esc(s.origin_key||'—')} → ${esc(s.dest_key||'—')}</small><div class="gc-intel-row-meta"><span class="gc-intel-chip">${esc(fmtRisk(s.risk_code))}</span><span class="gc-intel-chip">${esc(fmtMode(s.transport_mode))}</span><span class="gc-intel-chip">ETA: ${esc(fmtDate(s.eta))}</span></div></div><div class="gc-intel-row-actions"><button data-view-shipment="${esc(s.id)}">360°</button></div></div>`;
  }
  function exceptionRow(e){
    const level=String(e.severity||'medium');
    return `<div class="gc-intel-row" data-level="${esc(level)}"><i class="gc-intel-sev" aria-hidden="true"></i><div class="gc-intel-row-title"><strong>${esc(e.title||'Exception')}</strong><small>${esc(e.tracking_number||e.shipment_id||'Global exception')} · ${esc(e.customer_name||'')}</small><div class="gc-intel-row-meta"><span class="gc-intel-chip">${esc(level.toUpperCase())}</span><span class="gc-intel-chip">${esc(e.location||'')}</span><span class="gc-intel-chip">${esc(e.due_at?`Due ${fmtDate(e.due_at)}`:'بێ deadline')}</span></div></div><div class="gc-intel-row-actions"><button data-exception="${esc(e.id)}" data-status="acknowledged">وەرگرتن</button><button class="resolve" data-exception="${esc(e.id)}" data-status="resolved">چارەسەر</button></div></div>`;
  }
  function render(data){
    lastData=data;const k=data.kpis||{};const risks=data.risk_shipments||[];const ex=data.exceptions||[];
    const body=document.getElementById('gcIntelBody');if(!body)return;
    body.innerHTML=`<div class="gc-intel-kpis">
      ${kpi('ACTIVE',k.active||0,'بارە چالاکەکان','good')}
      ${kpi('OVERDUE',k.overdue||0,'دواکەوتنی ETA',k.overdue?'critical':'good')}
      ${kpi('PAYMENT',k.payment_risk||0,'مەترسی پارەدان',k.payment_risk?'warning':'good')}
      ${kpi('CUSTOMS',k.customs_risk||0,'مەترسی گومرک',k.customs_risk?'warning':'good')}
      ${kpi('STALE',k.stale_tracking||0,'Tracking کۆنە',k.stale_tracking?'warning':'good')}
    </div>
    <div class="gc-intel-grid">
      <section class="gc-intel-card"><div class="gc-intel-card-head"><strong>ڕیزبەندی مەترسییەکان</strong><small>${risks.length} بار</small></div><div class="gc-intel-list">${risks.length?risks.map(shipmentRow).join(''):`<div class="gc-intel-empty">هیچ مەترسییەکی بەرز نەدۆزرایەوە ✓</div>`}</div></section>
      <section class="gc-intel-card"><div class="gc-intel-card-head"><strong>دۆخی سیستەم</strong><small>${esc(data.staff?.branch||'all')}</small></div><div class="gc-intel-summary">
        <div class="gc-intel-summary-item"><span>Open exceptions</span><strong>${esc(k.open_exceptions||0)}</strong></div>
        <div class="gc-intel-summary-item"><span>Unverified documents</span><strong>${esc(k.unverified_documents||0)}</strong></div>
        <div class="gc-intel-summary-item"><span>Notification queue</span><strong>${esc(k.notification_queue||0)}</strong></div>
        <div class="gc-intel-summary-item"><span>In transit</span><strong>${esc(k.in_transit||0)}</strong></div>
        <div class="gc-intel-summary-item"><span>Staff scope</span><strong>${esc(data.staff?.role||'—')}</strong></div>
      </div></section>
    </div>
    <section class="gc-intel-card" style="margin-top:12px"><div class="gc-intel-card-head"><strong>Exception Queue · Priority First</strong><small>${ex.length} open / acknowledged</small></div><div class="gc-intel-list">${ex.length?ex.map(exceptionRow).join(''):`<div class="gc-intel-empty">هیچ exception ـێکی کراوە نییە ✓</div>`}</div></section>`;
    document.getElementById('gcIntelUpdated').textContent=`نوێکراوەتەوە: ${fmtDate(data.generated_at)}`;
    body.querySelectorAll('[data-view-shipment]').forEach(b=>b.addEventListener('click',()=>viewShipment(b.dataset.viewShipment)));
    body.querySelectorAll('[data-exception]').forEach(b=>b.addEventListener('click',()=>updateException(b.dataset.exception,b.dataset.status)));
  }
  async function load(showBusy=true){
    const body=document.getElementById('gcIntelBody');if(!body)return;
    if(showBusy)body.innerHTML='<div class="gc-intel-spinner"></div>';
    try{const data=await callControl();render(data)}catch(e){body.innerHTML=`<div class="gc-intel-empty">نەتوانرا داتاکان بخوێنرێنەوە.<br><small>${esc(e.message||e)}</small></div>`}
  }
  async function updateException(id,status){
    const note=status==='resolved'?'چارەسەرکرا لە Control Tower':'وەرگیرا بۆ پشکنین';
    try{await callControl('POST',{action:'exception_update',data:{id,status,resolution_note:note}});await load(true)}catch(e){alert(e.message||'هەڵە')} 
  }
  function modal(){
    if(document.getElementById('gcIntelShipmentModal'))return;
    const m=document.createElement('div');m.id='gcIntelShipmentModal';m.className='gc-intel-modal';m.innerHTML='<section class="gc-intel-modal-card" id="gcIntelShipmentCard"></section>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});
  }
  async function viewShipment(id){
    modal();const m=document.getElementById('gcIntelShipmentModal'),card=document.getElementById('gcIntelShipmentCard');m.classList.add('open');card.innerHTML='<div class="gc-intel-spinner"></div>';
    try{
      const data=await callOps(`?kind=shipment&id=${encodeURIComponent(id)}`),s=data.shipment||{},ev=Array.isArray(data.events)?data.events:[],pk=Array.isArray(data.packages)?data.packages:[],rc=Array.isArray(data.receipts)?data.receipts:[];
      card.innerHTML=`<div class="gc-intel-card-head" style="padding:0 0 12px"><div><strong>${esc(s.tracking_number||s.tracking_id||s.id)}</strong><small style="display:block">Shipment 360° · ${esc(s.customer_name||'—')}</small></div><button class="gc-intel-btn" id="gcIntelShipmentClose">×</button></div>
        <div class="gc-intel-detail-grid"><div class="gc-intel-detail-item"><small>ڕێڕەو</small><strong>${esc(s.origin_key||'—')} → ${esc(s.dest_key||'—')}</strong></div><div class="gc-intel-detail-item"><small>جۆر</small><strong>${esc(fmtMode(s.transport_mode))}</strong></div><div class="gc-intel-detail-item"><small>دۆخ</small><strong>${esc(fmtStatus(s.operational_status||s.status))}</strong></div><div class="gc-intel-detail-item"><small>ETA</small><strong>${esc(fmtDate(s.eta))}</strong></div><div class="gc-intel-detail-item"><small>شوێنی ئێستا</small><strong>${esc(s.current_location_label||'—')}</strong></div><div class="gc-intel-detail-item"><small>کارتۆن</small><strong>${esc(s.carton_count??s.items_count??0)}</strong></div><div class="gc-intel-detail-item"><small>کێش</small><strong>${esc(s.chargeable_weight_kg??s.actual_weight_kg??s.weight_kg??0)} kg</strong></div><div class="gc-intel-detail-item"><small>Package</small><strong>${esc(pk.length)}</strong></div></div>
        <div class="gc-intel-card-head" style="margin-top:14px;padding-inline:0"><strong>Tracking Timeline</strong><small>${ev.length} events</small></div><div class="gc-intel-timeline">${ev.slice(0,18).map(e=>`<div class="gc-intel-event"><i></i><div><strong>${esc(e.title||e.event_type||e.status||'Update')}</strong><small>${esc(e.location||'')} · ${esc(fmtDate(e.occurred_at||e.created_at))}</small></div></div>`).join('')||'<div class="gc-intel-empty">هیچ event ـێک نییە.</div>'}</div>
        <div class="gc-intel-row-meta" style="margin-top:14px"><span class="gc-intel-chip">Warehouse receipts: ${rc.length}</span><span class="gc-intel-chip">Packages: ${pk.length}</span></div>`;
      document.getElementById('gcIntelShipmentClose').onclick=()=>m.classList.remove('open');
    }catch(e){card.innerHTML=`<div class="gc-intel-empty">Shipment 360° نەکرایەوە.<br><small>${esc(e.message||e)}</small></div>`}
  }
  function boot(){addAssets();launcher();drawer()}
  const observer=new MutationObserver(()=>boot());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
