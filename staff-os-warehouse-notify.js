(() => {
  'use strict';
  if (!/^\/staff(?:-os)?(?:\.html)?\/?$/.test(location.pathname)) return;
  if (window.__gcWarehouseNotifyBridgeInstalled) return;
  const WH='https://swptmhhwhdtyrrfzetam.supabase.co/functions/v1/warehouse-receiving';
  const NOTIFY='https://swptmhhwhdtyrrfzetam.supabase.co/functions/v1/warehouse-notify';
  const KEY='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const native=window.fetch.bind(window);
  window.__gcWarehouseNotifyBridgeInstalled=true;
  async function notify(receiptId,token){
    if(!receiptId||!token)return;
    try{await native(NOTIFY,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({receipt_id:String(receiptId)})})}catch(e){console.warn('[Globall Cloud] warehouse notification queue:',e?.message||e)}
  }
  window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:(input?.url||'');
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    const response=await native(input,init);
    if(method==='POST'&&url.startsWith(WH)&&response.ok){
      const token=String(init?.headers?.Authorization||init?.headers?.authorization||'').replace(/^Bearer\s+/i,'') || (window.gcSupabase?.auth ? (await window.gcSupabase.auth.getSession()).data?.session?.access_token : '');
      response.clone().json().then(body=>{if(body?.receipt?.id)notify(body.receipt.id,token)}).catch(()=>undefined);
    }
    return response;
  };
})();
