(()=>{'use strict';
const boot=()=>{const db=window.gcSupabase;if(!db)return setTimeout(boot,250);const $=id=>document.getElementById(id);const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const state={staff:[],customers:[],pricing:[],fx:[],me:null};
async function api(kind,action,data={}){const {data:out,error}=await db.functions.invoke('account-admin',{body:{kind,action,data}});if(error)throw new Error(error.message||'Request failed');if(out?.error)throw new Error(out.error);return out}
function modal(title,fields,submitLabel='پاشەکەوت'){const old=document.getElementById('gcAdminModal');if(old)old.remove();const wrap=document.createElement('div');wrap.id='gcAdminModal';wrap.innerHTML=`<div class="gc-modal-backdrop"><div class="gc-modal"><div class="gc-modal-head"><h3>${esc(title)}</h3><button type="button" data-close>×</button></div><form id="gcAdminForm"><div class="gc-form-grid">${fields.map(f=>`<label>${esc(f.label)}${f.type==='select'?`<select name="${esc(f.name)}">${f.options.map(o=>`<option value="${esc(o.value)}" ${String(o.value)===String(f.value??'')?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`:`<input name="${esc(f.name)}" type="${f.type||'text'}" value="${esc(f.value??'')}" placeholder="${esc(f.placeholder||'')}" ${f.required?'required':''}>`}</label>`).join('')}</div><div id="gcAdminError" class="gc-error" role="alert"></div><div class="gc-modal-actions"><button type="button" class="btn" data-close>داخستن</button><button class="btn primary">${esc(submitLabel)}</button></div></form></div></div>`;document.body.appendChild(wrap);wrap.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>wrap.remove());return wrap.querySelector('form')}
function style(){if(document.getElementById('gcLiveControlCss'))return;const s=document.createElement('style');s.id='gcLiveControlCss';s.textContent=`.gc-controlbar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}.gc-mini{padding:7px 10px!important;font-size:11px!important}.gc-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9999;display:grid;place-items:center;padding:18px}.gc-modal{width:min(860px,100%);max-height:92vh;overflow:auto;background:#081827;border:1px solid #244664;border-radius:20px;padding:20px;box-shadow:0 30px 100px rgba(0,0,0,.55);color:#fff}.gc-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}.gc-modal-head h3{margin:0}.gc-modal-head button{border:0;background:transparent;color:#fff;font-size:28px;cursor:pointer}.gc-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.gc-form-grid label{display:grid;gap:6px;color:#a9bdd4;font-size:12px;font-weight:700}.gc-form-grid input,.gc-form-grid select{width:100%;padding:11px;border-radius:10px;border:1px solid #294964;background:#061320;color:#fff}.gc-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.gc-error{color:#ff8995;min-height:20px;margin-top:10px;font-size:12px}@media(max-width:600px){.gc-form-grid{grid-template-columns:1fr}.gc-modal{padding:16px}}`;document.head.appendChild(s)}
function addBar(tab,html){const el=$(tab);if(!el||el.querySelector('.gc-controlbar'))return null;const bar=document.createElement('div');bar.className='gc-controlbar';bar.innerHTML=html;el.querySelector('.panel')?.prepend(bar);return bar}
async function refreshStaff(){const out=await api('staff','list');state.staff=out.items||[];renderStaff()}
function renderStaff(){const body=$('staffRows');if(!body)return;const term=($('staffSearch')?.value||'').trim().toLowerCase();const branch=$('staffBranch')?.value||'all';const rows=state.staff.filter(x=>(branch==='all'||x.branch===branch)&&(!term||`${x.full_name||''} ${x.role||''} ${x.branch||''}`.toLowerCase().includes(term)));body.innerHTML=rows.map(x=>`<tr><td>${esc(x.full_name||'—')}</td><td>${esc(x.role||'—')}</td><td>${esc(x.branch||'—')}</td><td class="${x.is_active?'ok':'bad'}">${x.is_active?'ACTIVE':'INACTIVE'}</td><td>${esc(x.updated_at||'—')}</td><td><button class="btn gc-mini" data-edit-staff="${esc(x.id)}">دەستکاری</button> <button class="btn gc-mini" data-toggle-staff="${esc(x.id)}" data-active="${x.is_active}">${x.is_active?'ناچالاککردن':'چالاککردن'}</button> <button class="btn gc-mini" data-delete-staff="${esc(x.id)}">سڕینەوە</button></td></tr>`).join('')||'<tr><td colspan="6">No staff</td></tr>'}
function staffForm(existing={}){const form=modal(existing.id?'دەستکاری ستاف':'دروستکردنی ئەکاونتی ستاف',[{name:'full_name',label:'ناو',value:existing.full_name,required:true},{name:'email',label:'Email',value:existing.email,required:!existing.id,type:'email'},{name:'password',label:'Password',placeholder:existing.id?'بەتاڵ بهێڵە بۆ نەگۆڕین':'Password ـی نوێ',type:'password',required:!existing.id},{name:'role',label:'Role',value:existing.role||'warehouse',type:'select',options:['admin','accountant','super_admin','finance','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','driver','delivery'].map(x=>({value:x,label:x}))},{name:'branch',label:'Branch',value:existing.branch||'all',type:'select',options:['all','china','dubai','erbil'].map(x=>({value:x,label:x}))},{name:'is_active',label:'Status',value:existing.is_active!==false?'true':'false',type:'select',options:[{value:'true',label:'ACTIVE'},{value:'false',label:'INACTIVE'}]}]);form.onsubmit=async e=>{e.preventDefault();const error=$('gcAdminError');const data=Object.fromEntries(new FormData(form));data.is_active=data.is_active==='true';if(!data.password)delete data.password;error.textContent='لە پاشەکەوتکردندایە…';try{await api('staff',existing.id?'update':'create',existing.id?{...data,id:existing.id}:{...data,send_invite:false});form.closest('#gcAdminModal').remove();await refreshStaff();window.alert(existing.id?'ستاف نوێکرایەوە ✓':'ئەکاونت دروستکرا ✓')}catch(err){error.textContent=err.message||'Staff operation failed'}}}
async function staffAction(id,action){if(id===state.me?.id)return alert('ناتوانیت حسابی خۆت بگۆڕیت.');if(!confirm(action==='delete'?'دڵنیایت لە سڕینەوە/ناچالاککردنی ئەم ستافە؟':'دڵنیایت؟'))return;try{if(action==='delete')await api('staff','delete',{id});else await api('staff','update',{id,is_active:action==='activate'});await refreshStaff()}catch(e){alert(e.message)}}
async function loadCustomers(){try{const out=await api('customer','list');state.customers=out.items||[];renderCustomers()}catch(e){const body=$('customerRows');if(body)body.innerHTML=`<tr><td colspan="8">${esc(e.message)}</td></tr>`}}
function renderCustomers(){const body=$('customerRows');if(!body)return;const term=($('customerSearch')?.value||'').trim().toLowerCase();const rows=state.customers.filter(x=>!term||`${x.code||x.gc_code||''} ${x.name||''} ${x.phone||''}`.toLowerCase().includes(term));body.innerHTML=rows.map(x=>`<tr><td class="mono">${esc(x.code||x.gc_code||'—')}</td><td>${esc(x.name||'—')}</td><td>${esc(x.phone||'—')}</td><td>${esc(x.city||'—')}</td><td>${esc(x.shipment_count??0)}</td><td>${esc(Number(x.outstanding_amount||0).toFixed(2))}</td><td class="${x.is_active?'ok':'bad'}">${x.is_active?'ACTIVE':'INACTIVE'}</td><td><button class="btn gc-mini" data-edit-customer="${esc(x.id)}">دەستکاری</button> <button class="btn gc-mini" data-toggle-customer="${esc(x.id)}" data-active="${x.is_active}">${x.is_active?'ناچالاککردن':'چالاککردن'}</button></td></tr>`).join('')||'<tr><td colspan="8">هیچ کڕیارێک نەدۆزرایەوە.</td></tr>'}
function customerForm(existing={}){const form=modal(existing.id?'دەستکاری کڕیار':'دروستکردنی کڕیار',[{name:'name',label:'ناوی کڕیار',value:existing.name,required:true},{name:'code',label:'GC Code',value:existing.code||existing.gc_code,placeholder:'GC-701'},{name:'phone',label:'مۆبایل',value:existing.phone},{name:'phone2',label:'مۆبایلی دووەم',value:existing.phone2},{name:'email',label:'Email',value:existing.email,type:'email'},{name:'city',label:'شار',value:existing.city||'Erbil'},{name:'delivery_location',label:'شوێنی گەیاندن',value:existing.delivery_location},{name:'note',label:'تێبینی',value:existing.note},{name:'is_active',label:'Status',value:existing.is_active!==false?'true':'false',type:'select',options:[{value:'true',label:'ACTIVE'},{value:'false',label:'INACTIVE'}]}]);form.onsubmit=async e=>{e.preventDefault();const error=$('gcAdminError');const data=Object.fromEntries(new FormData(form));data.is_active=data.is_active==='true';if(data.code)data.code=data.code.trim().toUpperCase();error.textContent='لە پاشەکەوتکردندایە…';try{await api('customer',existing.id?'update':'create',existing.id?{...data,id:existing.id}:{...data});form.closest('#gcAdminModal').remove();await loadCustomers();window.alert(existing.id?'کڕیار نوێکرایەوە ✓':'کڕیار دروستکرا ✓')}catch(err){error.textContent=err.message||'Customer operation failed'}}}
async function customerAction(id,active){try{await api('customer','update',{id,is_active:!active});await loadCustomers()}catch(e){alert(e.message)}}
function editStaff(id){const row=state.staff.find(x=>x.id===id);if(row)staffForm(row)}
function editCustomer(id){const row=state.customers.find(x=>x.id===id);if(row)customerForm(row)}
async function loadPricing(){try{const out=await api('pricing','list');state.pricing=out.rates||[];state.fx=out.exchange_rates||[];const usd=state.fx.find(x=>x.base_currency==='USD'&&x.quote_currency==='IQD');if(usd&&$('rate'))$('rate').value=usd.rate;renderPricing()}catch(e){if($('rateMsg'))$('rateMsg').textContent=e.message}}
function renderPricing(){
 const finance=$('finance'); if(!finance)return;
 $('gcPricingPanel')?.remove();
 const p=document.createElement('div');
 p.id='gcPricingPanel'; p.className='panel'; p.style.marginTop='14px';
 const rows=state.pricing.map(r=>{
   const transit=(r.transit_min_days==null?'—':esc(r.transit_min_days))+'–'+(r.transit_max_days==null?'—':esc(r.transit_max_days));
   return '<tr><td>'+esc(r.origin_key)+' → '+esc(r.destination_key)+'</td><td>'+esc(String(r.transport_mode||'').toUpperCase())+'</td><td>'+esc(r.product_type)+'</td><td>'+esc(r.unit)+'</td><td>'+esc(r.amount)+' '+esc(r.currency)+'</td><td>'+transit+'</td><td class="'+(r.is_active?'ok':'bad')+'">'+(r.is_active?'ACTIVE':'INACTIVE')+'</td><td><button class="btn gc-mini" data-edit-price="'+esc(r.id)+'">دەستکاری</button> <button class="btn gc-mini" data-toggle-price="'+esc(r.id)+'" data-active="'+String(Boolean(r.is_active))+'">'+(r.is_active?'ناچالاککردن':'چالاککردن')+'</button></td></tr>';
 }).join('');
 p.innerHTML='<div class="panel-head"><div><h3>ڕێکخستنی نرخی گواستنەوە</h3><p>China / USA / Dubai → Erbil · نرخە نوێکان بە effective date تۆمار دەکرێن.</p></div><div class="gc-controlbar"><button class="btn primary" id="gcAddRate">+ زیادکردنی نرخ</button><button class="btn" id="gcRefreshPricingList">نوێکردنەوە</button></div></div><div class="table-wrap"><table><thead><tr><th>Origin → Destination</th><th>Mode</th><th>Product</th><th>Unit</th><th>Rate</th><th>Transit days</th><th>Status</th><th>Action</th></tr></thead><tbody>'+ (rows||'<tr><td colspan="8">هیچ نرخێک نییە؛ نرخێکی نوێ زیاد بکە.</td></tr>') +'</tbody></table></div>';
 finance.appendChild(p);
 $('gcAddRate').onclick=()=>pricingForm();
 $('gcRefreshPricingList').onclick=loadPricing;
}
function pricingForm(existing={}){
 const today=new Date().toISOString().slice(0,10);
 const form=modal(existing.id?'دەستکاری نرخی گواستنەوە':'زیادکردنی نرخی گواستنەوە',[
  {name:'origin_key',label:'Origin',value:existing.origin_key||'China',required:true},
  {name:'destination_key',label:'Destination',value:existing.destination_key||'Erbil',required:true},
  {name:'transport_mode',label:'Transport mode',value:existing.transport_mode||'air',type:'select',options:['air','sea','land'].map(x=>({value:x,label:x.toUpperCase()}))},
  {name:'product_type',label:'جۆری کاڵا',value:existing.product_type||'General goods',required:true},
  {name:'unit',label:'یەکە',value:existing.unit||'kg',type:'select',options:[{value:'kg',label:'KG'},{value:'cbm',label:'CBM'}]},
  {name:'amount',label:'نرخ',value:existing.amount??'',type:'number',required:true},
  {name:'currency',label:'دراو',value:existing.currency||'USD',type:'select',options:['USD','IQD','AED','CNY'].map(x=>({value:x,label:x}))},
  {name:'transit_min_days',label:'کەمترین ڕۆژ',value:existing.transit_min_days??'',type:'number'},
  {name:'transit_max_days',label:'زۆرترین ڕۆژ',value:existing.transit_max_days??'',type:'number'},
  {name:'effective_from',label:'دەستپێکردن',value:existing.effective_from||today,type:'date',required:true},
  {name:'effective_to',label:'کۆتایی (ئارەزوومەندانە)',value:existing.effective_to||'',type:'date'},
  {name:'is_active',label:'دۆخ',value:existing.is_active===false?'false':'true',type:'select',options:[{value:'true',label:'چالاک'},{value:'false',label:'ناچالاک'}]},
  {name:'notes',label:'تێبینی',value:existing.notes||''}
 ]);
 form.onsubmit=async e=>{
  e.preventDefault();
  const error=$('gcAdminError');
  const data=Object.fromEntries(new FormData(form));
  data.amount=Number(data.amount);
  data.transit_min_days=data.transit_min_days===''?null:Number(data.transit_min_days);
  data.transit_max_days=data.transit_max_days===''?null:Number(data.transit_max_days);
  data.effective_to=data.effective_to||null;
  data.is_active=data.is_active==='true';
  if(!Number.isFinite(data.amount)||data.amount<0){error.textContent='نرخ دەبێت ژمارەیەکی دروست و نا-نەرێنی بێت.';return}
  if(data.transit_min_days!==null&&(!Number.isInteger(data.transit_min_days)||data.transit_min_days<0)){error.textContent='کەمترین ڕۆژ دەبێت ژمارەی تەواو بێت.';return}
  if(data.transit_max_days!==null&&(!Number.isInteger(data.transit_max_days)||data.transit_max_days<0||(data.transit_min_days!==null&&data.transit_max_days<data.transit_min_days))){error.textContent='زۆرترین ڕۆژ دروست نییە.';return}
  error.textContent='لە پاشەکەوتکردندایە…';
  try{
   await api('pricing',existing.id?'update':'create',existing.id?Object.assign({},data,{id:existing.id}):data);
   form.closest('#gcAdminModal').remove();
   await loadPricing();
   window.alert(existing.id?'نرخ نوێکرایەوە ✓':'نرخی نوێ زیادکرا ✓');
  }catch(err){error.textContent=err.message||'Pricing save failed'}
 };
}
async function togglePricing(id,active){
 const row=state.pricing.find(x=>x.id===id); if(!row)return;
 if(!window.confirm(active?'دڵنیایت ئەم نرخە ناچالاک بکەیت؟':'دڵنیایت ئەم نرخە چالاک بکەیت؟'))return;
 try{await api('pricing','update',{id,amount:Number(row.amount),is_active:!active});await loadPricing()}
 catch(e){window.alert(e.message||'Pricing status update failed')}
}
function wire(){style();
 let b=addBar('staff','<button class="btn primary" id="gcAddStaff">+ زیادکردنی ستاف</button><button class="btn" id="gcRefreshStaff">نوێکردنەوە</button>');
 if(b){$('gcAddStaff').onclick=()=>staffForm();$('gcRefreshStaff').onclick=refreshStaff}
 $('staffRows')?.addEventListener('click',e=>{const x=e.target.closest('button');if(!x)return;if(x.dataset.editStaff)editStaff(x.dataset.editStaff);if(x.dataset.toggleStaff)staffAction(x.dataset.toggleStaff,x.dataset.active==='true'?'deactivate':'activate');if(x.dataset.deleteStaff)staffAction(x.dataset.deleteStaff,'delete')});
 b=addBar('customers','<button class="btn primary" id="gcAddCustomer">+ زیادکردنی کڕیار</button><button class="btn" id="gcRefreshCustomer">نوێکردنەوە</button>');
 if(b){$('gcAddCustomer').onclick=()=>customerForm();$('gcRefreshCustomer').onclick=loadCustomers}
 $('gcAddCustomerHeader')?.addEventListener('click',()=>customerForm());
 $('customerRows')?.addEventListener('click',e=>{const x=e.target.closest('button');if(!x)return;if(x.dataset.editCustomer)editCustomer(x.dataset.editCustomer);if(x.dataset.toggleCustomer)customerAction(x.dataset.toggleCustomer,x.dataset.active==='true')});
 $('customerSearch')?.addEventListener('input',renderCustomers);
 b=addBar('finance','<button class="btn" id="gcRefreshPricing">نوێکردنەوەی هەموو نرخەکان</button>');
 if(b)$('gcRefreshPricing').onclick=loadPricing;
 document.addEventListener('click',e=>{
  const x=e.target.closest('button');if(!x)return;
  if(x.dataset.editPrice)pricingForm(state.pricing.find(r=>r.id===x.dataset.editPrice)||{});
  if(x.dataset.togglePrice)togglePricing(x.dataset.togglePrice,x.dataset.active==='true');
 });
 Promise.resolve(db.auth.getSession()).then(({data})=>{state.me=data.session?.user||null;return Promise.all([loadPricing(),refreshStaff(),loadCustomers()])}).catch(e=>console.warn('super admin control boot',e));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();};boot();})();