(()=>{
  'use strict';
  const STEP_LABELS=['تۆمارکراوە','لە کۆگا','لە ڕێگادایە','لە گومرکە','بۆ گەیاندن','گەیشتووە'];
  const mode=v=>({air:'ئاسمانی',land:'وشکانی',sea:'دەریایی'}[v]||v||'—');
  const fmt=v=>v?new Date(v).toLocaleString('ku-IQ',{dateStyle:'medium',timeStyle:'short'}):'—';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const riskOf=s=>{const eta=s?.eta?new Date(s.eta).getTime():null, now=Date.now(), outstanding=Math.max(num(s?.total_amount)-num(s?.paid_amount),0); if(eta&&eta<now&&num(s?.current_step_index)<5)return ['دواکەوتوو','danger']; if(outstanding>0&&eta&&eta<now+86400000)return ['مەترسی پارەدان','warn']; if(num(s?.current_step_index)===3&&eta&&eta<now+259200000)return ['مەترسی گومرک','warn']; if(s?.tracking_updated_at&&new Date(s.tracking_updated_at).getTime()<now-21600000&&num(s?.current_step_index)>=1&&num(s?.current_step_index)<=4)return ['Tracking کۆنە','warn']; return ['لە ڕێکخستندا','good'];};
  function assets(){if(!document.querySelector('link[data-gc-ti-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/tracking-intelligence.css?v=20260908-1';l.dataset.gcTiCss='1';document.head.appendChild(l)}}
  function getShipment(detail){return detail||Array.from(window.enhancedTracking?.shipments?.values?.()||[])[0]||null}
  function render(s){
    if(!s)return;
    assets();let host=document.getElementById('trackingDetailsContainer');if(!host)return;
    let card=document.getElementById('gcShipmentIntelligence');if(!card){card=document.createElement('section');card.id='gcShipmentIntelligence';card.className='gc-ti-card';host.insertAdjacentElement('afterend',card)}
    const step=Math.max(0,Math.min(5,num(s.current_step_index))), progress=Math.round(step/5*100), [risk,riskTone]=riskOf(s);
    const events=Array.isArray(s.tracking_events)?s.tracking_events:[];const lastEvent=events[0];
    const weight=s.chargeable_weight_kg??s.actual_weight_kg??s.weight_kg??0;const cartons=s.carton_count??s.items_count??0;
    card.innerHTML=`<div class="gc-ti-head"><div class="gc-ti-title"><div class="gc-ti-orb">✦</div><div><strong>زیرەکی شوێنکەوتن</strong><small>Shipment Intelligence · GC Logistics</small></div></div><span class="gc-ti-live"><i></i>LIVE</span></div><div class="gc-ti-body"><div class="gc-ti-progress-wrap"><div class="gc-ti-progress-meta"><span>${esc(STEP_LABELS[step]||'بار')}</span><strong>${progress}%</strong></div><div class="gc-ti-progress"><i style="width:${progress}%"></i></div></div><div class="gc-ti-grid"><div class="gc-ti-metric"><small>ڕێڕەو</small><strong>${esc(s.origin_key||'—')} → ${esc(s.dest_key||'—')}</strong></div><div class="gc-ti-metric"><small>جۆری گواستنەوە</small><strong>${esc(mode(s.transport_mode))}</strong></div><div class="gc-ti-metric" data-tone="${riskTone}"><small>دۆخی مەترسی</small><strong>${esc(risk)}</strong></div><div class="gc-ti-metric"><small>ETA</small><strong>${esc(fmt(s.eta))}</strong></div><div class="gc-ti-metric"><small>کێشی حسابکراو</small><strong>${esc(weight)} kg</strong></div><div class="gc-ti-metric"><small>کارتۆن / دانە</small><strong>${esc(cartons)}</strong></div><div class="gc-ti-metric"><small>دوایین شوێن</small><strong>${esc(s.current_location_label||'—')}</strong></div><div class="gc-ti-metric"><small>دوایین نوێکاری</small><strong>${esc(fmt(s.tracking_updated_at||lastEvent?.created_at))}</strong></div></div><div class="gc-ti-bottom"><div class="gc-ti-status"><span class="gc-ti-status-badge ${riskTone}">${esc(s.operational_status||s.status||'ACTIVE')}</span><span style="color:#7189a4;font-size:9px">${events.length} tracking events</span></div><div class="gc-ti-actions"><button class="gc-ti-btn primary" type="button" data-ti-share>هاوبەشکردن</button><button class="gc-ti-btn" type="button" data-ti-copy>کۆپی لینکی Tracking</button></div></div><div class="gc-ti-note">داتا لە Supabase و realtime tracking ـەوە وەردەگیرێت. هیچ داتای تایبەتی کڕیار لەم card ـەدا نیشان نادرێت.</div></div>`;
    card.querySelector('[data-ti-copy]')?.addEventListener('click',async()=>{const u=window.location.href.split('#')[0];try{await navigator.clipboard.writeText(u);window.showToast?.('لینکی شوێنکەوتن کۆپی کرا.','success')}catch{window.prompt('لینکی شوێنکەوتن کۆپی بکە:',u)}});
    card.querySelector('[data-ti-share]')?.addEventListener('click',async()=>{const u=window.location.href;try{if(navigator.share){await navigator.share({title:'Globall Cloud Tracking',text:`${s.tracking_number||s.tracking_id||s.id} · ${s.origin_key||''} → ${s.dest_key||''}`,url:u})}else{await navigator.clipboard.writeText(u);window.showToast?.('لینکی Tracking کۆپی کرا.','success')}}catch{}});
  }
  function hydrate(){const shipment=getShipment();if(shipment)render(shipment)}
  window.addEventListener('gc:tracking-intelligence',e=>render(getShipment(e.detail?.shipment)||e.detail?.shipment));
  window.addEventListener('gc:tracking-shipment',e=>render(e.detail?.shipment));
  window.addEventListener('gc:tracking-event',e=>hydrate());
  window.addEventListener('gc:tracking-realtime',e=>{if(e.detail?.status==='SUBSCRIBED')hydrate()});
  const mo=new MutationObserver(()=>{const host=document.getElementById('trackingDetailsContainer');if(host&&!document.getElementById('gcShipmentIntelligence'))hydrate()});
  mo.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrate,{once:true});else hydrate();
})();
