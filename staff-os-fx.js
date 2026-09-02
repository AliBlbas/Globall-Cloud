(() => {
  'use strict';
  if (!/^\/staff(?:-os)?(?:\.html)?\/?$/.test(location.pathname)) return;
  const URL='https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/operations-v4';
  const KEY='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const dt=v=>v?new Intl.DateTimeFormat('ku-IQ',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'—';
  const getSession=async()=>{const s=window.gcSupabase?.auth?await window.gcSupabase.auth.getSession():null;return s?.data?.session||null};
  const post=async(data)=>{const s=await getSession();if(!s)throw Error('Session required');const r=await fetch(URL,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(data)});const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={error:t}}if(!r.ok)throw Error(d?.error||`HTTP ${r.status}`);return d};
  function addFxButton(){if(!$('#gcx2-rtop')||$('#gcx2-fx-edit'))return;const b=document.createElement('button');b.id='gcx2-fx-edit';b.className='btn';b.textContent='گۆڕینی نرخی USD → IQD';b.style.marginTop='9px';b.onclick=()=>editFx();$('#gcx2-rtop').appendChild(b)}
  function editFx(){
    document.getElementById('gcx2-fx-modal')?.remove();
    const m=document.createElement('div');m.id='gcx2-fx-modal';m.style.cssText='position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,.76);display:grid;place-items:center;padding:14px';
    m.innerHTML=`<div style="width:min(520px,100%);background:#071727;border:1px solid rgba(139,234,246,.2);border-radius:20px;padding:18px"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">نرخی دۆلار بەرامبەر دینار</h2><button class="btn tiny" id="gcx2-fx-close">داخستن</button></div><p style="color:#9db6d3;font-size:11px;line-height:1.7">نرخەکە بۆ quote/pricing engine بەکاردێت. گۆڕینی خودکار بە نرخی بازاڕ پێویستی بە API/provider ـی پشتیوانی کراوە هەیە؛ ئەم شتە تا credentials بەردەست نەبن لە manual mode ـە.</p><form id="gcx2-fx-form"><label style="display:block;color:#9db6d3;font-size:11px;font-weight:800">1 USD = <input id="gcx2-fx-value" type="number" min="1" step="0.01" style="display:block;width:100%;margin-top:6px;padding:11px;border-radius:10px;border:1px solid #214d75;background:#04111f;color:#fff" required></label></form><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn primary" id="gcx2-fx-save">پاشەکەوت</button></div></div>`;
    document.body.appendChild(m);$('#gcx2-fx-close').onclick=()=>m.remove();loadCurrentFx();$('#gcx2-fx-save').onclick=async e=>{e.preventDefault();const v=Number($('#gcx2-fx-value').value);if(!Number.isFinite(v)||v<=0)return;try{await post({action:'fx_update',data:{usd_to_iqd:v}});m.remove();location.reload()}catch(err){alert(err.message)}};
  }
  async function loadCurrentFx(){try{const r=await fetch(`${URL}?kind=pricing`,{headers:{apikey:KEY,Authorization:`Bearer ${(await getSession())?.access_token||''}`},cache:'no-store'});const d=await r.json();const fx=d.exchange_rates?.[0]?.usd_to_iqd;if(fx)$('#gcx2-fx-value').value=fx}catch{}}
  const watch=new MutationObserver(()=>{if($('.nav-item.active')?.dataset.tab==='quotes')addFxButton()});watch.observe(document.documentElement,{subtree:true,childList:true,attributes:true});window.addEventListener('gc:staff-auth-ready',()=>setTimeout(addFxButton,400));setTimeout(addFxButton,1500);
})();
