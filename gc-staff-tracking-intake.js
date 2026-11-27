(() => {
'use strict';
const URL='https://ahslifnthiwfkmaswjno.supabase.co';
const KEY='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
const API=URL+'/functions/v1/warehouse-receiving';
const ACCOUNT=URL+'/functions/v1/account-admin';
const ROLES=['admin','super_admin','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','delivery'];
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').normalize('NFKC').toUpperCase().replace(/\s+/g,'').trim();
const state={db:null,session:null,staff:null,reader:null,controls:null,photo:null,selected:null,shipment:null,shipmentMismatch:false,customerShipments:[],duplicate:[]};

function message(id,text,type=''){const n=$('#'+id);if(!n)return;n.textContent=text;n.classList.toggle('bad',type==='bad');n.classList.toggle('good',type==='good');}
function addStyle(){
 if($('#gcScanStyle'))return;
 const s=document.createElement('style');s.id='gcScanStyle';
 s.textContent=[
 '#gcScanOpen{border:1px solid rgba(22,199,229,.42);background:rgba(22,199,229,.14);color:#d9fbff;font-weight:900}',
 '#gcScanModal{position:fixed;inset:0;z-index:12000;display:none;place-items:center;padding:10px;background:rgba(0,5,13,.84);backdrop-filter:blur(10px)}',
 '#gcScanModal.open{display:grid}#gcScanModal *{box-sizing:border-box}',
 '.gcs-panel{width:min(920px,100%);max-height:95dvh;overflow:auto;background:#061729;color:#f3f9ff;border:1px solid #285071;border-radius:22px;padding:15px;font-family:inherit;box-shadow:0 28px 90px #0009}',
 '.gcs-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;border-bottom:1px solid #29445d;padding-bottom:12px;margin-bottom:12px}',
 '.gcs-head h2{margin:4px 0;font-size:21px}.gcs-head p{margin:0;color:#9db6d3;font-size:12px;line-height:1.8}.gcs-kicker{font:800 10px monospace;letter-spacing:1.5px;color:#8beaf6}',
 '.gcs-close{width:40px;height:40px;border:1px solid #34536b;border-radius:12px;background:#0b2035;color:#fff;font-size:22px}',
 '.gcs-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.gcs-card{padding:13px;border:1px solid #25445f;border-radius:16px;background:linear-gradient(145deg,#0d2d4b,#04111f)}',
 '.gcs-card h3{margin:0 0 9px;font-size:14px}.gcs-video{position:relative;aspect-ratio:16/10;background:#020811;border:1px solid #285071;border-radius:13px;overflow:hidden}.gcs-video video{width:100%;height:100%;object-fit:cover}.gcs-frame{position:absolute;inset:18% 12%;border:2px solid #58e6b0;border-radius:12px;pointer-events:none}',
 '.gcs-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.gcs-btn{border:1px solid #345b7a;border-radius:10px;background:#102a45;color:#fff;padding:10px 12px;min-height:40px;font-weight:800;cursor:pointer}.gcs-btn.primary{background:linear-gradient(135deg,#8beaf6,#16c7e5);border:0;color:#04151c}.gcs-btn:disabled{opacity:.45}',
 '.gcs-field{width:100%;min-height:42px;border:1px solid #34536b;border-radius:10px;background:#04111f;color:#fff;padding:9px 11px;font:inherit;font-size:14px;outline:none}.gcs-field:focus{border-color:#62deed;box-shadow:0 0 0 3px #16c7e522}',
 '.gcs-label{display:block;margin:9px 0 5px;color:#b5cce2;font-size:11px;font-weight:800}.gcs-note,.gcs-status{font-size:11px;line-height:1.8;color:#9db6d3}.gcs-status{padding:9px 10px;margin-top:8px;border:1px solid #294b67;border-radius:10px;background:#8beaf60c;color:#d8faff}.gcs-status.bad{border-color:#ff6b7a66;background:#ff6b7a12;color:#ffd3d8}.gcs-status.good{border-color:#58e6b066;background:#58e6b012;color:#b9f6df}',
 '.gcs-list{display:grid;gap:6px;max-height:210px;overflow:auto;margin-top:8px}.gcs-customer{width:100%;text-align:right;padding:10px;border:1px solid #294b67;border-radius:11px;background:#ffffff08;color:#fff}.gcs-customer strong,.gcs-customer span{display:block}.gcs-customer span{font-size:11px;color:#a9c1d9;margin-top:3px}.gcs-selected,.gcs-alert,.gcs-success{padding:11px;margin-top:9px;border-radius:11px;line-height:1.8;font-size:12px}.gcs-selected,.gcs-success{border:1px solid #58e6b055;background:#58e6b00d;color:#b9f6df}.gcs-alert{border:1px solid #ffb35a66;background:#ffb35a12;color:#ffe3b5}.gcs-fields{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.gcs-hidden{display:none!important}',
 '@media(max-width:740px){#gcScanModal{padding:5px;align-items:end}.gcs-panel{max-height:97dvh;padding:11px;border-radius:18px}.gcs-grid{grid-template-columns:1fr}.gcs-head h2{font-size:18px}.gcs-video{aspect-ratio:4/3}.gcs-fields{grid-template-columns:1fr 1fr}}@media(max-width:380px){.gcs-fields{grid-template-columns:1fr}}'
 ].join('\n');
 document.head.appendChild(s);
}
function makeModal(){
 if($('#gcScanModal'))return;
 const m=document.createElement('div');m.id='gcScanModal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
 m.innerHTML=[
 '<div class="gcs-panel">',
 '<header class="gcs-head"><div><div class="gcs-kicker">GLOBALL CLOUD · TRACKING INTAKE</div><h2>دۆزینەوەی کڕیار و سکانکردنی تراکینگ</h2><p>یەکەم کڕیاری هەبوو بە GC Code / ناو / مۆبایل بدۆزەرەوە؛ دوای پشتڕاستکردنەوە، بارکۆدی تراکینگ سکان بکە و وەسڵەکە بەو کڕیارەوە ببەستە.</p></div><button class="gcs-close" id="gcScanClose" type="button">×</button></header>',
 '<div class="gcs-grid">',
 '<section class="gcs-card"><h3>١. گەڕان بۆ کڕیاری هەبوو</h3><label class="gcs-label" for="gcScanQuery">GC Code / ناو / ژمارەی مۆبایل</label><input class="gcs-field" id="gcScanQuery" placeholder="GC-338 یان 0770... یان ناوی کڕیار" autocomplete="off">',
 '<div class="gcs-actions"><button class="gcs-btn primary" id="gcScanSearch" type="button">گەڕان لە کڕیارە هەبووەکان</button></div><div class="gcs-list" id="gcScanCustomers"></div><div class="gcs-selected gcs-hidden" id="gcScanSelected"></div><div class="gcs-alert gcs-hidden" id="gcScanShipment"></div></section>',
 '<section class="gcs-card"><h3>٢. سکانکردنی تراکینگ</h3><div class="gcs-video"><video id="gcScanVideo" autoplay muted playsinline></video><div class="gcs-frame"></div></div>',
 '<div class="gcs-actions"><button class="gcs-btn primary" id="gcScanStart" type="button" disabled>کامێرا بکەرەوە و سکان بکە</button><button class="gcs-btn" id="gcScanStop" type="button" disabled>وەستاندن</button></div>',
 '<div class="gcs-status" id="gcScanStatus" role="status" aria-live="polite">سەرەتا کڕیاری هەبوو هەڵبژێرە؛ پاشان کامێرا چالاک دەبێت.</div>',
 '<label class="gcs-label" for="gcScanTracking">Tracking Number</label><input class="gcs-field" id="gcScanTracking" dir="ltr" placeholder="JTE30053866832" autocomplete="off" disabled>',
 '<label class="gcs-label" for="gcScanPhoto">وێنەی پاکەت / لیبڵ (ئەگەر وێنەی کامێرا نەگیرا)</label><input class="gcs-field" id="gcScanPhoto" type="file" accept="image/*" capture="environment" disabled><div class="gcs-note" id="gcScanPhotoNote">وێنەی کامێرا دوای سکان وەک بەڵگە هەڵدەگیرێت.</div>',
 '<div id="gcScanDuplicate" class="gcs-alert gcs-hidden"></div></section>',
 '</div>',
 '<section class="gcs-card" style="margin-top:11px"><h3>٣. دروستکردنی وەسڵی کۆگا</h3><div class="gcs-fields">',
 '<label><span class="gcs-label">شوێنی وەرگرتن</span><select class="gcs-field" id="gcScanLocation"><option value="Dubai">Dubai / UAE</option><option value="China">China</option><option value="Erbil">Erbil</option></select></label>',
 '<label><span class="gcs-label">کۆمپانیای گواستنەوە</span><input class="gcs-field" id="gcScanCarrier" value="TAG Express"></label>',
 '<label><span class="gcs-label">کێش (KG)</span><input class="gcs-field" id="gcScanWeight" type="number" min="0" step="0.001" placeholder="1.910"></label>',
 '<label><span class="gcs-label">ژمارەی پاکێج</span><input class="gcs-field" id="gcScanPackages" type="number" min="1" max="999" value="1"></label>',
 '<label><span class="gcs-label">Invoice No.</span><input class="gcs-field" id="gcScanInvoice" placeholder="ژمارەی فاتورە"></label>',
 '<label><span class="gcs-label">ناوی کاڵا</span><input class="gcs-field" id="gcScanItem" placeholder="Clothes / Accessories"></label></div>',
 '<div class="gcs-actions"><button class="gcs-btn primary" id="gcScanSave" type="button" disabled>دروستکردنی وەسڵ و بەستن بە کڕیار</button><button class="gcs-btn" id="gcScanReset" type="button">پاککردنەوە</button></div>',
 '<div class="gcs-status" id="gcScanSaveStatus">سەرەتا کڕیاری هەبوو بدۆزەوە و هەڵیبژێرە.</div><div class="gcs-success gcs-hidden" id="gcScanSuccess"></div></section>',
 '</div>'
 ].join('');
 document.body.appendChild(m);
}

async function getClient(){
 state.db=window.gcSupabase||window.sb||null;
 if(!state.db&&window.supabase?.createClient)state.db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 if(!state.db?.auth)throw new Error('Supabase ئامادە نییە؛ دووبارە login بکە.');
 const s=await state.db.auth.getSession();if(s.error)throw s.error;state.session=s.data?.session||null;
 if(!state.session?.access_token||!state.session.user?.id)throw new Error('Session ـی ستاف بەردەست نییە.');
 const r=await state.db.from('staff').select('id,full_name,role,branch,is_active').eq('id',state.session.user.id).maybeSingle();
 if(r.error)throw r.error;if(!r.data||r.data.is_active!==true||!ROLES.includes(String(r.data.role||'')))throw new Error('ئەم هەژمارە ڕێگەی سکانکردنی بارەکانی کۆگا نییە.');
 state.staff=r.data;
}
function stopCamera(){if(state.controls){try{state.controls.stop();}catch{}state.controls=null;}state.scanning=false;const v=$('#gcScanVideo');if(v){try{v.pause();v.srcObject=null;}catch{}}if($('#gcScanStop'))$('#gcScanStop').disabled=true;}
function photoFromVideo(){return new Promise(resolve=>{const v=$('#gcScanVideo');if(!v?.videoWidth)return resolve(null);const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d');if(!ctx)return resolve(null);ctx.drawImage(v,0,0,c.width,c.height);c.toBlob(b=>resolve(b||null),'image/jpeg',.88);});}
async function loadZXing(){
 if(window.ZXingBrowser?.BrowserMultiFormatReader)return window.ZXingBrowser;
 return new Promise((resolve,reject)=>{let s=$('script[data-gc-zxing]');if(s){s.addEventListener('load',()=>window.ZXingBrowser?resolve(window.ZXingBrowser):reject(new Error('Barcode reader بارنەکرا.')),{once:true});s.addEventListener('error',()=>reject(new Error('کتێبخانەی سکانکردن بارنەکرا.')),{once:true});return;}
 s=document.createElement('script');s.src='https://unpkg.com/@zxing/browser@0.2.1';s.async=true;s.dataset.gcZxing='1';s.onload=()=>window.ZXingBrowser?resolve(window.ZXingBrowser):reject(new Error('Barcode reader ئامادە نەبوو.'));s.onerror=()=>reject(new Error('کتێبخانەی سکانکردن بارنەکرا؛ ژمارەکە بە دەست بنووسە.'));document.head.appendChild(s);});
}
async function startCamera(){
 if(!state.selected){setMsg('gcScanStatus','سەرەتا کڕیاری هەبوو بدۆزەوە و هەڵیبژێرە.','bad');return;}
 stopCamera();setMsg('gcScanStatus','کامێرا دەکرێتەوە…');
 try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('کامێرا بەردەست نییە؛ لە Safari ڕێگەپێدانی کامێرا بدە.');
 const lib=await loadZXing();state.reader=new lib.BrowserMultiFormatReader();state.scanning=true;$('#gcScanStop').disabled=false;setMsg('gcScanStatus','کامێرا کراوەتەوە؛ بارکۆدی سەر پاکەت لە ناو چوارچێوەکە دابنێ.');
 state.controls=await state.reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}},$('#gcScanVideo'),async(result)=>{
  if(!state.scanning||!result)return;state.scanning=false;const raw=result.getText?result.getText():String(result.text||'');
  const blob=await photoFromVideo();if(blob){state.photo=new File([blob],'globall-tracking-label.jpg',{type:'image/jpeg'});$('#gcScanPhotoNote').textContent='وێنەی سکان وەک بەڵگە هەڵگیرا.';}
  stopCamera();$('#gcScanTracking').value=norm(raw);await verifyTracking();setMsg('gcScanStatus','بارکۆد خوێندرایەوە: '+norm(raw),'good');
 });
 }catch(e){stopCamera();setMsg('gcScanStatus',e.message||'کامێرا نەکرایەوە.','bad');}
}
async function decodePhoto(file){
 if(!file)return;setMsg('gcScanStatus','بارکۆدی وێنەکە دەخوێندرێتەوە…');
 try{const lib=await loadZXing();state.reader=new lib.BrowserMultiFormatReader();const url=URL.createObjectURL(file);try{const r=await state.reader.decodeFromImageUrl(url);$('#gcScanTracking').value=norm(r.getText?r.getText():'');state.photo=file;$('#gcScanPhotoNote').textContent='وێنەی هەڵبژێردراو وەک بەڵگە بەکاردێت.';await verifyTracking();setMsg('gcScanStatus','بارکۆد لە وێنەکە خوێندرایەوە.','good');}finally{URL.revokeObjectURL(url);}}catch(e){state.photo=file;$('#gcScanPhotoNote').textContent='وێنە هەڵگیرا؛ ژمارەکە بە دەست بنووسە.';setMsg('gcScanStatus',e.message||'بارکۆد نەخوێندرایەوە.','bad');}saveReady();
}
async function findDuplicate(tracking){
 const r=await fetch(API+'?tracking_number='+encodeURIComponent(tracking),{headers:{Authorization:'Bearer '+state.session.access_token,apikey:KEY,Accept:'application/json'},cache:'no-store'});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'پشکنینی تراکینگ سەرکەوتوو نەبوو.');
 state.duplicate=d.items||[];const box=$('#gcScanDuplicate');
 if(state.duplicate.length){box.classList.remove('gcs-hidden');box.innerHTML='<strong>⚠ ئەم تراکینگ ژمارەیە پێشتر وەسڵی هەیە</strong><br>'+state.duplicate.map(x=>'وەسڵ: '+esc(x.batch_code||x.id)+' · '+esc(x.customer?.name||x.gc_code||'کڕیار')+' · '+esc(x.location||'—')).join('<br>')+'<br>وەسڵی دووبارە دروست ناکرێت.';}
 else{box.classList.add('gcs-hidden');box.textContent='';}return state.duplicate;
}
async function findShipment(tracking){
 if(!state.selected){state.shipment=null;return;}
 renderShipmentChoices(tracking);
 return state.shipment;
}

