(()=>{
'use strict';
const $=id=>document.getElementById(id);
const fmt=v=>v?new Date(v).toLocaleString('ku-IQ',{dateStyle:'medium',timeStyle:'short'}):'—';
async function load(){
 const overall=$('overall');
 overall.dataset.state='';
 $('overallText').textContent='پشکنین…';
 try{
  const r=await fetch('/api/health?status='+Date.now(),{cache:'no-store',headers:{Accept:'application/json','Cache-Control':'no-cache'}});
  const d=await r.json();
  const state=d.ok?'ok':(r.status===503?'degraded':'down');
  overall.dataset.state=state;
  $('overallText').textContent=d.ok?'هەموو شتەکان ئامادەن':state==='degraded'?'خزمەتگوزاری کەمکراوە':'کێشە هەیە';
  $('edge').textContent=d.edge==='ok'?'چالاک':'ناچالاک';
  $('supabase').textContent=d.supabase?.status==='ok'?'چالاک':'کەمکراوە';
  $('supabaseHttp').textContent=d.supabase?.http_status?`HTTP ${d.supabase.http_status}`:'—';
  $('latency').textContent=`${d.response_ms??'—'}ms`;
  $('service').textContent=d.service||'—';
  $('version').textContent=d.version||'—';
  $('release').textContent='Verified by /api/health';
  $('timestamp').textContent=fmt(d.timestamp);
  $('checked').textContent='کۆتا پشکنین: '+fmt(new Date().toISOString());
 }catch(_){
  overall.dataset.state='down';
  $('overallText').textContent='پشکنین سەرکەوتوو نەبوو';
  $('edge').textContent='نەپشکنرا';
  $('supabase').textContent='نەپشکنرا';
  $('service').textContent='Globall Cloud';
  $('release').textContent='—';
  $('checked').textContent='هەڵە لە وەرگرتنی health data';
 }
}
$('refresh')?.addEventListener('click',load);
load();
setInterval(load,60000);
})();
