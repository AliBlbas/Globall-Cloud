(() => {
  'use strict';
  if (window.__gcStaffWorkflowChain) return;
  window.__gcStaffWorkflowChain = true;

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const labels = {
    shipment_created: 'دروستکردنی بار',
    shipment_status: 'گۆڕینی دۆخی بار',
    warehouse_movement: 'جوڵەی کۆگا',
    invoice: 'فاکتۆر',
    finance_ledger: 'تۆماری دارایی',
    staff_task: 'ئەرکی ستاف',
    staff_task_update: 'نوێکردنەوەی ئەرک',
  };
  const sourceLabels = {
    shipments:'بارەکان', shipment_status_history:'مێژووی دۆخ', shipment_events:'ڕووداوەکان',
    warehouse_movements:'جوڵەکانی کۆگا', shipment_invoices:'فاکتۆر', shipment_financial_ledger:'دارایی', staff_tasks:'ئەرک'
  };

  const wait = async () => {
    const start = Date.now();
    while (!window.gcSupabase && Date.now() - start < 15000) await new Promise(r => setTimeout(r, 100));
    if (!window.gcSupabase) throw new Error('پەیوەندی Supabase بەردەست نییە');
    return window.gcSupabase;
  };

  const style = () => {
    if (document.getElementById('gcWorkflowChainStyle')) return;
    const s = document.createElement('style'); s.id = 'gcWorkflowChainStyle';
    s.textContent = `
      .gc-chain-modal{position:fixed;inset:0;z-index:100000;display:none;place-items:center;background:rgba(2,8,18,.78);backdrop-filter:blur(10px);padding:16px}
      .gc-chain-modal.open{display:grid}
      .gc-chain-card{width:min(920px,100%);max-height:90vh;overflow:auto;background:#07182c;border:1px solid rgba(77,215,239,.24);border-radius:22px;box-shadow:0 35px 120px rgba(0,0,0,.55);padding:18px;direction:rtl;color:#eaf7ff}
      .gc-chain-head{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:14px}
      .gc-chain-title{font-weight:900;font-size:18px}.gc-chain-sub{color:#87a8c2;font-size:11px;margin-top:3px}
      .gc-chain-search{display:flex;gap:8px;margin-bottom:14px}.gc-chain-search input{flex:1;min-width:0;background:#091f37;border:1px solid #214664;border-radius:12px;padding:12px;color:#fff;direction:ltr;font-family:monospace}
      .gc-chain-search button,.gc-chain-close{border:1px solid #2a5875;background:#0b2138;color:#dff8ff;border-radius:12px;padding:10px 14px;cursor:pointer;font-weight:800}
      .gc-chain-search button.primary{background:#20c8e7;color:#03202a;border-color:#20c8e7}
      .gc-chain-meta{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px}.gc-chain-pill{border:1px solid #214664;border-radius:999px;padding:6px 9px;color:#9fc0d5;font-size:10px}
      .gc-chain{position:relative;padding:4px 0}.gc-chain:before{content:'';position:absolute;right:16px;top:10px;bottom:10px;width:2px;background:linear-gradient(#24c7e5,#344f68,#8c7cf4);opacity:.55}
      .gc-chain-item{position:relative;padding:0 48px 16px 0}.gc-chain-dot{position:absolute;right:9px;top:5px;width:16px;height:16px;border-radius:50%;background:#22c8e6;border:3px solid #07182c;box-shadow:0 0 0 1px rgba(34,200,230,.5)}
      .gc-chain-box{background:#091f37;border:1px solid #173d59;border-radius:15px;padding:11px}.gc-chain-row{display:flex;justify-content:space-between;gap:10px;align-items:center}.gc-chain-event{font-weight:900}.gc-chain-source{font-size:9px;color:#6f93ad}.gc-chain-time{font-size:9px;color:#89a9c0;white-space:nowrap}.gc-chain-detail{margin-top:6px;color:#a9c4d6;font-size:10px;line-height:1.7;word-break:break-word}
      .gc-chain-empty{padding:28px;text-align:center;border:1px dashed #31536b;border-radius:16px;color:#8aa8bb}.gc-chain-error{color:#ffd5da;background:#35141a;border:1px solid #6b2733;padding:10px;border-radius:12px;font-size:10px}
      .gc-chain-top-btn{white-space:nowrap}
      @media(max-width:600px){.gc-chain-modal{padding:8px}.gc-chain-card{padding:12px;border-radius:18px}.gc-chain-search{flex-direction:column}.gc-chain-search button{width:100%}.gc-chain-row{align-items:flex-start;flex-direction:column}.gc-chain-time{white-space:normal}}
    `;
    document.head.appendChild(s);
  };

  const modal = () => {
    if (document.getElementById('gcWorkflowChainModal')) return document.getElementById('gcWorkflowChainModal');
    const m = document.createElement('div'); m.id='gcWorkflowChainModal'; m.className='gc-chain-modal';
    m.innerHTML=`<section class="gc-chain-card" role="dialog" aria-modal="true" aria-labelledby="gcChainTitle">
      <div class="gc-chain-head"><div><div class="gc-chain-title" id="gcChainTitle">زنجیرەی تەواوی بار</div><div class="gc-chain-sub">بار → کۆگا → عملیات → فاکتۆر/دارایی → ئەرک و بەڵگەی audit</div></div><button class="gc-chain-close" id="gcChainClose">داخستن</button></div>
      <form class="gc-chain-search" id="gcChainForm"><input id="gcChainInput" placeholder="Tracking ID بنووسە" autocomplete="off" required><button class="primary" type="submit">پشکنین</button></form>
      <div id="gcChainResult"><div class="gc-chain-empty">Tracking ID ـەکە بنووسە بۆ بینینی زنجیرەی production.</div></div>
    </section>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if(e.target===m) m.classList.remove('open'); });
    document.getElementById('gcChainClose').onclick=()=>m.classList.remove('open');
    document.getElementById('gcChainForm').onsubmit=load;
    return m;
  };

  const fmtDate = v => v ? new Date(v).toLocaleString('ku-IQ',{dateStyle:'medium',timeStyle:'short'}) : '—';
  const summarize = (p) => {
    if (!p || typeof p !== 'object') return '';
    const pairs = [];
    for (const [k,v] of Object.entries(p)) {
      if (v == null || v === '') continue;
      if (typeof v === 'object') continue;
      pairs.push(`${esc(k)}: ${esc(v)}`);
      if (pairs.length >= 5) break;
    }
    return pairs.join(' · ');
  };

  async function load(e) {
    e.preventDefault();
    const input=document.getElementById('gcChainInput'), result=document.getElementById('gcChainResult');
    const key=input.value.trim(); if(!key) return;
    result.innerHTML='<div class="gc-chain-empty">زنجیرەکە لە Supabase ـەوە دەهێنرێت…</div>';
    try {
      const sb=await wait();
      const {data:shipment,error:se}=await sb.from('shipments').select('id,tracking_id,route,type,status,directory_customer_id,created_at').eq('tracking_id',key).maybeSingle();
      if(se) throw se;
      if(!shipment) { result.innerHTML='<div class="gc-chain-empty">هیچ بارێک بەو Tracking ID ـە نەدۆزرایەوە.</div>'; return; }
      const {data:chain,error}=await sb.rpc('get_staff_workflow_chain',{p_shipment_id:String(shipment.id)});
      if(error) throw error;
      const items=Array.isArray(chain)?chain:[];
      const html=`<div class="gc-chain-meta"><span class="gc-chain-pill">Tracking: ${esc(shipment.tracking_id)}</span><span class="gc-chain-pill">Route: ${esc(shipment.route)}</span><span class="gc-chain-pill">Status: ${esc(shipment.status||'—')}</span><span class="gc-chain-pill">ژمارەی هەنگاو: ${items.length}</span></div>
        ${items.length?`<div class="gc-chain">${items.map(x=>`<article class="gc-chain-item"><i class="gc-chain-dot"></i><div class="gc-chain-box"><div class="gc-chain-row"><div><div class="gc-chain-event">${esc(labels[x.event_type]||x.event_type)}</div><div class="gc-chain-source">${esc(sourceLabels[x.source_table]||x.source_table)} · ${esc(x.source_id)}</div></div><time class="gc-chain-time">${esc(fmtDate(x.occurred_at))}</time></div><div class="gc-chain-detail">${summarize(x.payload)||'ڕووداوێکی تۆمارکراوی بەڵگەدار.'}</div></div></article>`).join('')}</div>`:'<div class="gc-chain-empty">هێشتا هیچ event ـێکی chain بۆ ئەم بارە تۆمار نەکراوە.</div>'}`;
      result.innerHTML=html;
    } catch(err) {
      result.innerHTML=`<div class="gc-chain-error">نەتوانرا زنجیرەکە بخوێندرێتەوە: ${esc(err?.message||'هەڵەی نادیار')}</div>`;
    }
  }

  function addButton() {
    if (document.getElementById('gcWorkflowChainBtn')) return true;
    const actions=document.querySelector('.top-actions'); if(!actions) return false;
    const b=document.createElement('button'); b.id='gcWorkflowChainBtn'; b.className='btn gc-chain-top-btn'; b.type='button'; b.textContent='⛓ زنجیرەی بار';
    b.onclick=()=>{const m=modal();m.classList.add('open');setTimeout(()=>document.getElementById('gcChainInput')?.focus(),30)};
    actions.prepend(b); return true;
  }

  async function boot(){
    style();
    const start=Date.now();
    while(Date.now()-start<20000){ if(addButton()) break; await new Promise(r=>setTimeout(r,250)); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