async function verifyTracking(){
 if(!state.selected){setMsg('gcScanStatus','سەرەتا کڕیاری هەبوو هەڵبژێرە.','bad');saveReady();return;}
 const tracking=norm($('#gcScanTracking').value);$('#gcScanTracking').value=tracking;
 if(!/^[A-Z0-9._/-]{5,160}$/.test(tracking)){
  state.duplicate=[];renderShipmentChoices('');saveReady();return;
 }
 setMsg('gcScanStatus','پشکنینی تراکینگ لە وەسڵە هەبووەکان و Shipment ـی هەمان کڕیار…');
 try{
  await Promise.all([findDuplicate(tracking),findShipment(tracking)]);
  if(state.duplicate.length)setMsg('gcScanStatus','ئەم Tracking Number ـە پێشتر وەسڵی هەیە؛ دووبارە تۆمار ناکرێت.','bad');
  else setMsg('gcScanStatus','Tracking Number پشکنین کرا؛ Shipment ـی گونجاو دیاری کرا.','good');
 }catch(error){setMsg('gcScanStatus',error.message||'پشکنینی Tracking سەرکەوتوو نەبوو.','bad');}
 saveReady();
}

async function searchCustomers(){
 const q=String($('#gcScanQuery').value||'').trim();if(q.length<2){$('#gcScanCustomers').textContent='لانیکەم دوو پیت یان ژمارە بنووسە.';return;}
 if(state.selected){stopCamera();state.selected=null;state.shipment=null;state.shipmentMismatch=false;state.duplicate=[];state.photo=null;$('#gcScanStart').disabled=true;$('#gcScanTracking').disabled=true;$('#gcScanPhoto').disabled=true;$('#gcScanTracking').value='';$('#gcScanPhoto').value='';$('#gcScanSelected').classList.add('gcs-hidden');saveReady();}
 $('#gcScanCustomers').innerHTML='<div class="gcs-note">لە کڕیارە هەبووەکاندا دەگەڕێم…</div>';
 try{
  const response=await fetch(ACCOUNT+'/?kind=customer_match&q='+encodeURIComponent(q),{
   headers:{Authorization:'Bearer '+state.session.access_token,apikey:KEY,Accept:'application/json'},
   cache:'no-store'
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error||payload.message||'گەڕانی کڕیار سەرکەوتوو نەبوو.');
  const customers=Array.isArray(payload.customers)?payload.customers:(payload.customer?[payload.customer]:[]);
  if(!customers.length){$('#gcScanCustomers').textContent='هیچ کڕیاری چالاک بەم زانیارییە نەدۆزرایەوە.';return;}
  $('#gcScanCustomers').innerHTML=customers.map(c=>'<button class="gcs-customer" type="button" data-customer="'+esc(c.id)+'"><strong>'+esc(c.name||'کڕیاری بێ ناو')+' · <span dir="ltr">'+esc(c.gc_code||c.code||'GC code نییە')+'</span></strong><span dir="ltr">'+esc(c.phone||c.phone2||c.whatsapp_phone||'ژمارەی مۆبایل نییە')+'</span><span>'+esc(c.city||c.delivery_location||'')+'</span></button>').join('');
  $('#gcScanCustomers').querySelectorAll('[data-customer]').forEach(button=>button.addEventListener('click',()=>{const customer=customers.find(row=>String(row.id)===button.dataset.customer);if(customer)selectCustomer(customer,false);}));
 }catch(error){$('#gcScanCustomers').innerHTML='<div class="gcs-status bad">'+esc(error.message||'گەڕان سەرکەوتوو نەبوو.')+'</div>';}
}
async function selectCustomer(candidate){
 if(!candidate||candidate.is_active===false){message('gcScanCustomerStatus','تەنها کڕیاری چالاک دەتوانرێت هەڵبژێردرێت.','bad');return;}
 const code=norm(candidate.gc_code||candidate.code);
 if(!candidate.id||!/^GC-[A-Z0-9-]{2,30}$/.test(code)){message('gcScanCustomerStatus','کۆدی GC ـی کڕیار دروست نییە؛ پێویستی بە چاککردنەوەی هەژمارەکەیە.','bad');return;}
 stopCamera();
 if(state.selected&&String(state.selected.id)!==String(candidate.id)){
  state.photo=null;state.shipment=null;state.duplicate=[];$('#gcScanTracking').value='';$('#gcScanPhoto').value='';
  $('#gcScanDuplicate').classList.add('gcs-hidden');$('#gcScanShipment').classList.add('gcs-hidden');
 }
 state.selected=null;state.customerShipments=[];state.shipment=null;state.shipmentMismatch=false;
 $('#gcScanStart').disabled=true;$('#gcScanTracking').disabled=true;$('#gcScanPhoto').disabled=true;
 message('gcScanCustomerStatus','ناسنامەی کڕیار لە خزمەتگوزاری پارێزراو پشتڕاست دەکرێتەوە…');
 try{
  const response=await fetch(ACCOUNT+'/?kind=customer_match&q='+encodeURIComponent(code),{
   headers:{Authorization:'Bearer '+state.session.access_token,apikey:KEY,Accept:'application/json'},
   cache:'no-store'
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error||payload.message||'پشتڕاستکردنەوەی کڕیار سەرکەوتوو نەبوو.');
  const exact=payload.customer||((payload.customers||[]).find(row=>String(row.id)===String(candidate.id)));
  if(!exact||String(exact.id)!==String(candidate.id)||exact.is_active===false)throw new Error('کڕیار لە داتابەیسی پارێزراودا پشتڕاست نەکرایەوە.');
  state.selected=exact;
  state.customerShipments=Array.isArray(payload.shipments)?payload.shipments:[];
  const box=$('#gcScanSelected');box.classList.remove('gcs-hidden');
  box.innerHTML='<strong>✓ کڕیار پشتڕاست کرایەوە</strong><br>'+esc(exact.name||'—')+'<br><b dir="ltr">'+esc(code)+'</b><br><span dir="ltr">'+esc(exact.phone||exact.phone2||exact.whatsapp_phone||'ژمارەی مۆبایل نییە')+'</span>';
  $('#gcScanQuery').value=code;
  $('#gcScanStart').disabled=false;$('#gcScanTracking').disabled=false;$('#gcScanPhoto').disabled=false;
  renderShipmentChoices('');
  message('gcScanCustomerStatus','✓ کڕیار هەڵبژێردرا. '+state.customerShipments.length+' Shipment ـی چالاک دۆزرایەوە.');
  setMsg('gcScanStatus','کڕیار پشتڕاست کرا؛ ئێستا Tracking Number سکان بکە.','good');
  saveReady();
 }catch(error){
  state.selected=null;state.customerShipments=[];state.shipment=null;state.shipmentMismatch=true;
  $('#gcScanStart').disabled=true;$('#gcScanTracking').disabled=true;$('#gcScanPhoto').disabled=true;
  message('gcScanCustomerStatus',error.message||'پشتڕاستکردنەوەی کڕیار سەرکەوتوو نەبوو.','bad');saveReady();
 }
}
function renderShipmentChoices(tracking){
 const box=$('#gcScanShipment');if(!box)return;
 const rows=state.customerShipments||[];
 const code=norm(tracking||'');
 const exact=code?rows.filter(row=>[row.tracking_id,row.tracking_number,row.external_reference].some(value=>value&&norm(value)===code)):[];
 const choices=exact.length?exact:rows;
 state.shipment=null;state.shipmentMismatch=false;
 if(choices.length===1){
  state.shipment=choices[0];box.classList.remove('gcs-hidden');
  const label=exact.length?'Tracking ـەکە لەگەڵ Shipment ـی ئەم کڕیارە گونجا':'یەک Shipment ـی چالاک بۆ ئەم کڕیارە هەیە';
  box.innerHTML='<strong>✓ '+label+'</strong><br><span dir="ltr">'+esc(state.shipment.tracking_id||state.shipment.tracking_number||state.shipment.id)+'</span> · '+esc(state.shipment.origin_key||'')+' → '+esc(state.shipment.dest_key||'');
  return;
 }
 if(choices.length>1){
  box.classList.remove('gcs-hidden');
  box.innerHTML='<strong>چەند Shipment ـی چالاک بۆ ئەم کڕیارە هەیە؛ ئەوەی پەیوەندی بە ئەم پاکەتەوە هەیە هەڵبژێرە</strong><select id="gcScanShipmentChoice" class="gcs-field" style="margin-top:8px"><option value="">Shipment ـی دروست هەڵبژێرە...</option>'+choices.map(row=>'<option value="'+esc(row.id)+'">'+esc(row.tracking_id||row.tracking_number||row.id)+' · '+esc(row.origin_key||'')+' → '+esc(row.dest_key||'')+'</option>').join('')+'</select>';
  $('#gcScanShipmentChoice').addEventListener('change',event=>{state.shipment=choices.find(row=>String(row.id)===String(event.target.value))||null;saveReady();});
  return;
 }
 box.classList.remove('gcs-hidden');
 box.textContent=rows.length?'Tracking ـەکە لە Shipment ـە چالاکەکانی ئەم کڕیارەدا نەدۆزرایەوە؛ باری دروست لە لیستەکە هەڵبژێرە.':'هیچ Shipment ـی چالاکی پێشوو بۆ ئەم کڕیارە نییە؛ وەسڵەکە بە ناسنامەی کڕیارەوە تۆمار دەکرێت.';
}

function saveReady(){
 const tr=norm($('#gcScanTracking')?.value),code=norm(state.selected?.gc_code||state.selected?.code),count=Number($('#gcScanPackages')?.value||1),w=$('#gcScanWeight')?.value;
 const mismatch=Boolean(state.shipmentMismatch||(state.shipment&&state.selected&&((state.shipment.directory_customer_id&&String(state.shipment.directory_customer_id)!==String(state.selected.id))||(state.shipment.customer_gc_code&&norm(state.shipment.customer_gc_code)!==code))));
 const ambiguous=(state.customerShipments||[]).length>1&&!state.shipment;
 const valid=Boolean(state.selected)&&/^[A-Z0-9._/-]{5,160}$/.test(tr)&&/^GC-[A-Z0-9-]{2,30}$/.test(code)&&Number.isInteger(count)&&count>=1&&count<=999&&(!w||(Number.isFinite(Number(w))&&Number(w)>=0));
 const photo=Boolean(state.photo||$('#gcScanPhoto')?.files?.[0]);
 if($('#gcScanSave'))$('#gcScanSave').disabled=!(valid&&photo&&!state.duplicate.length&&!mismatch&&!ambiguous);
 if(state.selected&&!/^GC-[A-Z0-9-]{2,30}$/.test(code))message('gcScanSaveStatus','ئەم کڕیارە GC Code ـی دروستی نییە؛ ناتوانرێت وەسڵی warehouse پێوە ببەسترێت.','bad');
 else if(ambiguous)message('gcScanSaveStatus','چەند Shipment ـی چالاک هەیە؛ یەکێک هەڵبژێرە تا وەسڵ بە باری دروستەوە ببەسترێت.','bad');
}

async function saveReceipt(){
 saveReady();if($('#gcScanSave').disabled)return;
 const tr=norm($('#gcScanTracking').value),c=state.selected,code=norm(c.gc_code||c.code),photo=$('#gcScanPhoto').files?.[0]||state.photo,btn=$('#gcScanSave');
 btn.disabled=true;btn.textContent='وەسڵ تۆمار دەکرێت…';message('gcScanSaveStatus','دووبارە پشکنینی تراکینگ و ناسنامەی کڕیار…');
 try{
  if((await findDuplicate(tr)).length)throw new Error('ئەم تراکینگ ژمارەیە پێشتر وەسڵی هەیە؛ وەسڵی دووبارە دروست نەکرا.');
  const form=new FormData();form.append('customer_code',code);form.append('customer_phone',c.phone||c.phone2||c.whatsapp_phone||'');form.append('location',$('#gcScanLocation').value);
  form.append('tracking_number',tr);form.append('carrier',$('#gcScanCarrier').value.trim()||'Unknown carrier');form.append('invoice_number',$('#gcScanInvoice').value.trim());form.append('gross_weight_kg',$('#gcScanWeight').value.trim());
  form.append('total_packages',String(Number($('#gcScanPackages').value||1)));form.append('item_summary',$('#gcScanItem').value.trim());form.append('scan_type','barcode');form.append('label_capture_method','camera_barcode');form.append('ocr_text','Tracking barcode: '+tr);form.append('idempotency_key',crypto.randomUUID());
  if(state.shipment?.id)form.append('shipment_id',String(state.shipment.id));form.append('photos',photo,photo.name||'tracking-label.jpg');
  const res=await fetch(API,{method:'POST',headers:{Authorization:'Bearer '+state.session.access_token,apikey:KEY},body:form,cache:'no-store'}),data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||'وەسڵ تۆمار نەکرا.');
  const receipt=data.receipt||{},chain=data.chain||{};
  const chainText=chain.linked?'<br><strong>✓ Shipment پەیوەست کرا:</strong> <span dir="ltr">'+esc(chain.shipment_id)+'</span>':'<br>وەسڵ بە کڕیارەوە بەسترا؛ Shipment بە خۆکارانە نەبەسترا ('+esc(chain.reason||'no shipment match')+').';
  $('#gcScanSuccess').classList.remove('gcs-hidden');$('#gcScanSuccess').innerHTML='<strong>✓ وەسڵ بە سەرکەوتوویی دروست کرا</strong><br>کڕیار: '+esc(c.name)+' · <b dir="ltr">'+esc(code)+'</b><br>Tracking: <b dir="ltr">'+esc(tr)+'</b><br>Receipt: <b dir="ltr">'+esc(receipt.batch_code||receipt.id||'Saved')+'</b>'+chainText;
  message('gcScanSaveStatus','وەسڵ تۆمار کرا و بە ناسنامەی کڕیارەوە بەسترا.','good');state.duplicate=[{id:receipt.id,batch_code:receipt.batch_code,gc_code:code}];btn.textContent='وەسڵ تۆمار کرا';$('#gcScanSuccess').scrollIntoView({behavior:'smooth',block:'nearest'});
 }catch(e){message('gcScanSaveStatus',e.message||'هەڵەیەک لە تۆمارکردنی وەسڵ ڕوویدا.','bad');btn.textContent='دروستکردنی وەسڵ و بەستن بە کڕیار';saveReady();}
}
function reset(){
 stopCamera();state.photo=null;state.selected=null;state.shipment=null;state.shipmentMismatch=false;state.customerShipments=[];state.duplicate=[];
 ['gcScanTracking','gcScanQuery','gcScanWeight','gcScanInvoice','gcScanItem'].forEach(id=>{if($('#'+id))$('#'+id).value='';});
 $('#gcScanCarrier').value='TAG Express';$('#gcScanPackages').value='1';$('#gcScanPhoto').value='';
 $('#gcScanStart').disabled=true;$('#gcScanTracking').disabled=true;$('#gcScanPhoto').disabled=true;
 $('#gcScanCustomers').innerHTML='';$('#gcScanSelected').classList.add('gcs-hidden');$('#gcScanShipment').classList.add('gcs-hidden');$('#gcScanDuplicate').classList.add('gcs-hidden');$('#gcScanSuccess').classList.add('gcs-hidden');
 $('#gcScanPhotoNote').textContent='سەرەتا کڕیار هەڵبژێرە؛ وێنەی سکان وەک بەڵگە هەڵدەگیرێت.';$('#gcScanSave').textContent='دروستکردنی وەسڵ و بەستن بە کڕیار';
 message('gcScanStatus','سەرەتا کڕیاری هەبوو بدۆزەرەوە و هەڵیبژێرە.');message('gcScanSaveStatus','سەرەتا کڕیاری هەبوو بدۆزەرەوە و هەڵیبژێرە.');saveReady();
}

async function openModal(){
 addStyle();makeModal();$('#gcScanModal').classList.add('open');
 try{await getClient();const b=String(state.staff.branch||'all').toLowerCase();$('#gcScanLocation').value=b==='china'?'China':b==='erbil'?'Erbil':'Dubai';$('#gcScanStart').disabled=true;$('#gcScanTracking').disabled=true;$('#gcScanPhoto').disabled=true;message('gcScanStatus','سەرەتا لە بەشی یەکەم کڕیاری هەبوو بدۆزەوە و هەڵیبژێرە؛ پاشان سکانکردن چالاک دەبێت.');saveReady();}
 catch(e){message('gcScanStatus',e.message||'پەیوەندیی ستاف پشتڕاست نەکرایەوە.','bad');}
}
window.gcOpenTrackingIntake = openModal;
function mountLaunchButton(){
 const actions=$('.top-actions');
 if(!actions||$('#gcScanOpen'))return;
 const b=document.createElement('button');b.id='gcScanOpen';b.type='button';b.className='btn tiny';b.textContent='▦ سکانکردنی تراکینگ';b.addEventListener('click',openModal);
 const refresh=$('#refreshBtn',actions);actions.insertBefore(b,refresh||null);
}
function bind(){
 mountLaunchButton();
 const shellObserver=new MutationObserver(()=>mountLaunchButton());
 shellObserver.observe(document.documentElement,{childList:true,subtree:true});
 $('#gcScanClose')?.addEventListener('click',()=>{$('#gcScanModal').classList.remove('open');stopCamera();});
 $('#gcScanModal')?.addEventListener('click',e=>{if(e.target?.id==='gcScanModal'){$('#gcScanModal').classList.remove('open');stopCamera();}});
 $('#gcScanStart')?.addEventListener('click',startCamera);$('#gcScanStop')?.addEventListener('click',stopCamera);
 $('#gcScanSearch')?.addEventListener('click',searchCustomers);$('#gcScanQuery')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchCustomers();}});
 $('#gcScanSave')?.addEventListener('click',saveReceipt);$('#gcScanReset')?.addEventListener('click',reset);
 $('#gcScanTracking')?.addEventListener('change',()=>{state.duplicate=[];state.shipment=null;verifyTracking();});
 $('#gcScanTracking')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#gcScanTracking').dispatchEvent(new Event('change'));}});
 $('#gcScanPhoto')?.addEventListener('change',e=>{state.photo=null;const f=e.target.files?.[0];$('#gcScanPhotoNote').textContent=f?'وێنەی هەڵبژێردراو وەک بەڵگە بەکاردێت.':'وێنەی کامێرا بە شێوەی خۆکار وەک بەڵگە هەڵدەگیرێت.';if(f)decodePhoto(f);saveReady();});
 ['gcScanPackages','gcScanWeight'].forEach(id=>$('#'+id)?.addEventListener('input',saveReady));
 $('#gcScanModal')?.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#gcScanModal').classList.remove('open');stopCamera();}});
}
function init(){addStyle();makeModal();bind();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();