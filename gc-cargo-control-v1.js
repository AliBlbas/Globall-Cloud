(() => {
  'use strict';
  const GC_CARGO_BUILD = '2026-10-16.2';
  const TAB = 'cargo-workspace';
  const STATUS = ['received_origin','in_transit','at_transit_hub','customs','out_for_delivery','delivered','on_hold','cancelled'];
  const STATUS_LABEL = {
    received_origin:'لە بنکە وەرگیراوە', in_transit:'لە ڕێگایە', at_transit_hub:'لە هەڵگرتنی ناوەندییە',
    customs:'گومرک', out_for_delivery:'بۆ گەیاندن', delivered:'گەیشتووە', on_hold:'وەستێنراوە', cancelled:'هەڵوەشێنراوە'
  };
  const MODE_LABEL = {air:'ئاسمانی',land:'وشکانی',sea:'دەریایی'};
  const SHIPPED = new Set(['in_transit','at_transit_hub','customs','out_for_delivery','delivered']);
  const state = {client:null, identity:null, active:false, shipments:[], customers:[], cargo:[], filter:'shipped', mode:'all', search:'', loading:false};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = v => Number(v || 0).toLocaleString('en-US',{maximumFractionDigits:3});
  const money = (v,c='USD') => Number(v || 0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+c;
  const fmtDate = v => v ? new Date(v).toLocaleString('ku-IQ',{dateStyle:'medium',timeStyle:'short'}) : '—';
  const localInputDate = v => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2,'0');
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
  };
  const codeOf = c => String((c && (c.gc_code || c.normalized_gc_code || c.code)) || '').normalize('NFKC').toUpperCase().replace(/[–—−]/g,'-').replace(/\s+/g,'');
  const activeRoot = () => document.querySelector('.gc-shell');
  const view = () => document.getElementById('view');
  const client = () => state.client || window.gcSupabase || window.sb || null;
  const notify = (message, bad=false) => {
    let el=document.getElementById('gcCargoToast');
    if(!el){el=document.createElement('div');el.id='gcCargoToast';el.className='gc-cargo-toast';document.body.appendChild(el);}
    el.textContent=message;el.dataset.kind=bad?'bad':'ok';el.classList.add('is-visible');
    clearTimeout(el._gcTimer);el._gcTimer=setTimeout(()=>el.classList.remove('is-visible'),3600);
  };
  function injectNav() {
    const nav = document.querySelector('.gc-side .nav');
    if (!nav || nav.querySelector('[data-cargo-cmd-nav]')) return;
    const b = document.createElement('button');
    b.type='button'; b.className='nav-btn gc-cargo-nav-btn'; b.setAttribute('data-tab',TAB); b.setAttribute('data-cargo-cmd-nav','1');
    b.innerHTML='<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z"/><path d="M3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5"/></svg></span><span>بار و کاڵا</span>';
    const shipmentsButton = nav.querySelector('[data-tab="shipments"]');
    if (shipmentsButton) shipmentsButton.after(b); else nav.appendChild(b);
  }
  function setTitle() {
    const t=document.getElementById('pageTitle'), s=document.getElementById('pageSub');
    if(t)t.textContent='کۆنترۆڵی بار و کاڵا';
    if(s)s.textContent='GC Code · بۆکس · PC · کیلۆ · گواستنەوە · پارە · مێژووی بار';
  }
  function deactiveOtherTabs() {
    document.querySelectorAll('.gc-side .nav-btn').forEach(b=>b.classList.toggle('active',b.hasAttribute('data-cargo-cmd-nav')));
  }
  function mount() {
    const root=activeRoot();
    if(!root) return false;
    injectNav();
    state.client=client();
    state.identity=window.gcStaffIdentity||null;
    if(!state.client || !state.identity || !state.identity.id) return false;
    return true;
  }
  function totalsFor(shipment) {
    const rows=state.cargo.filter(x=>String(x.shipment_id)===String(shipment.id));
    if(rows.length) return {
      rows, boxes:rows.reduce((a,x)=>a+Number(x.box_count||0),0),
      pcs:rows.reduce((a,x)=>a+Number(x.quantity_pc||0),0),
      kg:rows.reduce((a,x)=>a+Number(x.weight_kg||0),0)
    };
    return {rows:[],boxes:Number(shipment.box_count || shipment.carton_count || 0),pcs:Number(shipment.pc_count || shipment.items_count || 0),kg:Number(shipment.actual_weight_kg || shipment.weight_kg || 0)};
  }
  function calcSummary(rows) {
    return rows.reduce((a,r)=>({boxes:a.boxes+Number(r.box_count||0),pcs:a.pcs+Number(r.quantity_pc||0),kg:a.kg+Number(r.weight_kg||0)}),{boxes:0,pcs:0,kg:0});
  }
  function listMarkup() {
    const q=state.search.trim().toLowerCase();
    const rows=state.shipments.filter(s=>{
      const total=totalsFor(s);
      const content=total.rows.map(x=>x.item_name).join(' ');
      const searchable=[s.customer_gc_code,s.tracking_id,s.tracking_number,s.customer_name,s.origin,s.destination,s.origin_key,s.dest_key,s.cargo_description,content].join(' ').toLowerCase();
      const statusOk=state.filter==='all'||(state.filter==='shipped'?(SHIPPED.has(String(s.status||''))||Boolean(s.dispatched_at||(s.step_dates&&s.step_dates.departed))):String(s.status||'')===state.filter);
      const mode=String(s.transport_mode||s.type||'').toLowerCase();
      return statusOk&&(state.mode==='all'||mode===state.mode)&&(!q||searchable.includes(q));
    });
    if(!rows.length)return '<div class="gc-cargo-empty"><strong>هیچ باری نەدۆزرایەوە</strong><span>فلتەرەکان بگۆڕە یان بارێکی نوێ زیاد بکە.</span></div>';
    return rows.map(s=>{
      const t=totalsFor(s), due=Math.max(0,Number(s.total_amount||0)-Number(s.paid_amount||0)), status=String(s.status||'pending');
      const content=t.rows.length?t.rows.map(x=>x.item_name).join('، '):(s.cargo_description||s.notes||'ناوەڕۆکی کاڵا تۆمار نەکراوە');
      return '<article class="gc-cargo-shipment-card">'+
        '<div class="gc-cargo-card-top"><div><span class="gc-cargo-code">'+esc(s.customer_gc_code||'GC —')+'</span><h3>'+esc(s.customer_name||'کڕیار')+'</h3><span class="gc-cargo-tracking">'+esc(s.tracking_id||s.tracking_number||'—')+'</span></div><span class="gc-cargo-status gc-cargo-status-'+esc(status)+'">'+esc(STATUS_LABEL[status]||status)+'</span></div>'+
        '<div class="gc-cargo-route"><span>'+esc(s.origin||s.origin_key||'—')+'</span><b>←</b><span>'+esc(s.destination||s.dest_key||'—')+'</span><small>'+esc(MODE_LABEL[String(s.transport_mode||s.type||'').toLowerCase()]||s.transport_mode||s.type||'—')+'</small></div>'+
        '<div class="gc-cargo-metrics"><div><span>بۆکس</span><b>'+num(t.boxes)+'</b></div><div><span>PC</span><b>'+num(t.pcs)+'</b></div><div><span>کێش</span><b>'+num(t.kg)+' kg</b></div><div><span>بارەکان</span><b>'+num(t.rows.length||Number(s.items_count||0))+'</b></div></div>'+
        '<div class="gc-cargo-content"><span>ناوەڕۆک</span><b>'+esc(content)+'</b></div>'+
        '<div class="gc-cargo-card-bottom"><span>نێردراو: <b>'+esc(fmtDate(s.dispatched_at||(s.step_dates&&s.step_dates.departed)))+'</b></span><span>ماوە: <b>'+esc(money(due,s.currency||'USD'))+'</b></span></div>'+
        '<div class="gc-cargo-actions"><button type="button" class="gc-cargo-btn gc-cargo-btn-quiet" data-cargo-view="'+esc(s.id)+'">وردەکاری</button><button type="button" class="gc-cargo-btn gc-cargo-btn-primary" data-cargo-edit="'+esc(s.id)+'">دەستکاری / کاڵا</button></div>'+
      '</article>';
    }).join('');
  }
  function render() {
    const el=view(); if(!el)return;
    const rows=state.shipments, visible=rows.filter(s=>SHIPPED.has(String(s.status||''))||Boolean(s.dispatched_at||(s.step_dates&&s.step_dates.departed)));
    const box=rows.reduce((a,s)=>a+totalsFor(s).boxes,0), pc=rows.reduce((a,s)=>a+totalsFor(s).pcs,0), kg=rows.reduce((a,s)=>a+totalsFor(s).kg,0);
    const outstanding=rows.reduce((a,s)=>{const c=String(s.currency||'USD').toUpperCase();if(!Object.prototype.hasOwnProperty.call(a,c))return a;a[c]+=Math.max(0,Number(s.total_amount||0)-Number(s.paid_amount||0));return a;},{USD:0,IQD:0,AED:0});
    const customerSet=new Set(rows.map(s=>String(s.customer_gc_code||s.directory_customer_id||'')).filter(Boolean));
    el.innerHTML='<section class="gc-cargo-page">'+
      '<div class="gc-cargo-hero"><div><span class="gc-cargo-kicker">GLOBALL CLOUD · CARGO CONTROL</span><h1>بار و کاڵا لە یەک شوێن</h1><p>داتای نوێ بە تۆماری ڕاستەقینە؛ کۆدی GC بۆ ناسینەوەی موشتەری و هەر بارێک tracking ID ـی خۆی هەیە.</p></div><div class="gc-cargo-hero-actions"><button class="gc-cargo-btn gc-cargo-btn-primary" type="button" id="gcCargoNew">+ بارێکی نوێ</button><button class="gc-cargo-btn gc-cargo-btn-quiet" type="button" id="gcCargoRefresh">↻ نوێکردنەوە</button></div></div>'+
      '<div class="gc-cargo-kpis"><div><span>کۆی بارەکان</span><b>'+num(rows.length)+'</b><small>لە داتابەیسی ڕاستەقینە</small></div><div><span>نێردراو / چالاک</span><b>'+num(visible.length)+'</b><small>Air · Land · Sea</small></div><div><span>کڕیاری جیاواز</span><b>'+num(customerSet.size)+'</b><small>بەپێی GC Code</small></div><div><span>بۆکس / PC</span><b>'+num(box)+' / '+num(pc)+'</b><small>کۆی کاڵای تۆمارکراو</small></div><div><span>کۆی کیلۆ</span><b>'+num(kg)+' kg</b><small>لە داتای بارەکان</small></div><div><span>پارەی ماوە (بەپێی دراو)</span><b>'+esc(money(outstanding.USD,'USD'))+'</b><small>IQD '+esc(money(outstanding.IQD,'IQD'))+' · AED '+esc(money(outstanding.AED,'AED'))+'</small></div></div>'+
      '<div class="gc-cargo-filterbar"><label class="gc-cargo-search"><span>گەڕان</span><input id="gcCargoSearch" type="search" autocomplete="off" placeholder="GC Code، tracking، ناوی کڕیار، کاڵا… " value="'+esc(state.search)+'"></label><label><span>جۆری گواستنەوە</span><select id="gcCargoMode"><option value="all">هەموو جۆرەکان</option><option value="air" '+(state.mode==='air'?'selected':'')+'>ئاسمانی / Air</option><option value="land" '+(state.mode==='land'?'selected':'')+'>وشکانی / Land</option><option value="sea" '+(state.mode==='sea'?'selected':'')+'>دەریایی / Sea</option></select></label><label><span>دۆخی بار</span><select id="gcCargoStatus"><option value="shipped" '+(state.filter==='shipped'?'selected':'')+'>نێردراوەکان</option><option value="all" '+(state.filter==='all'?'selected':'')+'>هەموو بارەکان</option>'+STATUS.map(s=>'<option value="'+s+'" '+(state.filter===s?'selected':'')+'>'+esc(STATUS_LABEL[s])+'</option>').join('')+'</select></label><span class="gc-cargo-result-count">'+num(rows.length)+' بار بارکراوە</span></div>'+
      '<div id="gcCargoList" class="gc-cargo-list">'+(state.loading?'<div class="gc-cargo-empty">داتا بار دەکرێت…</div>':listMarkup())+'</div>'+
      '<p class="gc-cargo-footnote">ژمارەی PC، بۆکس و کیلۆ تەنها لە تۆمارە نوێ/پشکنراوەکان کۆدەکرێتەوە؛ Excel ـە کۆنەکان بە خۆکار ناچنە ناو هەژماری بارە نوێکان.</p>'+
      '</section>';
    const search=document.getElementById('gcCargoSearch'); if(search)search.addEventListener('input',()=>{state.search=search.value;const list=document.getElementById('gcCargoList');if(list)list.innerHTML=listMarkup();});
    const mode=document.getElementById('gcCargoMode');if(mode)mode.addEventListener('change',()=>{state.mode=mode.value;const list=document.getElementById('gcCargoList');if(list)list.innerHTML=listMarkup();});
    const stat=document.getElementById('gcCargoStatus');if(stat)stat.addEventListener('change',()=>{state.filter=stat.value;const list=document.getElementById('gcCargoList');if(list)list.innerHTML=listMarkup();});
    document.getElementById('gcCargoNew')?.addEventListener('click',()=>openEditor(null));
    document.getElementById('gcCargoRefresh')?.addEventListener('click',()=>loadData(true));
    el.onclick=function(e){
      const ed=e.target.closest('[data-cargo-edit]');if(ed)openEditor(ed.getAttribute('data-cargo-edit'));
      const de=e.target.closest('[data-cargo-view]');if(de)openDetail(de.getAttribute('data-cargo-view'));
    };
  }
  async function loadData(showNotice=false) {
    const c=client(); if(!c){notify('پەیوەندی Supabase بەردەست نییە.',true);return;}
    state.client=c;state.loading=true;
    const el=view();if(el)render();
    try {
      const result=await c.from('shipments').select('id,tracking_id,tracking_number,customer_gc_code,directory_customer_id,customer_user_id,customer_name,customer_phone,origin,destination,origin_key,dest_key,route,type,transport_mode,status,operational_status,box_count,pc_count,carton_count,items_count,weight_kg,actual_weight_kg,chargeable_weight_kg,total_amount,paid_amount,currency,cargo_description,notes,dispatched_at,step_dates,created_at,updated_at,current_location_label,batch_code,branch,priority,archived_at').is('archived_at',null).order('created_at',{ascending:false}).limit(1000);
      if(result.error)throw result.error;
      state.shipments=result.data||[];
      const cr=await c.from('customer_directory').select('id,code,gc_code,normalized_gc_code,name,phone,city,is_active,customer_status').eq('is_active',true).order('name').limit(2000);
      if(cr.error)throw cr.error;
      state.customers=cr.data||[];
      const ids=state.shipments.map(s=>s.id).filter(Boolean);
      if(ids.length){
        const ir=await c.from('shipment_cargo_items').select('id,shipment_id,customer_directory_id,customer_gc_code,item_name,quantity_pc,box_count,weight_kg,declared_value,currency,item_status,notes,created_at,updated_at').in('shipment_id',ids);
        if(ir.error)throw ir.error;
        state.cargo=ir.data||[];
      }else state.cargo=[];
      if(showNotice)notify('داتای بار و کاڵا نوێکرایەوە.');
    } catch(e) {
      state.loading=false;render();
      const msg=e&&e.message?e.message:String(e);
      const target=document.getElementById('gcCargoList');
      if(target)target.innerHTML='<div class="gc-cargo-error"><b>نەتوانرا داتا باربکرێت</b><span>'+esc(msg)+'</span><button class="gc-cargo-btn gc-cargo-btn-quiet" id="gcCargoRetry">دووبارە هەوڵ بدە</button></div>';
      document.getElementById('gcCargoRetry')?.addEventListener('click',()=>loadData(true));
      return;
    }
    state.loading=false;render();
  }
  function modal(title,content,footer) {
    document.getElementById('gcCargoModal')?.remove();
    const root=document.createElement('div');root.id='gcCargoModal';root.className='gc-cargo-modal-backdrop';
    root.innerHTML='<section class="gc-cargo-modal" role="dialog" aria-modal="true" aria-labelledby="gcCargoModalTitle"><header><div><small>GLOBALL CLOUD · CARGO RECORD</small><h2 id="gcCargoModalTitle">'+esc(title)+'</h2></div><button type="button" class="gc-cargo-close" data-cargo-close aria-label="داخستن">×</button></header><div class="gc-cargo-modal-body">'+content+'</div><footer>'+(footer||'')+'</footer></section>';
    document.body.appendChild(root);
    root.addEventListener('click',e=>{if(e.target===root||e.target.closest('[data-cargo-close]'))root.remove();});
    return root;
  }
  function itemRow(row={},index=0) {
    return '<div class="gc-cargo-line" data-cargo-line><div class="gc-cargo-line-head"><b>کاڵا <span data-line-no>'+(index+1)+'</span></b><button type="button" class="gc-cargo-remove" data-cargo-remove-line>لابردن</button></div>'+
      '<label class="gc-cargo-line-name"><span>ناوی کاڵا</span><input data-field="item_name" maxlength="200" required placeholder="بۆ نموونە: پارچە، پۆشاک، ئەلیکترۆنیات" value="'+esc(row.item_name||'')+'"></label>'+
      '<div class="gc-cargo-line-grid"><label><span>ژمارەی PC</span><input data-field="quantity_pc" type="number" min="0" step="1" value="'+esc(row.quantity_pc==null?0:row.quantity_pc)+'"></label><label><span>ژمارەی بۆکس</span><input data-field="box_count" type="number" min="0" step="1" value="'+esc(row.box_count==null?0:row.box_count)+'"></label><label><span>کێش (kg)</span><input data-field="weight_kg" type="number" min="0" step="0.001" value="'+esc(row.weight_kg==null?0:row.weight_kg)+'"></label><label><span>بەهای کاڵا</span><input data-field="declared_value" type="number" min="0" step="0.01" value="'+esc(row.declared_value==null?0:row.declared_value)+'"></label></div>'+
      '<label><span>تێبینی (ئارەزوومەندانە)</span><input data-field="notes" maxlength="500" value="'+esc(row.notes||'')+'" placeholder="ناسنامە، ڕەنگ، جۆر…"></label></div>';
  }
  function openEditor(id) {
    const existing=id?state.shipments.find(s=>String(s.id)===String(id)):null;
    const oldItems=id?state.cargo.filter(x=>String(x.shipment_id)===String(id)).map(x=>({...x})):[];
    if(existing&&!oldItems.length)oldItems.push({item_name:existing.cargo_description||existing.notes||'',quantity_pc:Number(existing.pc_count??existing.items_count??0),box_count:Number(existing.box_count??existing.carton_count??0),weight_kg:Number(existing.actual_weight_kg??existing.weight_kg??0),declared_value:0,notes:''});
    if(!oldItems.length)oldItems.push({item_name:'',quantity_pc:0,box_count:0,weight_kg:0,declared_value:0,notes:''});
    const currentCode=existing?(existing.customer_gc_code||''):'';
    const mode=existing?(existing.transport_mode||existing.type||'air'):'air';
    const status=existing?(existing.status||'received_origin'):'received_origin';
    const origin=existing?(existing.origin||existing.origin_key||'China'):'China';
    const destination=existing?(existing.destination||existing.dest_key||'Erbil'):'Erbil';
    const curr=existing?(existing.currency||'USD'):'USD';
    const customer=state.customers.find(c=>codeOf(c)===codeOf({gc_code:currentCode}));
    const isAdmin=['admin','super_admin'].includes(String(state.identity?.role||window.gcStaffIdentity?.role||''));
    const options=(values,current)=>values.map(v=>'<option value="'+esc(v[0])+'" '+(String(v[0]).toLowerCase()===String(current).toLowerCase()?'selected':'')+'>'+esc(v[1])+'</option>').join('');
    const countries=[['China','چین / China'],['Dubai','دوبەی / Dubai'],['USA','ئەمریکا / USA'],['Erbil','هەولێر / Erbil']];
    const content='<form id="gcCargoForm" class="gc-cargo-form">'+
      '<div class="gc-cargo-section-title"><b>١. ناسنامەی بار و کڕیار</b><span>GC Code کڕیارەکە دیاری دەکات</span></div>'+
      '<div class="gc-cargo-form-grid"><label class="gc-cargo-span-2"><span>کۆدی کڕیار (GC Code) *</span><input id="gcCargoCustomerCode" list="gcCargoCustomers" name="customer_gc_code" required maxlength="40" value="'+esc(currentCode)+'" placeholder="GC-159 یان کۆدی کڕیاری چالاک"><datalist id="gcCargoCustomers">'+state.customers.map(c=>'<option value="'+esc(codeOf(c))+'">'+esc(c.name||'')+'</option>').join('')+'</datalist><small id="gcCargoCustomerHint">'+(customer?('کڕیار: '+esc(customer.name||'')+(customer.phone?' · '+esc(customer.phone):'')):'کۆدەکە هەڵبژێرە بۆ پشتڕاستکردنەوەی کڕیار')+'</small></label>'+
      '<label><span>جۆری گواستنەوە *</span><select name="transport_mode">'+options([['air','ئاسمانی / Air'],['land','وشکانی / Land'],['sea','دەریایی / Sea']],mode)+'</select></label>'+
      '<label><span>دۆخی بار *</span><select name="status">'+options(STATUS.map(s=>[s,STATUS_LABEL[s]]),status)+'</select></label>'+
      '<label><span>بنکەی سەرچاوە *</span><select name="origin">'+options(countries,origin)+'</select></label>'+
      '<label><span>شوێنی کۆتایی *</span><select name="destination">'+options(countries,destination)+'</select></label>'+
      (isAdmin?'<label><span>لق / Branch</span><select name="branch">'+options([['all','هەموو'],['china','China'],['dubai','Dubai'],['uae','UAE'],['erbil','Erbil']],existing?existing.branch||'all':'all')+'</select></label>':'')+
      '<label><span>بەرواری ناردن</span><input name="dispatched_at" type="datetime-local" value="'+esc(localInputDate(existing&&(existing.dispatched_at||(existing.step_dates&&existing.step_dates.departed))))+'"></label>'+
      '<label><span>دراو</span><select name="currency">'+options([['USD','USD · دۆلار'],['IQD','IQD · دینار'],['AED','AED · درهەم']],curr)+'</select></label></div>'+
      '<div class="gc-cargo-section-title"><b>٢. وردەکاری کاڵاکان</b><span>هەر جۆر کاڵایەک لە ڕیزێکی جیاواز</span></div>'+
      '<div id="gcCargoLines">'+oldItems.map((r,i)=>itemRow(r,i)).join('')+'</div><button type="button" id="gcCargoAddLine" class="gc-cargo-btn gc-cargo-btn-quiet gc-cargo-add-line">+ زیادکردنی ڕیزی کاڵا</button>'+
      '<div class="gc-cargo-totals" id="gcCargoLiveTotals"></div>'+
      '<div class="gc-cargo-section-title"><b>٣. پارە و بەڕێوەبردن</b><span>تەنها ژمارەی پشتڕاستکراو بنووسە</span></div>'+
      '<div class="gc-cargo-form-grid"><label><span>کۆی نرخی کڕیار</span><input name="total_amount" type="number" min="0" step="0.01" value="'+esc(existing?existing.total_amount:0)+'"></label><label><span>کۆی پارەی وەرگیراو</span><input name="paid_amount" type="number" min="0" step="0.01" value="'+esc(existing?existing.paid_amount:0)+'"></label><label><span>تێچووی بار</span><input name="cost_amount" type="number" min="0" step="0.01" value="'+esc(existing?existing.cargo_cost:0)+'"></label><label><span>شوێنی ئێستای بار</span><input name="current_location_label" maxlength="160" value="'+esc(existing?existing.current_location_label||existing.origin||'':'China')+'"></label><label><span>کۆدی گروپی بار (Batch)</span><input name="batch_code" maxlength="80" value="'+esc(existing?existing.batch_code||'':'')+'" placeholder="GC-AIR-2026-001"></label><label class="gc-cargo-span-2"><span>تێبینی</span><textarea name="notes" maxlength="2000" rows="2" placeholder="زانیاری زیادە بۆ ستاف">'+esc(existing?existing.notes||'':'')+'</textarea></label></div>'+
      '<p class="gc-cargo-form-note">لە پاش پاشەکەوتکردن، ژمارەی tracking، کۆی بۆکس/PC/کیلۆ و audit log لە داتابەیسی ڕاستەقینەدا تۆمار دەکرێن. هەر بارێک tracking ID ـی تایبەتی خۆی دەبێت.</p>'+
      '</form>';
    const m=modal(existing?'دەستکاری بار و ناوەڕۆک':'تۆمارکردنی باری نوێ',content,'<button type="button" class="gc-cargo-btn gc-cargo-btn-quiet" data-cargo-close>پاشگەزبوونەوە</button><button type="submit" form="gcCargoForm" id="gcCargoSave" class="gc-cargo-btn gc-cargo-btn-primary">پاشەکەوتکردن</button>');
    const form=m.querySelector('#gcCargoForm');
    const lines=m.querySelector('#gcCargoLines');
    const updateNumbers=()=>{
      const arr=readLines(false),t=calcSummary(arr),box=m.querySelector('#gcCargoLiveTotals');
      if(box)box.innerHTML='<div><span>بۆکس</span><b>'+num(t.boxes)+'</b></div><div><span>PC</span><b>'+num(t.pcs)+'</b></div><div><span>کۆی کیلۆ</span><b>'+num(t.kg)+' kg</b></div><div><span>ڕیزی کاڵا</span><b>'+num(arr.length)+'</b></div>';
      lines.querySelectorAll('[data-line-no]').forEach((n,i)=>n.textContent=String(i+1));
    };
    function readLines(validate=true){
      const arr=[...lines.querySelectorAll('[data-cargo-line]')].map(row=>{
        const get=k=>row.querySelector('[data-field="'+k+'"]')?.value??'';
        return {item_name:String(get('item_name')).trim(),quantity_pc:Number(get('quantity_pc')||0),box_count:Number(get('box_count')||0),weight_kg:Number(get('weight_kg')||0),declared_value:Number(get('declared_value')||0),notes:String(get('notes')).trim()};
      });
      if(validate&&(!arr.length||arr.some(x=>!x.item_name)))throw new Error('ناوی هەموو ڕیزەکانی کاڵا پڕ بکەرەوە.');
      for(const x of arr)if([x.quantity_pc,x.box_count,x.weight_kg,x.declared_value].some(v=>!Number.isFinite(v)||v<0))throw new Error('PC، بۆکس، کیلۆ و بەها نابێت نەرێنی بن.');
      if(arr.some(x=>!Number.isInteger(x.quantity_pc)||!Number.isInteger(x.box_count)))throw new Error('PC و بۆکس دەبێت ژمارەی تەواو بن.');
      return arr;
    }
    lines.addEventListener('input',updateNumbers);
    m.querySelector('#gcCargoAddLine').addEventListener('click',()=>{lines.insertAdjacentHTML('beforeend',itemRow({},lines.children.length));updateNumbers();});
    lines.addEventListener('click',e=>{const b=e.target.closest('[data-cargo-remove-line]');if(!b)return;const rows=lines.querySelectorAll('[data-cargo-line]');if(rows.length<=1){notify('دەبێت لانیکەم یەک ڕیزی کاڵا بمێنێتەوە.',true);return;}b.closest('[data-cargo-line]').remove();updateNumbers();});
    const codeInput=m.querySelector('#gcCargoCustomerCode');
    codeInput.addEventListener('input',()=>{const c=state.customers.find(x=>codeOf(x)===codeOf({gc_code:codeInput.value}));m.querySelector('#gcCargoCustomerHint').textContent=c?'کڕیار: '+(c.name||'')+(c.phone?' · '+c.phone:''):'ئەگەر کۆدەکە لە لیستی کڕیارانی چالاکدا نییە، پاشەکەوت ناکرێت.';});
    form.addEventListener('change',e=>{if(e.target.name==='status'){const di=form.elements.dispatched_at;if(e.target.value==='in_transit'&&di&&!di.value)di.value=localInputDate(new Date());}});
    updateNumbers();
    form.addEventListener('submit',async e=>{
      e.preventDefault();const save=m.querySelector('#gcCargoSave');if(save.disabled)return;
      try{
        const code=codeOf({gc_code:codeInput.value}),customer=state.customers.find(x=>codeOf(x)===code);
        if(!customer)throw new Error('کۆدی کڕیار لە لیستی کڕیارانی چالاکدا نەدۆزرایەوە. GC Code ـەکە پشکنە.');
        const rows=readLines(true),fd=new FormData(form);
        const total=Number(fd.get('total_amount')||0),paid=Number(fd.get('paid_amount')||0),cost=Number(fd.get('cost_amount')||0);
        if(![total,paid,cost].every(v=>Number.isFinite(v)&&v>=0))throw new Error('ژمارەی پارە نابێت نەرێنی بێت.');
        if(paid>total)throw new Error('پارەی وەرگیراو ناتوانێت لە کۆی نرخ زیاتر بێت.');
        const dispatched=String(fd.get('dispatched_at')||'');
        const payload={
          customer_gc_code:code,transport_mode:String(fd.get('transport_mode')),origin:String(fd.get('origin')),destination:String(fd.get('destination')),
          status:String(fd.get('status')),dispatched_at:dispatched?new Date(dispatched).toISOString():null,
          currency:String(fd.get('currency')),total_amount:total,paid_amount:paid,cost_amount:cost,
          notes:String(fd.get('notes')||'').trim(),current_location_label:String(fd.get('current_location_label')||'').trim(),
          batch_code:String(fd.get('batch_code')||'').trim()||null,
          cargo_description:rows.map(x=>x.item_name).join(', ')
        };
        save.disabled=true;save.textContent='پاشەکەوت دەکرێت…';
        const response=await client().rpc('staff_save_shipment_workspace',{p_shipment_id:existing?existing.id:null,p_payload:payload,p_items:rows});
        if(response.error)throw response.error;
        if(!response.data||!response.data.ok)throw new Error('داتابەیس پاشەکەوتکردن پشتڕاستی نەکردەوە.');
        m.remove();notify((response.data.created?'باری نوێ':'بار')+' پاشەکەوت کرا · '+response.data.tracking_id);
        await loadData(false);
      }catch(err){notify(err&&err.message?err.message:String(err),true);save.disabled=false;save.textContent='پاشەکەوتکردن';}
    });
  }
  function openDetail(id) {
    const s=state.shipments.find(x=>String(x.id)===String(id));if(!s)return;
    const t=totalsFor(s),items=t.rows;
    const itemHTML=items.length?items.map(x=>'<tr><td>'+esc(x.item_name)+'</td><td>'+num(x.box_count)+'</td><td>'+num(x.quantity_pc)+'</td><td>'+num(x.weight_kg)+' kg</td><td>'+esc(money(x.declared_value,x.currency||s.currency||'USD'))+'</td></tr>').join(''):'<tr><td colspan="5">کاڵای ورد پێشتر تۆمار نەکراوە؛ دەستکاری بکە بۆ زیادکردنی وردەکاری.</td></tr>';
    const body='<div class="gc-cargo-detail-grid"><div><span>GC Code</span><b>'+esc(s.customer_gc_code||'—')+'</b></div><div><span>Tracking</span><b>'+esc(s.tracking_id||s.tracking_number||'—')+'</b></div><div><span>کڕیار</span><b>'+esc(s.customer_name||'—')+'</b></div><div><span>جۆری بار</span><b>'+esc(MODE_LABEL[s.transport_mode||s.type]||s.transport_mode||s.type||'—')+'</b></div><div><span>ڕێڕەو</span><b>'+esc((s.origin||s.origin_key||'—')+' → '+(s.destination||s.dest_key||'—'))+'</b></div><div><span>دۆخ</span><b>'+esc(STATUS_LABEL[s.status]||s.status||'—')+'</b></div><div><span>بەرواری ناردن</span><b>'+esc(fmtDate(s.dispatched_at||(s.step_dates&&s.step_dates.departed)))+'</b></div><div><span>شوێنی ئێستا</span><b>'+esc(s.current_location_label||'—')+'</b></div><div><span>بۆکس / PC / kg</span><b>'+num(t.boxes)+' / '+num(t.pcs)+' / '+num(t.kg)+' kg</b></div><div><span>پارەی ماوە</span><b>'+esc(money(Math.max(0,Number(s.total_amount||0)-Number(s.paid_amount||0)),s.currency||'USD'))+'</b></div></div>'+
      '<div class="gc-cargo-detail-table-wrap"><table class="gc-cargo-detail-table"><thead><tr><th>کاڵا</th><th>بۆکس</th><th>PC</th><th>کێش</th><th>بەها</th></tr></thead><tbody>'+itemHTML+'</tbody></table></div>'+
      '<p class="gc-cargo-form-note">'+esc(s.notes||'تێبینی نییە')+'</p>';
    const m=modal('وردەکاری بار · '+(s.tracking_id||''),body,'<button type="button" class="gc-cargo-btn gc-cargo-btn-quiet" data-cargo-close>داخستن</button><button type="button" id="gcCargoDetailEdit" class="gc-cargo-btn gc-cargo-btn-primary">دەستکاری بار</button>');
    m.querySelector('#gcCargoDetailEdit').addEventListener('click',()=>{m.remove();openEditor(id);});
  }
  function attach() {
    const root=activeRoot();if(!root)return;
    injectNav();
    if(!document.querySelector('[data-cargo-cmd-nav]')||!client())return;
  }
  document.addEventListener('click',function(e){
    const own=e.target.closest('[data-cargo-cmd-nav]');
    if(own){
      e.preventDefault();e.stopImmediatePropagation();state.active=true;
      if(!mount()){notify('کۆنسۆڵی ستاف هێشتا ئامادە نییە؛ نوێکردنەوە بکە.',true);return;}
      deactiveOtherTabs();setTitle();loadData(false);return;
    }
    const other=e.target.closest('.gc-side .nav-btn[data-tab]');
    if(other&&state.active&&other.getAttribute('data-tab')!==TAB){state.active=false;document.querySelectorAll('[data-cargo-cmd-nav]').forEach(x=>x.classList.remove('active'));}
  },true);
  function boot(){
    if(!activeRoot())return;
    attach();
    const observer=new MutationObserver(()=>{attach();});
    observer.observe(document.body,{childList:true,subtree:true});
    if(!window.__gcCargoRefreshInstalled){
      window.__gcCargoRefreshInstalled=true;
      window.addEventListener('focus',()=>{if(state.active&&mount())loadData(false);});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();