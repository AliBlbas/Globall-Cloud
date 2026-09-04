(() => {
  'use strict';
  const OPS_V4='https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/operations-v4';
  const SHIP_CREATE='https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/staff-shipment-v5';
  const ACCOUNT_ADMIN='https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/account-admin';
  const KEY='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const nativeFetch=window.fetch.bind(window);
  if(window.__gcV5CreatePatches)return; window.__gcV5CreatePatches=true;
  const token=async()=> (await window.gcSupabase?.auth?.getSession?.())?.data?.session?.access_token || null;
  window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:input?.url||''; const method=String(init.method||'GET').toUpperCase();
    if(url===OPS_V4&&method==='POST'&&typeof init.body==='string'){
      try{
        const body=JSON.parse(init.body); const d=body?.data||{}; const t=await token(); if(!t)return nativeFetch(input,init);
        if(body?.action==='customer_create'){
          const r=await nativeFetch(ACCOUNT_ADMIN,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`,apikey:KEY},body:JSON.stringify({kind:'customer',action:'create',data:d}),cache:'no-store'});const raw=await r.text();return new Response(raw,{status:r.status,headers:r.headers});
        }
        if(body?.action==='shipment_update'&&d.id&&!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(d.id))){
          const r=await nativeFetch(SHIP_CREATE,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`,apikey:KEY},body:JSON.stringify({...d,tracking_id:d.tracking_id||d.id,customer_gc_code:d.customer_gc_code||d.gc_code}),cache:'no-store'});const raw=await r.text();return new Response(raw,{status:r.status,headers:r.headers});
        }
      }catch(_){ }
    }
    return nativeFetch(input,init);
  };
})();