(() => {
  'use strict';
  const OPS_V4='https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/operations-v4';
  const CONTROL='https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/staff-shipment-control';
  const KEY='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  if(window.__gcShipmentControlBridge)return;
  window.__gcShipmentControlBridge=true;
  const nativeFetch=window.fetch.bind(window);
  const token=async()=> (await window.gcSupabase?.auth?.getSession?.())?.data?.session?.access_token || null;
  window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:input?.url||'';
    const method=String(init.method||'GET').toUpperCase();
    if(url===OPS_V4&&method==='POST'&&typeof init.body==='string'){
      try{
        const body=JSON.parse(init.body);
        if(body?.action==='shipment_update'){
          const t=await token();
          if(t){
            const r=await nativeFetch(CONTROL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`,apikey:KEY},body:JSON.stringify({data:body.data||{}}),cache:'no-store'});
            const raw=await r.text();
            return new Response(raw,{status:r.status,headers:r.headers});
          }
        }
      }catch(_){ }
    }
    return nativeFetch(input,init);
  };
})();
