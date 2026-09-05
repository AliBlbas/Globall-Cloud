(() => {
  'use strict';
  const FN='https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/staff-data-health';
  const KEY='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  if(window.__gcDataHealthPanel)return;window.__gcDataHealthPanel=true;
  const token=async()=> (await window.gcSupabase?.auth?.getSession?.())?.data?.session?.access_token||null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function render(){
    const view=document.getElementById('view');if(!view||view.querySelector('[data-gc-health-card]')||!document.getElementById('pageTitle'))return;
    if(!/داشبۆرد/.test(document.getElementById('pageTitle').textContent||''))return;
    const t=await token();if(!t)return;
    try{const r=await fetch(FN,{headers:{Authorization:`Bearer ${t}`,apikey:KEY},cache:'no-store'});const d=await r.json();if(!r.ok||!d.quality)return;
      const q=d.quality;const issues=(q.missing_gc||0)+(q.missing_mode||0)+(q.missing_operational_status||0)+(q.missing_timeline||0)+(q.stale_72h||0);
      const card=document.createElement('section');card.className='card';card.setAttribute('data-gc-health-card','1');card.style.marginTop='10px';card.innerHTML=`<div class="card-head"><div><h3>System & Data Health</h3><span class="muted">پشکنینی خۆکار لە backend · ${esc(new Date(d.generated_at).toLocaleTimeString())}</span></div><span class="pill ${issues?'warn':'mint'}">${issues?`${issues} issue`:'HEALTHY'}</span></div><div class="grid-kpi"><div class="kpi"><span>Shipments</span><strong>${q.shipments}</strong></div><div class="kpi"><span>Missing GC</span><strong>${q.missing_gc}</strong></div><div class="kpi"><span>Missing Mode</span><strong>${q.missing_mode}</strong></div><div class="kpi"><span>Missing Timeline</span><strong>${q.missing_timeline}</strong></div><div class="kpi"><span>Stale &gt;72h</span><strong>${q.stale_72h}</strong></div><div class="kpi"><span>Open Tasks</span><strong>${q.tasks_open}</strong></div></div>`;
      view.appendChild(card);
    }catch(_){ }
  }
  const obs=new MutationObserver(()=>{if(document.getElementById('view'))void render()});obs.observe(document.body,{childList:true,subtree:true});
  setInterval(()=>void render(),15000);setTimeout(()=>void render(),1200);
})();
