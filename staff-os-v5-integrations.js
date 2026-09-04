(() => {
  'use strict';
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const INVOICE_AI = `${SUPABASE_URL}/functions/v1/invoice-ai`;
  const DEBT_AI = `${SUPABASE_URL}/functions/v1/customer-debt-assistant`;
  if (window.__gcV5Integrations) return;
  window.__gcV5Integrations = true;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = (msg) => { let x=document.getElementById('gcToast'); if(!x){x=document.createElement('div');x.id='gcToast';x.className='toast';document.body.appendChild(x)} x.textContent=msg; clearTimeout(x._t); x._t=setTimeout(()=>x.remove(),3200); };
  const session = async () => (await window.gcSupabase?.auth?.getSession?.())?.data?.session || null;
  const authFetch = async (url, init={}) => { const s=await session(); if(!s?.access_token) throw new Error('Session ـی کارپێکردن نییە'); return fetch(url,{...init,headers:{apikey:KEY,Authorization:`Bearer ${s.access_token}`,...(init.headers||{})},cache:'no-store'}); };

  async function aiInvoiceModal(){
    const back=document.createElement('div'); back.className='modal-backdrop'; back.id='gcAiModal';
    back.innerHTML=`<div class="modal"><div class="modal-head"><div><div class="eyebrow">AI INVOICE READER</div><h2>خوێندنەوەی فاتورەی چین</h2></div><button class="btn" data-close>×</button></div><p class="muted" style="font-size:11px;line-height:1.8">وێنەی فاتورە هەڵبژێرە؛ AI ناوی کاڵا و ژمارەکان دەخوێنێتەوە و کورتەی کوردی دروست دەکات.</p><input id="gcAiFile" class="field" type="file" accept="image/*" capture="environment"><div id="gcAiResult" class="card" style="margin-top:10px;min-height:120px">هیچ وێنەیەک هەڵنەبژێردراوە.</div><div class="modal-foot"><button class="btn" data-close>داخستن</button><button class="btn primary" id="gcAiRun">AI بخوێنێتەوە</button></div></div>`;
    document.body.appendChild(back); back.addEventListener('click',e=>{if(e.target===back||e.target.closest('[data-close]'))back.remove()});
    document.getElementById('gcAiRun').onclick=async()=>{ const file=document.getElementById('gcAiFile').files?.[0]; const out=document.getElementById('gcAiResult'); if(!file)return out.textContent='تکایە وێنەی فاتورە هەڵبژێرە.'; const fd=new FormData();fd.append('file',file);out.innerHTML='<span class="muted">AI لە کاردایە…</span>';try{const r=await authFetch(INVOICE_AI,{method:'POST',body:fd});const d=await r.json();if(!r.ok)throw new Error(d.error||`AI HTTP ${r.status}`);const items=Array.isArray(d.items)?d.items:[];out.innerHTML=`<div><b>${esc(d.kurdish_summary||'')}</b>${items.length?`<div class="list" style="margin-top:8px">${items.map(i=>`<div class="mini-row"><div><b>${esc(i.name||'کالای نادیار')}</b><span>SKU: ${esc(i.sku||'—')} · ${esc(i.unit||'')}</span></div><strong class="mono">${esc(i.quantity??'—')}</strong></div>`).join('')}</div>`:'<div class="muted" style="margin-top:8px">هیچ item ـێکی دڵنیابەخش نەدۆزرایەوە.</div>'}</div>`}catch(e){out.innerHTML=`<span style="color:var(--red)">${esc(e.message)}</span>`}};
  }

  async function debtForThread(thread){
    const q=prompt('چی دەتەوێت بپرسیت؟','چەند قەرزارم؟'); if(!q)return;
    try{const r=await authFetch(DEBT_AI,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:q})});const d=await r.json();if(!r.ok)throw new Error(d.error||`Debt HTTP ${r.status}`);alert(`${d.answer||'—'}${d.payment_url?`\n\nپارەدان: ${location.origin}${d.payment_url}`:''}`)}catch(e){toast(e.message)}
  }

  function enhanceWarehouse(){ const view=document.getElementById('view'); if(!view||!view.textContent.includes('کۆگاكان'))return; if(document.getElementById('gcAiInvoiceBtn'))return; const heads=view.querySelector('.section-head .actions'); if(!heads)return; const b=document.createElement('button');b.id='gcAiInvoiceBtn';b.className='btn';b.textContent='AI فاتورە';b.onclick=aiInvoiceModal;heads.appendChild(b); }
  function enhanceCustomerChat(){ const view=document.getElementById('view'); if(!view||!view.textContent.includes('چاتی کڕیار'))return; if(document.getElementById('gcDebtAssistantBtn'))return; const heads=view.querySelector('.section-head .actions')||view.querySelector('.section-head'); if(!heads)return; const b=document.createElement('button');b.id='gcDebtAssistantBtn';b.className='btn';b.textContent='چەند قەرزارم؟';b.onclick=()=>debtForThread(window.__gcActiveCustomerThread||null);heads.appendChild(b); }
  function syncActiveThread(){ const title=document.getElementById('customerChatTitle'); const m=title?.textContent||''; const match=m.match(/(GC-[A-Z0-9-]+)/i); window.__gcActiveCustomerThread=match?.[1]||null; }
  const observer=new MutationObserver(()=>{enhanceWarehouse();enhanceCustomerChat();syncActiveThread()});
  observer.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('load',()=>{try{navigator.serviceWorker?.register('/sw.js',{scope:'/'}).catch(()=>{})}catch{}});
  setTimeout(()=>{enhanceWarehouse();enhanceCustomerChat();syncActiveThread();try{navigator.serviceWorker?.register('/sw.js',{scope:'/'}).catch(()=>{})}catch{}},1000);
})();
