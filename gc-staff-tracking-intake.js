(() => {
'use strict';
const URL='https://ahslifnthiwfkmaswjno.supabase.co';
const KEY='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
const API=URL+'/functions/v1/warehouse-receiving';
const ROLES=['admin','super_admin','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','delivery'];
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').normalize('NFKC').toUpperCase().replace(/\s+/g,'').trim();
const state={db:null,session:null,staff:null,reader:null,controls:null,photo:null,selected:null,shipment:null,duplicate:[]};

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
 '<header class="gcs-head"><div><div class="gcs-kicker">GLOBALL CLOUD · TRACKING INTAKE</div><h2>سکانی تراکینگ و بەستنی وەسڵ</h2><p>بارکۆد سکان بکە، کڕیاری هەبوو بدۆزەرەوە، پاشان وەسڵی کۆگا بەو کڕیارەوە ببەستە</p></div><button class="gcs-close" id="gcScanClose" type="button">×</button></header>',
 '<div class="gcs-grid">',
 '<section class="gcs-card"><h3>١. سکانکردنی تراکینگ</h3><div class="gcs-video"><video id="gcScanVideo" autoplay muted playsinline></video><div class="gcs-frame"></div></div>',
 '<div class="gcs-actions"><button class="gcs-btn primary" id="gcScanStart" type="button">کامێرا بکەرەوە و سکان بکە</button><button class="gcs-btn" id="gcScanStop" type="button" disabled>وەستاندن</button></div>',
 '<div class="gcs-status" id="gcScanStatus" role="status" aria-live="polite">بارکۆدی 1D / Code 128 یان QR لەبەردەم کامێرا دابنێ</div>',
 '<label class="gcs-label" for="gcScanTracking">Tracking Number</label><input class="gcs-field" id="gcScanTracking" dir="ltr" placeholder="JTE30053866832" autocomplete="off">',
 '<label class="gcs-label" for="gcScanPhoto">وێنەی پاکەت / لیبڵ (ئەگەر وێنەی کامێرا نەگیرا)</label><input class="gcs-field" id="gcScanPhoto" type="file" accept="image/*" capture="environment"><div class="gcs-note" id="gcScanPhotoNote">وێنەی کامێرا بە شێوەی خۆکار وەک بەڵگە هەڵدەگیرێت.</div>',
 '<div id="gcScanDuplicate" class="gcs-alert gcs-hidden"></div></section>',
 '<section class="gcs-card"><h3>٢. گەڕان بۆ کڕیاری هەبوو</h3><label class="gcs-label" for="gcScanQuery">GC Code / ناو / ژمارەی مۆبایل</label><input class="gcs-field" id="gcScanQuery" placeholder="GC-338 یان 0770... یان ناوی کڕیار" autocomplete="off">',
 '<div class="gcs-actions"><button class="gcs-btn" id="gcScanSearch" type="button">گەڕان لە کڕیارە هەبووەکان</button></div><div class="gcs-list" id="gcScanCustomers"></div><div class="gcs-selected gcs-hidden" id="gcScanSelected"></div><div class="gcs-alert gcs-hidden" id="gcScanShipment"></div></section>',
 '</div>',
 '<section class="gcs-card" style="margin-top:11px"><h3>٣. دروستکردنی وەسڵی کۆگا</h3><div class="gcs-fields">',
 '<label><span class="gcs-label">شوێنی وەرگرتن</span><select class="gcs-field" id="gcScanLocation"><option value="Dubai">Dubai / UAE</option><option value="China">China</option><option value="Erbil">Erbil</option></select></label>',
 '<label><span class="gcs-label">کۆمپانیای گواستنەوە</span><input class="gcs-field" id="gcScanCarrier" value="TAG Express"></label>',
 '<label><span class="gcs-label">کێش (KG)</span><input class="gcs-field" id="gcScanWeight" type="number" min="0" step="0.001" placeholder="1.910"></label>',
 '<label><span class="gcs-label">ژمارەی پاکێج</span><input class="gcs-field" id="gcScanPackages" type="number" min="1" max="999" value="1"></label>',
 '<label><span class="gcs-label">Invoice No.</span><input class="gcs-field" id="gcScanInvoice" placeholder="ژمارەی فاتورە"></label>',
 '<label><span class="gcs-label">ناوی کاڵا</span><input class="gcs-field" id="gcScanItem" placeholder="Clothes / Accessories"></label></div>',
 '<div class="gcs-actions"><button class="gcs-btn primary" id="gcScanSave" type="button" disabled>دروستکردنی وەسڵ و بەستن بە کڕیار</button><button class="gcs-btn" id="gcScanReset" type="button">پاککردنەوە</button></div>',
 '<div class="gcs-status" id="gcScanSaveStatus">سەرەتا تراکینگ سکان بکە و کڕیارێکی هەبوو هەڵبژێرە.</div><div class="gcs-success gcs-hidden" id="gcScanSuccess"></div></section>',
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
 state.shipment=null;const box=$('#gcScanShipment');box.classList.add('gcs-hidden');
 try{
  const cols='id,tracking_id,tracking_number,external_reference,directory_customer_id,customer_gc_code,customer_name,status,operational_status';
  const results=await Promise.all([
   state.db.from('shipments').select(cols).eq('tracking_number',tracking).limit(4),
   state.db.from('shipments').select(cols).eq('tracking_id',tracking).limit(4),
   state.db.from('shipments').select(cols).eq('external_reference',tracking).limit(4)
  ]);
  results.forEach(x=>{if(x.error)throw x.error;});const rows=new Map();
  for(const r of results)for(const x of r.data||[])rows.set(String(x.id),x);
  if(rows.size===1){
   state.shipment=[...rows.values()][0];const sh=state.shipment;let customer=null;
   if(sh.directory_customer_id){const r=await state.db.from('customer_directory').select('id,code,gc_code,name,phone,phone2,whatsapp_phone,city,is_active,auth_user_id').eq('id',sh.directory_customer_id).maybeSingle();if(r.error)throw r.error;customer=r.data;}
   else if(sh.customer_gc_code){const r=await state.db.from('customer_directory').select('id,code,gc_code,name,phone,phone2,whatsapp_phone,city,is_active,auth_user_id').eq('gc_code',sh.customer_gc_code).maybeSingle();if(r.error)throw r.error;customer=r.data;}
   if(customer?.is_active)selectCustomer(customer,true);
   box.classList.remove('gcs-hidden');box.innerHTML='<strong>Shipment ـی هاوتا دۆزرایەوە</strong><br><span dir="ltr">'+esc(sh.id)+'</span> · '+esc(sh.customer_name||customer?.name||'—');
  }else if(rows.size>1){box.classList.remove('gcs-hidden');box.textContent='زیاتر لە یەک Shipment هەیە؛ بەستن بە خۆکارانە ناکرێت.';}
 }catch(e){box.classList.remove('gcs-hidden');box.textContent='پشکنینی Shipment: '+(e.message||'بەردەست نییە');}
}
async function verifyTracking(){
 const tracking=norm($('#gcScanTracking').value);$('#gcScanTracking').value=tracking;
 if(!/^[A-Z0-9._/-]{5,160}$/.test(tracking)){state.duplicate=[];state.shipment=null;saveReady();return;}
 setMsg('gcScanStatus','پشکنینی تراکینگ لە وەسڵ و Shipment ـە هەبووەکاندا…');
 await Promise.all([findDuplicate(tracking),findShipment(tracking)]);
 setMsg('gcScanStatus',state.duplicate.length?'ئەم تراکینگ ژمارەیە پێشتر تۆمار کراوە.':'تراکینگ ژمارەکە ئامادەیە؛ ئێستا کڕیار هەڵبژێرە.',state.duplicate.length?'bad':'good');saveReady();
}
async function searchCustomers(){
 const q=String($('#gcScanQuery').value||'').trim();if(q.length<2){$('#gcScanCustomers').textContent='لانیکەم دوو پیت یان ژمارە بنووسە.';return;}
 const safe=q.replace(/[,%()]/g,' ').trim(),fields=['gc_code','code','name','phone','phone2','whatsapp_phone'];
 $('#gcScanCustomers').innerHTML='<div class="gcs-note">لە کڕیارە هەبووەکاندا دەگەڕێم…</div>';
 try{
  const cols='id,code,gc_code,name,phone,phone2,whatsapp_phone,email,city,delivery_location,is_active,auth_user_id';
  const res=await Promise.all(fields.map(f=>state.db.from('customer_directory').select(cols).eq('is_active',true).ilike(f,'%'+safe+'%').limit(8)));
  res.forEach(x=>{if(x.error)throw x.error;});const byId=new Map();for(const r of res)for(const c of r.data||[])byId.set(String(c.id),c);
  const customers=[...byId.values()].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
  if(!customers.length){$('#gcScanCustomers').textContent='هیچ کڕیاری چالاک بەم زانیارییە نەدۆزرایەوە.';return;}
  $('#gcScanCustomers').innerHTML=customers.map(c=>'<button class="gcs-customer" type="button" data-customer="'+esc(c.id)+'"><strong>'+esc(c.name||'کڕیاری بێ ناو')+' · <span dir="ltr">'+esc(c.gc_code||c.code||'GC code نییە')+'</span></strong><span dir="ltr">'+esc(c.phone||c.phone2||c.whatsapp_phone||'ژمارەی مۆبایل نییە')+'</span><span>'+esc(c.city||c.delivery_location||'')+'</span></button>').join('');
  $('#gcScanCustomers').querySelectorAll('[data-customer]').forEach(b=>b.addEventListener('click',()=>{const c=customers.find(x=>String(x.id)===b.dataset.customer);if(c)selectCustomer(c,false);}));
 }catch(e){$('#gcScanCustomers').innerHTML='<div class="gcs-status bad">'+esc(e.message||'گەڕان سەرکەوتوو نەبوو.')+'</div>';}
}
function selectCustomer(c,automatic){
 if(!c||c.is_active!==true){message('gcScanSaveStatus','تەنها کڕیاری چالاک دەتوانرێت هەڵبژێردرێت.','bad');return;}
 state.selected=c;const code=norm(c.gc_code||c.code),box=$('#gcScanSelected');box.classList.remove('gcs-hidden');
 box.innerHTML='<strong>'+(automatic?'کڕیاری پەیوەست بە Shipment دۆزرایەوە':'کڕیار هەڵبژێردرا')+'</strong><br>'+esc(c.name||'—')+'<br><b dir="ltr">'+esc(code||'GC Code نییە')+'</b><br><span dir="ltr">'+esc(c.phone||c.phone2||'—')+'</span>';
 const mismatch=state.shipment&&((state.shipment.directory_customer_id&&String(state.shipment.directory_customer_id)!==String(c.id))||(state.shipment.customer_gc_code&&norm(state.shipment.customer_gc_code)!==code));
 message('gcScanSaveStatus',mismatch?'ئەم Shipment ـە بە کڕیارێکی ترەوە بەستراوەتەوە؛ بەستن قەدەغەیە.':'کڕیاری هەبوو پشتڕاست کرا. وەسڵەکە بە GC Code ـەکەی دەبەسترێتەوە.',mismatch?'bad':'good');saveReady();
}
function saveReady(){
 const tr=norm($('#gcScanTracking')?.value),code=norm(state.selected?.gc_code||state.selected?.code),count=Number($('#gcScanPackages')?.value||1),w=$('#gcScanWeight')?.value;
 const mismatch=Boolean(state.shipment&&state.selected&&((state.shipment.directory_customer_id&&String(state.shipment.directory_customer_id)!==String(state.selected.id))||(state.shipment.customer_gc_code&&norm(state.shipment.customer_gc_code)!==code)));
 const valid=/^[A-Z0-9._/-]{5,160}$/.test(tr)&&/^GC-[A-Z0-9-]{2,30}$/.test(code)&&Number.isInteger(count)&&count>=1&&count<=999&&(!w||(Number.isFinite(Number(w))&&Number(w)>=0));
 const photo=Boolean(state.photo||$('#gcScanPhoto')?.files?.[0]);
 if($('#gcScanSave'))$('#gcScanSave').disabled=!(valid&&photo&&state.selected&&!state.duplicate.length&&!mismatch);
 if(state.selected&&!/^GC-[A-Z0-9-]{2,30}$/.test(code))message('gcScanSaveStatus','ئەم کڕیارە GC Code ـی دروستی نییە؛ ناتوانرێت وەسڵی warehouse پێوە ببەسترێت.','bad');
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
 stopCamera();state.photo=null;state.selected=null;state.shipment=null;state.duplicate=[];
 ['gcScanTracking','gcScanQuery','gcScanWeight','gcScanInvoice','gcScanItem'].forEach(id=>{if($('#'+id))$('#'+id).value='';});
 $('#gcScanCarrier').value='TAG Express';$('#gcScanPackages').value='1';$('#gcScanPhoto').value='';
 $('#gcScanCustomers').innerHTML='';$('#gcScanSelected').classList.add('gcs-hidden');$('#gcScanShipment').classList.add('gcs-hidden');$('#gcScanDuplicate').classList.add('gcs-hidden');$('#gcScanSuccess').classList.add('gcs-hidden');
 $('#gcScanPhotoNote').textContent='وێنەی کامێرا بە شێوەی خۆکار وەک بەڵگە هەڵدەگیرێت.';$('#gcScanSave').textContent='دروستکردنی وەسڵ و بەستن بە کڕیار';
 message('gcScanStatus','بارکۆدی 1D / Code 128 یان QR لەبەردەم کامێرا دابنێ');message('gcScanSaveStatus','سەرەتا تراکینگ سکان بکە و کڕیارێکی هەبوو هەڵبژێرە.');saveReady();
}
async function openModal(){
 addStyle();makeModal();$('#gcScanModal').classList.add('open');
 try{await getClient();const b=String(state.staff.branch||'all').toLowerCase();$('#gcScanLocation').value=b==='china'?'China':b==='erbil'?'Erbil':'Dubai';message('gcScanStatus','تراکینگ سکان بکە؛ پاشان کڕیاری هەبوو بدۆزەرەوە.');saveReady();}
 catch(e){message('gcScanStatus',e.message||'پەیوەندیی ستاف پشتڕاست نەکرایەوە.','bad');}
}
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
 $('#gcScanTracking')?.addEventListener('change',()=>{state.duplicate=[];state.shipment=null;state.selected=null;$('#gcScanSelected').classList.add('gcs-hidden');verifyTracking();});
 $('#gcScanTracking')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#gcScanTracking').dispatchEvent(new Event('change'));}});
 $('#gcScanPhoto')?.addEventListener('change',e=>{state.photo=null;const f=e.target.files?.[0];$('#gcScanPhotoNote').textContent=f?'وێنەی هەڵبژێردراو وەک بەڵگە بەکاردێت.':'وێنەی کامێرا بە شێوەی خۆکار وەک بەڵگە هەڵدەگیرێت.';if(f)decodePhoto(f);saveReady();});
 ['gcScanPackages','gcScanWeight'].forEach(id=>$('#'+id)?.addEventListener('input',saveReady));
 $('#gcScanModal')?.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#gcScanModal').classList.remove('open');stopCamera();}});
}
function init(){addStyle();makeModal();bind();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();