(() => {
  'use strict';
  if (!/^\/staff(?:-os)?(?:\.html)?\/?$/.test(location.pathname)) return;
  const URL='https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/invoice-ai';
  const KEY='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function mount(){
    const form=$('#gcx2-wf');const file=$('#gcx2-wf input[name=photos]');if(!form||!file||$('#gcx2-ai-btn'))return;
    const b=document.createElement('button');b.type='button';b.id='gcx2-ai-btn';b.className='btn tiny';b.textContent='✦ AI خوێندنەوەی فاتورە';b.style.marginTop='8px';file.parentElement.appendChild(b);
    b.onclick=async()=>{const f=file.files?.[0];if(!f)return alert('یەک وێنەی فاتورە هەڵبژێرە.');const s=window.gcSupabase?.auth?await window.gcSupabase.auth.getSession():null;const token=s?.data?.session?.access_token;if(!token)return alert('Session required');const body=new FormData();body.set('file',f);b.disabled=true;b.textContent='AI لە کاردایە...';try{const r=await fetch(URL,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${token}`},body});const d=await r.json();if(!r.ok)throw Error(d?.error||`HTTP ${r.status}`);const host=form.parentElement;const box=document.createElement('div');box.id='gcx2-ai-result';box.className='gcx2-card';box.style.marginTop='10px';box.innerHTML=`<b>وەرگێڕانی AI</b><p style="white-space:pre-wrap;margin-top:6px">${esc(d.kurdish_summary||'')}</p>${Array.isArray(d.items)&&d.items.length?`<div style="margin-top:7px">${d.items.map(x=>`<div style="padding:7px 0;border-top:1px solid rgba(255,255,255,.06);font-size:10px"><b>${esc(x.name||'—')}</b> · ${esc(x.quantity??'—')} ${esc(x.unit||'')} · ${esc(x.sku||'')}</div>`).join('')}</div>`:''}`;host.querySelector('#gcx2-ai-result')?.remove();host.appendChild(box);const notes=form.querySelector('textarea[name=notes]');if(notes&&d.kurdish_summary)notes.value=`${notes.value?notes.value+'\n':''}${d.kurdish_summary}`;b.textContent='✦ AI خوێندنەوەی فاتورە'}catch(e){alert(e.message);b.textContent='✦ AI خوێندنەوەی فاتورە'}finally{b.disabled=false}};
  }
  const obs=new MutationObserver(mount);obs.observe(document.documentElement,{subtree:true,childList:true});setTimeout(mount,1200);window.addEventListener('gc:staff-auth-ready',()=>setTimeout(mount,500));
})();
